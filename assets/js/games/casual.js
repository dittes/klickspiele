import { announce } from "../core/ui.js";
import { getDailyIndex } from "../core/game-data.js";

const wordleWords = ["LOGIK", "RATEN", "DENKE", "SPIEL", "WORTE", "RASEL"];
const anagrams = ["KREUZ", "SUDOKU", "LOGIK", "RAETSEL"];
const cryptos = [
  { plain: "LOGIK MACHT SPASS", map: { A: "Q", C: "R", G: "M", H: "L", I: "T", K: "V", L: "X", M: "P", O: "Z", P: "N", S: "B", T: "D" } },
  { plain: "DENKEN IST TRAINING", map: { A: "K", D: "R", E: "J", G: "M", I: "C", K: "T", N: "P", R: "W", S: "F", T: "Q" } },
];

function mountSimple(ctx, html) {
  ctx.mount.innerHTML = html;
}

function initMastermind(ctx) {
  const colors = ["R", "G", "B", "Y", "P", "O"];
  const target = Array.from({ length: 4 }, () => colors[Math.floor(Math.random() * colors.length)]);
  mountSimple(
    ctx,
    `<p class="small">Code mit 4 Farben raten (R,G,B,Y,P,O).</p>
     <div class="input-group mb-2"><input id="mm-in" class="form-control" maxlength="4" placeholder="z. B. RGBY" />
     <button class="btn btn-outline-primary" id="mm-check">Prüfen</button></div>
     <div id="mm-log" class="small"></div>`
  );
  const log = ctx.mount.querySelector("#mm-log");
  ctx.mount.querySelector("#mm-check").addEventListener("click", () => {
    const guess = ctx.mount.querySelector("#mm-in").value.toUpperCase().slice(0, 4).split("");
    if (guess.length < 4) return;
    const correctPos = guess.filter((g, i) => g === target[i]).length;
    const correctColor = guess.filter((g) => target.includes(g)).length - correctPos;
    log.insertAdjacentHTML("afterbegin", `<p>${guess.join("")} → ${correctPos} richtig, ${correctColor} Farbe</p>`);
    if (correctPos === 4) announce("Code geknackt.");
  });
}

function initWordle(ctx) {
  const target = wordleWords[getDailyIndex(wordleWords.length)];
  let tries = 0;
  mountSimple(
    ctx,
    `<p class="small">Rate das Tageswort in 6 Versuchen (5 Buchstaben).</p>
     <div class="input-group mb-2"><input id="wd-in" class="form-control" maxlength="5" />
     <button class="btn btn-outline-primary" id="wd-check">Senden</button></div>
     <div id="wd-log" class="small"></div>`
  );
  const log = ctx.mount.querySelector("#wd-log");
  ctx.mount.querySelector("#wd-check").addEventListener("click", () => {
    const g = ctx.mount.querySelector("#wd-in").value.toUpperCase().replace(/[^A-ZÄÖÜ]/g, "");
    if (g.length !== 5 || tries >= 6) return;
    tries += 1;
    let out = "";
    [...g].forEach((ch, i) => {
      if (target[i] === ch) out += `🟩${ch}`;
      else if (target.includes(ch)) out += `🟨${ch}`;
      else out += `⬜${ch}`;
    });
    log.insertAdjacentHTML("afterbegin", `<p>${out}</p>`);
    if (g === target) announce("Tageswort gefunden.");
    if (tries === 6 && g !== target) announce(`Nicht gelöst. Lösung: ${target}.`);
  });
}

function initAnagram(ctx) {
  const word = anagrams[getDailyIndex(anagrams.length)];
  const mixed = word.split("").sort(() => Math.random() - 0.5).join("");
  mountSimple(
    ctx,
    `<p class="small">Bilde aus den Buchstaben ein gültiges Wort: <strong>${mixed}</strong></p>
     <div class="input-group"><input id="ana" class="form-control" />
     <button id="ana-check" class="btn btn-outline-primary">Prüfen</button></div>`
  );
  ctx.mount.querySelector("#ana-check").addEventListener("click", () => {
    const v = ctx.mount.querySelector("#ana").value.toUpperCase();
    announce(v === word ? "Korrekt." : "Noch nicht korrekt.");
  });
}

