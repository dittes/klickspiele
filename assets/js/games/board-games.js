import { announce, vibrate } from "../core/ui.js";

function makeBoard(size, className = "board-grid") {
  const el = document.createElement("div");
  el.className = className;
  el.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  return el;
}

export function initConnect4(ctx) {
  let grid = Array.from({ length: 6 }, () => Array(7).fill(0));
  let player = 1;
  const root = makeBoard(7, "connect4-grid");
  ctx.mount.innerHTML = "";
  ctx.mount.appendChild(root);

  function win(r, c, p) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    return dirs.some(([dr, dc]) => {
      let count = 1;
      [[1, 1], [-1, -1]].forEach(([a, b]) => {
        let rr = r + dr * a;
        let cc = c + dc * b;
        while (grid[rr]?.[cc] === p) {
          count += 1;
          rr += dr * a;
          cc += dc * b;
        }
      });
      return count >= 4;
    });
  }

  function draw() {
    root.innerHTML = "";
    for (let r = 0; r < 6; r += 1) {
      for (let c = 0; c < 7; c += 1) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `disc d${grid[r][c]}`;
        btn.setAttribute("aria-label", `Spalte ${c + 1}`);
        btn.addEventListener("click", () => {
          let row = 5;
          while (row >= 0 && grid[row][c] !== 0) row -= 1;
          if (row < 0) return;
          grid[row][c] = player;
          if (win(row, c, player)) {
            announce(`Spieler ${player} gewinnt.`);
            vibrate(30);
          }
          player = player === 1 ? 2 : 1;
          draw();
        });
        root.appendChild(btn);
      }
    }
  }

  ctx.on("newGame", () => {
    grid = Array.from({ length: 6 }, () => Array(7).fill(0));
    player = 1;
    draw();
  });
  ctx.on("undo", () => announce("Rückgängig ist nicht aktiv."));
  ctx.on("hint", () => announce("Besetze die Mitte früh für mehr Optionen."));
  ctx.on("settings", () => announce("Lokaler 2-Spieler-Modus."));
  draw();
}

export function initReversi(ctx) {
  const size = 8;
  let board = Array.from({ length: size }, () => Array(size).fill(0));
  board[3][3] = board[4][4] = 2;
  board[3][4] = board[4][3] = 1;
  let player = 1;
  const root = makeBoard(size, "reversi-grid");
  ctx.mount.innerHTML = "";
  ctx.mount.appendChild(root);

  const dirs = [-1, 0, 1].flatMap((dr) => [-1, 0, 1].map((dc) => [dr, dc])).filter(([dr, dc]) => dr || dc);
  const inside = (r, c) => r >= 0 && r < size && c >= 0 && c < size;

  function flips(r, c, p) {
    if (board[r][c]) return [];
    const enemy = p === 1 ? 2 : 1;
    const out = [];
    dirs.forEach(([dr, dc]) => {
      const line = [];
      let rr = r + dr;
      let cc = c + dc;
      while (inside(rr, cc) && board[rr][cc] === enemy) {
        line.push([rr, cc]);
        rr += dr;
        cc += dc;
      }
      if (line.length && inside(rr, cc) && board[rr][cc] === p) out.push(...line);
    });
    return out;
  }

  function aiMove() {
    let best = null;
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        const f = flips(r, c, 2);
        if (f.length && (!best || f.length > best.f.length)) best = { r, c, f };
      }
    }
    if (best) {
      board[best.r][best.c] = 2;
      best.f.forEach(([r, c]) => {
        board[r][c] = 2;
      });
    }
  }

  function draw() {
    root.innerHTML = "";
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `rev-cell p${board[r][c]}`;
        btn.setAttribute("aria-label", `Feld ${r + 1}-${c + 1}`);
        btn.addEventListener("click", () => {
          const f = flips(r, c, 1);
          if (!f.length) return;
          board[r][c] = 1;
          f.forEach(([rr, cc]) => {
            board[rr][cc] = 1;
          });
          aiMove();
          draw();
        });
        root.appendChild(btn);
      }
    }
  }

  ctx.on("newGame", () => {
    board = Array.from({ length: size }, () => Array(size).fill(0));
    board[3][3] = board[4][4] = 2;
    board[3][4] = board[4][3] = 1;
    draw();
  });
  ctx.on("undo", () => announce("Rückgängig ist nicht verfügbar."));
  ctx.on("hint", () => announce("Tipp: Ecken sind besonders stark."));
  ctx.on("settings", () => announce("Du spielst gegen eine einfache KI."));
  draw();
}

