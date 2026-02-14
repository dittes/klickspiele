import { announce } from "../core/ui.js";
import { getDailyIndex } from "../core/game-data.js";

const puzzles = [
  {
    size: 7,
    blocks: ["0,2", "1,1", "1,3", "3,1", "3,3", "4,2"],
    across: [
      { row: 0, col: 0, clue: "Hauptstadt von Deutschland", answer: "BER" },
      { row: 2, col: 0, clue: "Logikspiel mit Zahlen (6)", answer: "SUDOKU" },
      { row: 4, col: 0, clue: "Gegenteil von Nacht", answer: "TAG" },
    ],
    down: [
      { row: 0, col: 0, clue: "Denkaufgabe", answer: "DENK" },
      { row: 0, col: 4, clue: "Online spielen im ...", answer: "WEB" },
      { row: 2, col: 2, clue: "Ja auf Englisch", answer: "YES" },
    ],
  },
  {
    size: 7,
    blocks: ["0,1", "0,3", "2,2", "4,1", "4,3"],
    across: [
      { row: 1, col: 0, clue: "Rätsel mit Buchstaben", answer: "WORT" },
      { row: 2, col: 0, clue: "Schwarzes Brettspiel", answer: "GO" },
      { row: 3, col: 0, clue: "Beliebtes Kartenspiel", answer: "SKAT" },
    ],
    down: [
      { row: 0, col: 0, clue: "Spiel im Browser", answer: "WEB" },
      { row: 1, col: 2, clue: "Kleine Pause", answer: "STOP" },
      { row: 0, col: 4, clue: "Logik plus Spaß", answer: "MIX" },
    ],
  },
];

function createSolutionMap(puzzle) {
  const map = new Map();
  puzzle.across.forEach((entry) => {
    [...entry.answer].forEach((ch, i) => {
      map.set(`${entry.row},${entry.col + i}`, ch);
    });
  });
  puzzle.down.forEach((entry) => {
    [...entry.answer].forEach((ch, i) => {
      map.set(`${entry.row + i},${entry.col}`, ch);
    });
  });
  return map;
}

export function initCrossword(ctx) {
  const puzzle = puzzles[getDailyIndex(puzzles.length)];
  const blockSet = new Set(puzzle.blocks);
  const solution = createSolutionMap(puzzle);

  ctx.mount.innerHTML = `
    <div class="row g-3">
      <div class="col-12 col-lg-6">
        <div class="crossword-grid" id="crossword-grid" role="grid" aria-label="Kreuzworträtsel Raster"></div>
      </div>
      <div class="col-12 col-lg-6">
        <h3 class="h5">Hinweise waagerecht</h3>
        <ol class="small">${puzzle.across.map((a) => `<li>${a.clue}</li>`).join("")}</ol>
        <h3 class="h5 mt-3">Hinweise senkrecht</h3>
        <ol class="small">${puzzle.down.map((d) => `<li>${d.clue}</li>`).join("")}</ol>
      </div>
    </div>
  `;

  const grid = ctx.mount.querySelector("#crossword-grid");
  grid.style.gridTemplateColumns = `repeat(${puzzle.size}, 1fr)`;
  const inputs = new Map();

  for (let r = 0; r < puzzle.size; r += 1) {
    for (let c = 0; c < puzzle.size; c += 1) {
      const key = `${r},${c}`;
      const cell = document.createElement("div");
      cell.className = `crossword-cell ${blockSet.has(key) ? "block" : ""}`;
      if (blockSet.has(key)) {
        grid.appendChild(cell);
        continue;
      }
      const input = document.createElement("input");
      input.maxLength = 1;
      input.type = "text";
      input.className = "crossword-input";
      input.setAttribute("aria-label", `Feld ${r + 1}-${c + 1}`);
      input.addEventListener("input", () => {
        input.value = input.value.toUpperCase().replace(/[^A-ZÄÖÜ]/g, "");
      });
      cell.appendChild(input);
      inputs.set(key, input);
      grid.appendChild(cell);
    }
  }

  function check() {
    let ok = true;
    solution.forEach((expected, key) => {
      const input = inputs.get(key);
      if (!input) return;
      if (input.value !== expected) ok = false;
    });
    announce(ok ? "Kreuzworträtsel vollständig gelöst." : "Noch nicht vollständig korrekt.");
  }

  ctx.on("newGame", () => window.location.reload());
  ctx.on("undo", () => {
    const focused = document.activeElement;
    if (focused && focused.classList.contains("crossword-input")) focused.value = "";
  });
  ctx.on("hint", () => {
    for (const [key, expected] of solution) {
      const input = inputs.get(key);
      if (input && !input.value) {
        input.value = expected;
        break;
      }
    }
  });
  ctx.on("settings", check);
}