function init2048(ctx) {
  let grid = Array.from({ length: 4 }, () => Array(4).fill(0));
  mountSimple(ctx, `<p class="small">Mit Pfeiltasten oder Wischrichtung kombinieren.</p><div id="g2048" class="g2048"></div>`);
  const el = ctx.mount.querySelector("#g2048");

  function add() {
    const free = [];
    for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) if (!grid[r][c]) free.push([r, c]);
    if (!free.length) return;
    const [r, c] = free[Math.floor(Math.random() * free.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }
  function compress(row) {
    const arr = row.filter(Boolean);
    for (let i = 0; i < arr.length - 1; i += 1) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        arr[i + 1] = 0;
      }
    }
    const nonZero = arr.filter(Boolean);
    return nonZero.concat(Array(4 - nonZero.length).fill(0));
  }
  function move(dir) {
    let changed = false;
    if (dir === "left") {
      grid = grid.map((row) => {
        const n = compress(row);
        if (n.join() !== row.join()) changed = true;
        return n;
      });
    }
    if (dir === "right") {
      grid = grid.map((row) => {
        const n = compress([...row].reverse()).reverse();
        if (n.join() !== row.join()) changed = true;
        return n;
      });
    }
    if (dir === "up" || dir === "down") {
      const cols = Array.from({ length: 4 }, (_, c) => Array.from({ length: 4 }, (_, r) => grid[r][c]));
      const processed = cols.map((row) => (dir === "up" ? compress(row) : compress([...row].reverse()).reverse()));
      const next = Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) => processed[c][r]));
      if (JSON.stringify(next) !== JSON.stringify(grid)) changed = true;
      grid = next;
    }
    if (changed) add();
    draw();
  }
  function draw() {
    el.innerHTML = grid.flat().map((n) => `<div class="g2048-cell v${n}">${n || ""}</div>`).join("");
  }

  add();
  add();
  draw();
  window.addEventListener("keydown", (e) => {
    const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
    if (map[e.key]) move(map[e.key]);
  });
}

function initTenByTen(ctx) {
  const size = 10;
  let board = Array.from({ length: size }, () => Array(size).fill(0));
  const shapes = [
    [[1, 1, 1]],
    [[1], [1], [1]],
    [[1, 1], [1, 1]],
    [[1, 1, 0], [0, 1, 1]],
  ];
  let current = shapes[Math.floor(Math.random() * shapes.length)];
  mountSimple(ctx, `<p class="small">Tippe ein Feld, um die aktuelle Form links oben dort zu platzieren.</p><div id="ten" class="maze-grid"></div><p class="small" id="ten-shape"></p>`);
  const el = ctx.mount.querySelector("#ten");
  el.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

  function clearLines() {
    for (let r = 0; r < size; r += 1) if (board[r].every(Boolean)) board[r] = Array(size).fill(0);
    for (let c = 0; c < size; c += 1) {
      let full = true;
      for (let r = 0; r < size; r += 1) if (!board[r][c]) full = false;
      if (full) for (let r = 0; r < size; r += 1) board[r][c] = 0;
    }
  }

  function fits(r0, c0) {
    for (let r = 0; r < current.length; r += 1) {
      for (let c = 0; c < current[r].length; c += 1) {
        if (!current[r][c]) continue;
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr >= size || cc >= size || board[rr][cc]) return false;
      }
    }
    return true;
  }

  function place(r0, c0) {
    if (!fits(r0, c0)) return;
    for (let r = 0; r < current.length; r += 1) {
      for (let c = 0; c < current[r].length; c += 1) {
        if (current[r][c]) board[r0 + r][c0 + c] = 1;
      }
    }
    clearLines();
    current = shapes[Math.floor(Math.random() * shapes.length)];
    draw();
  }

  function draw() {
    el.innerHTML = "";
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "maze-cell";
        if (board[r][c]) btn.classList.add("player");
        btn.addEventListener("click", () => place(r, c));
        el.appendChild(btn);
      }
    }
    ctx.mount.querySelector("#ten-shape").textContent = `Aktuelle Form: ${current.length}x${current[0].length}`;
  }

  draw();
}

function initMemory(ctx) {
  const cards = Array.from({ length: 8 }, (_, i) => i + 1).flatMap((n) => [n, n]).sort(() => Math.random() - 0.5);
  let open = [];
  const solved = new Set();
  mountSimple(ctx, `<div id="mem" class="memory-grid"></div>`);
  const el = ctx.mount.querySelector("#mem");

  function draw() {
    el.innerHTML = "";
    cards.forEach((n, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "memory-card";
      b.textContent = solved.has(i) || open.includes(i) ? String(n) : "?";
      b.addEventListener("click", () => {
        if (solved.has(i) || open.includes(i) || open.length === 2) return;
        open.push(i);
        draw();
        if (open.length === 2) {
          const [a, bIdx] = open;
          if (cards[a] === cards[bIdx]) {
            solved.add(a);
            solved.add(bIdx);
            open = [];
            draw();
            if (solved.size === cards.length) announce("Alle Paare gefunden.");
          } else {
            setTimeout(() => {
              open = [];
              draw();
            }, 450);
          }
        }
      });
      el.appendChild(b);
    });
  }
  draw();
}

