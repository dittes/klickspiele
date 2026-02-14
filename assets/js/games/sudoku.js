import { announce, vibrate } from "../core/ui.js";

const BASE = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [4, 5, 6, 7, 8, 9, 1, 2, 3],
  [7, 8, 9, 1, 2, 3, 4, 5, 6],
  [2, 3, 4, 5, 6, 7, 8, 9, 1],
  [5, 6, 7, 8, 9, 1, 2, 3, 4],
  [8, 9, 1, 2, 3, 4, 5, 6, 7],
  [3, 4, 5, 6, 7, 8, 9, 1, 2],
  [6, 7, 8, 9, 1, 2, 3, 4, 5],
  [9, 1, 2, 3, 4, 5, 6, 7, 8],
];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateSolved() {
  const rowBands = shuffle([0, 1, 2]);
  const colBands = shuffle([0, 1, 2]);
  const rowOrder = rowBands.flatMap((b) => shuffle([0, 1, 2]).map((n) => b * 3 + n));
  const colOrder = colBands.flatMap((b) => shuffle([0, 1, 2]).map((n) => b * 3 + n));
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  return rowOrder.map((r) => colOrder.map((c) => nums[BASE[r][c] - 1]));
}

function createPuzzle(solved, difficulty) {
  const holes = { leicht: 35, mittel: 45, schwer: 52 }[difficulty] || 45;
  const puzzle = solved.map((row) => row.slice());
  let removed = 0;
  while (removed < holes) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      removed += 1;
    }
  }
  return puzzle;
}

function valid(grid, r, c, n) {
  for (let i = 0; i < 9; i += 1) {
    if (i !== c && grid[r][i] === n) return false;
    if (i !== r && grid[i][c] === n) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr += 1) {
    for (let cc = bc; cc < bc + 3; cc += 1) {
      if ((rr !== r || cc !== c) && grid[rr][cc] === n) return false;
    }
  }
  return true;
}

export function initSudoku(ctx) {
  const controls = document.createElement("div");
  controls.className = "d-flex gap-2 flex-wrap mb-3 align-items-center";
  controls.innerHTML = `
    <label for="sudoku-level" class="form-label mb-0">Stufe</label>
    <select id="sudoku-level" class="form-select form-select-sm w-auto" aria-label="Schwierigkeitsgrad wählen">
      <option value="leicht">Leicht</option>
      <option value="mittel" selected>Mittel</option>
      <option value="schwer">Schwer</option>
    </select>
    <button type="button" class="btn btn-outline-secondary btn-sm" id="toggle-notes" aria-pressed="false">Notizen aus</button>
  `;
  const board = document.createElement("div");
  board.className = "sudoku-grid";
  board.setAttribute("role", "grid");
  ctx.mount.innerHTML = "";
  ctx.mount.append(controls, board);

  let solved = [];
  let puzzle = [];
  let state = [];
  let history = [];
  let notesMode = false;
  let notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));

  function draw() {
    board.innerHTML = "";
    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        const fixed = puzzle[r][c] !== 0;
        const value = state[r][c] === 0 ? "" : String(state[r][c]);
        const cell = document.createElement("label");
        cell.className = `sudoku-cell ${fixed ? "fixed" : ""}`;
        cell.setAttribute("aria-label", `Feld ${r + 1}-${c + 1}`);
        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = "numeric";
        input.maxLength = 1;
        input.value = value;
        input.disabled = fixed;
        input.setAttribute("aria-label", `Wert für Zeile ${r + 1}, Spalte ${c + 1}`);
        if (!fixed && value && !valid(state, r, c, Number(value))) {
          input.classList.add("invalid");
        }
        input.addEventListener("input", () => {
          const v = Number(input.value.replace(/[^1-9]/g, "")) || 0;
          history.push(state.map((row) => row.slice()));
          if (notesMode && v) {
            const bag = notes[r][c];
            if (bag.has(v)) bag.delete(v); else bag.add(v);
            input.value = "";
            cell.dataset.notes = [...bag].sort().join(" ");
          } else {
            state[r][c] = v;
            notes[r][c].clear();
            draw();
            checkWin();
          }
        });
        const noteText = [...notes[r][c]].sort().join(" ");
        if (noteText) cell.dataset.notes = noteText;
        cell.appendChild(input);
        board.appendChild(cell);
      }
    }
  }

  function checkWin() {
    const won = state.every((row, r) => row.every((v, c) => v === solved[r][c]));
    if (won) {
      vibrate(40);
      announce("Sudoku gelöst.");
    }
  }

  function newGame() {
    const diff = controls.querySelector("#sudoku-level").value;
    solved = generateSolved();
    puzzle = createPuzzle(solved, diff);
    state = puzzle.map((row) => row.slice());
    notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
    history = [];
    draw();
    announce(`Neues Sudoku gestartet: ${diff}.`);
  }

  controls.querySelector("#toggle-notes").addEventListener("click", (e) => {
    notesMode = !notesMode;
    e.currentTarget.textContent = notesMode ? "Notizen an" : "Notizen aus";
    e.currentTarget.setAttribute("aria-pressed", String(notesMode));
  });

  ctx.on("newGame", newGame);
  ctx.on("undo", () => {
    if (history.length) {
      state = history.pop();
      draw();
      announce("Zug rückgängig.");
    }
  });
  ctx.on("hint", () => {
    const empty = [];
    for (let r = 0; r < 9; r += 1) for (let c = 0; c < 9; c += 1) if (state[r][c] === 0) empty.push([r, c]);
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    state[r][c] = solved[r][c];
    draw();
    announce("Ein Feld wurde aufgedeckt.");
  });
  ctx.on("settings", () => controls.querySelector("#sudoku-level").focus());

  newGame();
}
