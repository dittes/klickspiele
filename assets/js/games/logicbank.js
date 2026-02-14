import { announce } from "../core/ui.js";
import { getDailyIndex } from "../core/game-data.js";

const basePuzzles = {
  kakuro: [
    { size: 3, fixed: [[0, 0, 1]], solution: [[1, 3, 2], [2, 1, 3], [3, 2, 1]], rule: "Jede Zeile und Spalte enthält 1-3 ohne Wiederholung." },
    { size: 3, fixed: [[1, 1, 2]], solution: [[3, 1, 2], [1, 2, 3], [2, 3, 1]], rule: "Nutze Summenlogik und teste Ausschlüsse." },
  ],
  "kenken-calcudoku": [
    { size: 4, fixed: [[0, 0, 1], [3, 3, 4]], solution: [[1, 2, 3, 4], [3, 4, 1, 2], [4, 1, 2, 3], [2, 3, 4, 1]], rule: "Jede Zeile/Spalte enthält 1-4 genau einmal." },
  ],
  nonogramm: [
    { size: 5, fixed: [], solution: [[1, 0, 1, 0, 1], [1, 1, 1, 1, 1], [0, 1, 1, 1, 0], [0, 1, 0, 1, 0], [1, 1, 0, 1, 1]], rule: "Setze 1 für gefüllt und 0 für leer." },
  ],
  futoshiki: [
    { size: 4, fixed: [[0, 1, 2]], solution: [[1, 2, 3, 4], [2, 3, 4, 1], [3, 4, 1, 2], [4, 1, 2, 3]], rule: "Achte auf aufsteigende Muster ohne Wiederholung." },
  ],
  "hashi-brueckenraetsel": [
    { size: 4, fixed: [[0, 0, 2], [3, 3, 2]], solution: [[2, 1, 2, 1], [1, 2, 1, 2], [2, 1, 2, 1], [1, 2, 1, 2]], rule: "Gib Brückenanzahl je Feld als Zahl ein." },
  ],
  slitherlink: [
    { size: 4, fixed: [[1, 1, 2]], solution: [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 1], [1, 0, 0, 1]], rule: "Einträge als Liniensegmente 0/1." },
  ],
  nurikabe: [
    { size: 5, fixed: [[0, 0, 1], [2, 2, 2]], solution: [[1, 0, 0, 1, 0], [0, 0, 1, 0, 0], [1, 0, 2, 0, 1], [0, 0, 1, 0, 0], [1, 0, 0, 1, 0]], rule: "Markiere Inseln/Wasser über 0/1/2 gemäß Hinweisstruktur." },
  ],
  hitori: [
    { size: 4, fixed: [[0, 0, 1]], solution: [[1, 3, 2, 4], [2, 4, 1, 3], [3, 1, 4, 2], [4, 2, 3, 1]], rule: "Markiere gültige Lösung durch korrekte Zahlen." },
  ],
  "light-up-akari": [
    { size: 5, fixed: [[1, 1, 2], [3, 3, 1]], solution: [[1, 0, 1, 0, 1], [0, 2, 0, 1, 0], [1, 0, 1, 0, 1], [0, 1, 0, 2, 0], [1, 0, 1, 0, 1]], rule: "Setze Lampen als 1 und Wände gemäß Vorgaben." },
  ],
  wolkenkratzer: [
    { size: 4, fixed: [[0, 0, 1]], solution: [[1, 2, 3, 4], [4, 3, 2, 1], [2, 1, 4, 3], [3, 4, 1, 2]], rule: "Trage Höhen 1-4 ein und prüfe Sichtlinien." },
  ],
  hidato: [
    { size: 5, fixed: [[0, 0, 1], [4, 4, 25]], solution: [[1, 2, 3, 4, 5], [10, 9, 8, 7, 6], [11, 12, 13, 14, 15], [20, 19, 18, 17, 16], [21, 22, 23, 24, 25]], rule: "Setze die Zahlenfolge lückenlos fort." },
  ],
  "einstein-raetsel-logikgitter": [
    { size: 5, fixed: [[0, 0, 1], [4, 4, 5]], solution: [[1, 2, 3, 4, 5], [2, 3, 4, 5, 1], [3, 4, 5, 1, 2], [4, 5, 1, 2, 3], [5, 1, 2, 3, 5]], rule: "Arbeite mit Ja/Nein-Logik als Zahlenraster-Proxy." },
  ],
};

function cellKey(r, c) {
  return `${r},${c}`;
}

export function initLogicBank(ctx) {
  const pool = basePuzzles[ctx.game.slug] || basePuzzles.kakuro;
  const puzzle = pool[getDailyIndex(pool.length)];
  const fixed = new Map(puzzle.fixed.map(([r, c, v]) => [cellKey(r, c), v]));
  let state = Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill(""));
  const history = [];

  ctx.mount.innerHTML = `
    <p class="small text-body-secondary">${puzzle.rule} Tagesrätsel rotiert lokal nach Datum.</p>
    <div class="logic-grid" id="logic-grid"></div>
  `;
  const grid = ctx.mount.querySelector("#logic-grid");
  grid.style.gridTemplateColumns = `repeat(${puzzle.size}, 1fr)`;

  function draw() {
    grid.innerHTML = "";
    for (let r = 0; r < puzzle.size; r += 1) {
      for (let c = 0; c < puzzle.size; c += 1) {
        const key = cellKey(r, c);
        const fixedVal = fixed.get(key);
        const input = document.createElement("input");
        input.className = "logic-cell";
        input.type = "text";
        input.inputMode = "numeric";
        input.maxLength = 2;
        input.value = fixedVal ?? state[r][c];
        input.disabled = fixedVal !== undefined;
        input.setAttribute("aria-label", `Feld ${r + 1}-${c + 1}`);
        input.addEventListener("input", () => {
          history.push(state.map((row) => row.slice()));
          state[r][c] = input.value.replace(/[^0-9]/g, "");
        });
        grid.appendChild(input);
      }
    }
  }

  function check() {
    for (let r = 0; r < puzzle.size; r += 1) {
      for (let c = 0; c < puzzle.size; c += 1) {
        const expected = puzzle.solution[r][c];
        const v = fixed.get(cellKey(r, c)) ?? Number(state[r][c]);
        if (v !== expected) {
          announce("Noch nicht korrekt gelöst.");
          return;
        }
      }
    }
    announce("Rätsel korrekt gelöst.");
  }

  ctx.on("newGame", () => window.location.reload());
  ctx.on("undo", () => {
    if (!history.length) return;
    state = history.pop();
    draw();
  });
  ctx.on("hint", () => {
    for (let r = 0; r < puzzle.size; r += 1) {
      for (let c = 0; c < puzzle.size; c += 1) {
        if (!fixed.has(cellKey(r, c)) && !state[r][c]) {
          state[r][c] = String(puzzle.solution[r][c]);
          draw();
          announce("Ein Hinweisfeld wurde eingetragen.");
          return;
        }
      }
    }
  });
  ctx.on("settings", check);

  draw();
}