function initKryptogramm(ctx) {
  const entry = cryptos[getDailyIndex(cryptos.length)];
  const cipher = entry.plain
    .split("")
    .map((ch) => (entry.map[ch] ? entry.map[ch] : ch))
    .join("");
  mountSimple(
    ctx,
    `<p class="small">Entschlüssle den Satz durch Buchstabenersetzung.</p>
     <p class="p-2 border rounded">${cipher}</p>
     <div class="input-group"><input id="crypto-in" class="form-control" placeholder="Klartext" />
     <button class="btn btn-outline-primary" id="crypto-check">Prüfen</button></div>`
  );
  ctx.mount.querySelector("#crypto-check").addEventListener("click", () => {
    const v = ctx.mount.querySelector("#crypto-in").value.toUpperCase().trim();
    announce(v === entry.plain ? "Korrekt entschlüsselt." : "Noch nicht korrekt.");
  });
}

function initTangram(ctx) {
  const levels = ["Haus", "Katze", "Boot", "Pfeil"];
  const target = levels[getDailyIndex(levels.length)];
  let matches = 0;
  mountSimple(
    ctx,
    `<p class="small">Zielvorlage: <strong>${target}</strong>. Lege 7 Teile durch korrektes Zuordnen.</p>
     <div class="d-flex gap-2 flex-wrap" id="tangram-parts"></div>
     <button class="btn btn-outline-primary mt-2" id="tangram-place">Teil platzieren</button>
     <p class="small mt-2" id="tangram-status">Platziert: 0/7</p>`
  );
  const parts = ctx.mount.querySelector("#tangram-parts");
  ["S1", "S2", "M", "L1", "L2", "Q", "P"].forEach((p) => {
    parts.insertAdjacentHTML("beforeend", `<span class="badge text-bg-light">${p}</span>`);
  });
  ctx.mount.querySelector("#tangram-place").addEventListener("click", () => {
    matches += 1;
    ctx.mount.querySelector("#tangram-status").textContent = `Platziert: ${Math.min(matches, 7)}/7`;
    if (matches >= 7) announce("Tangram-Vorlage abgeschlossen.");
  });
}

function initSchiebepuzzle(ctx) {
  let cells = [...Array(15).keys()].map((n) => n + 1);
  cells.push(0);
  cells = cells.sort(() => Math.random() - 0.5);
  mountSimple(ctx, `<div id="slide" class="g2048" style="grid-template-columns:repeat(4,minmax(0,1fr));"></div><p class="small" id="slide-moves">Züge: 0</p>`);
  const el = ctx.mount.querySelector("#slide");
  let moves = 0;

  function canSwap(i, j) {
    const r1 = Math.floor(i / 4);
    const c1 = i % 4;
    const r2 = Math.floor(j / 4);
    const c2 = j % 4;
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  function draw() {
    el.innerHTML = "";
    cells.forEach((n, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "g2048-cell";
      b.textContent = n || "";
      b.addEventListener("click", () => {
        const z = cells.indexOf(0);
        if (!canSwap(i, z)) return;
        [cells[i], cells[z]] = [cells[z], cells[i]];
        moves += 1;
        ctx.mount.querySelector("#slide-moves").textContent = `Züge: ${moves}`;
        draw();
        const ok = cells.slice(0, 15).every((v, idx) => v === idx + 1);
        if (ok && cells[15] === 0) announce("Schiebepuzzle gelöst.");
      });
      el.appendChild(b);
    });
  }

  draw();
}

export function initCasual(ctx) {
  const map = {
    memory: initMemory,
    mastermind: initMastermind,
    "wort-des-tages": initWordle,
    anagramm: initAnagram,
    "2048": init2048,
    "10x10": initTenByTen,
    kryptogramm: initKryptogramm,
    tangram: initTangram,
    "schiebepuzzle-15": initSchiebepuzzle,
  };
  const fn = map[ctx.game.slug] || initMastermind;
  fn(ctx);
  ctx.on("newGame", () => window.location.reload());
  ctx.on("undo", () => announce("Rückgängig ist in diesem Spiel begrenzt."));
  ctx.on("hint", () => announce("Hinweis: Arbeite schrittweise und notiere Muster."));
  ctx.on("settings", () => announce("Einstellungen sind in dieser Version reduziert."));
}