export function initCheckers(ctx) {
  const size = 8;
  let board = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      if ((r + c) % 2 === 0) return 0;
      if (r < 3) return 2;
      if (r > 4) return 1;
      return 0;
    })
  );
  let player = 1;
  let selected = null;
  const root = makeBoard(size, "checker-grid");
  ctx.mount.innerHTML = "";
  ctx.mount.appendChild(root);

  function draw() {
    root.innerHTML = "";
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `checker-cell ${(r + c) % 2 ? "dark" : "light"}`;
        if (board[r][c]) btn.textContent = board[r][c] === 1 ? "●" : "○";
        if (selected && selected[0] === r && selected[1] === c) btn.classList.add("selected");
        btn.addEventListener("click", () => {
          if (board[r][c] === player) {
            selected = [r, c];
            draw();
            return;
          }
          if (!selected || board[r][c] !== 0) return;
          const [sr, sc] = selected;
          const dir = player === 1 ? -1 : 1;
          if (r === sr + dir && Math.abs(c - sc) === 1) {
            board[r][c] = player;
            board[sr][sc] = 0;
            selected = null;
            player = player === 1 ? 2 : 1;
            draw();
          }
        });
        root.appendChild(btn);
      }
    }
  }

  ctx.on("newGame", () => window.location.reload());
  ctx.on("undo", () => announce("Rückgängig ist nicht aktiv."));
  ctx.on("hint", () => announce("Tipp: Halte deine Steine zusammen und blockiere Diagonalen."));
  ctx.on("settings", () => announce("Lokaler 2-Spieler-Modus."));
  draw();
}

export function initChess(ctx) {
  const size = 8;
  let board = [
    ["t", "s", "l", "d", "k", "l", "s", "t"],
    ["b", "b", "b", "b", "b", "b", "b", "b"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["B", "B", "B", "B", "B", "B", "B", "B"],
    ["T", "S", "L", "D", "K", "L", "S", "T"],
  ];
  let whiteTurn = true;
  let selected = null;
  const root = makeBoard(size, "chess-grid");
  ctx.mount.innerHTML = "";
  ctx.mount.appendChild(root);

  function own(piece) {
    return whiteTurn ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
  }

  function draw() {
    root.innerHTML = "";
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        const piece = board[r][c];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `chess-cell ${(r + c) % 2 ? "dark" : "light"}`;
        const map = { K: "♔", D: "♕", T: "♖", L: "♗", S: "♘", B: "♙", k: "♚", d: "♛", t: "♜", l: "♝", s: "♞", b: "♟" };
        btn.textContent = map[piece] || "";
        if (selected && selected[0] === r && selected[1] === c) btn.classList.add("selected");
        btn.addEventListener("click", () => {
          if (piece && own(piece)) {
            selected = [r, c];
            draw();
            return;
          }
          if (!selected) return;
          const [sr, sc] = selected;
          board[r][c] = board[sr][sc];
          board[sr][sc] = "";
          selected = null;
          whiteTurn = !whiteTurn;
          draw();
        });
        root.appendChild(btn);
      }
    }
  }

  ctx.on("newGame", () => window.location.reload());
  ctx.on("undo", () => announce("Rückgängig nicht verfügbar."));
  ctx.on("hint", () => announce("Tipp: Kontrolliere die Mitte und entwickle Figuren früh."));
  ctx.on("settings", () => announce("Lokaler 2-Spieler-Modus ohne Schachprüfung."));
  draw();
}
