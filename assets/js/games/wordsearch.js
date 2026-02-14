import { announce } from "../core/ui.js";
import { getDailyIndex } from "../core/game-data.js";

const sets = [
  ["LOGIK", "DENKEN", "SUDOKU", "RASTER", "WORT"],
  ["MOBILE", "SPIEL", "HINWEIS", "PUZZLE", "REIHE"],
  ["BROWSER", "TASTATUR", "TOUCH", "SUCHE", "KOPF"],
];

function buildGrid(words, size = 10) {
  const grid = Array.from({ length: size }, () => Array(size).fill(""));
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [-1, 1],
  ];

  words.forEach((word) => {
    let placed = false;
    for (let attempt = 0; attempt < 120 && !placed; attempt += 1) {
      const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
      const x0 = Math.floor(Math.random() * size);
      const y0 = Math.floor(Math.random() * size);
      const x1 = x0 + dx * (word.length - 1);
      const y1 = y0 + dy * (word.length - 1);
      if (x1 < 0 || x1 >= size || y1 < 0 || y1 >= size) continue;
      let fits = true;
      for (let i = 0; i < word.length; i += 1) {
        const x = x0 + dx * i;
        const y = y0 + dy * i;
        if (grid[y][x] && grid[y][x] !== word[i]) fits = false;
      }
      if (!fits) continue;
      for (let i = 0; i < word.length; i += 1) {
        const x = x0 + dx * i;
        const y = y0 + dy * i;
        grid[y][x] = word[i];
      }
      placed = true;
    }
  });

  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!grid[y][x]) grid[y][x] = abc[Math.floor(Math.random() * abc.length)];
    }
  }
  return grid;
}

export function initWordsearch(ctx) {
  const words = sets[getDailyIndex(sets.length)];
  const grid = buildGrid(words);
  const found = new Set();

  ctx.mount.innerHTML = `
    <p class="small text-body-secondary">Markiere nacheinander Buchstaben und bestätige dann das Wort.</p>
    <div class="word-grid" id="word-grid" role="grid" aria-label="Buchstabengitter"></div>
    <div class="d-flex gap-2 mt-3">
      <input class="form-control" id="word-input" placeholder="Gefundenes Wort" aria-label="Gefundenes Wort eingeben" />
      <button class="btn btn-outline-primary" id="word-check" type="button">Prüfen</button>
    </div>
    <p class="small mt-3">Zu finden: ${words.map((w) => `<span class='badge text-bg-light me-1'>${w}</span>`).join("")}</p>
    <p class="small" id="word-result">Gefunden: 0/${words.length}</p>
  `;

  const gridEl = ctx.mount.querySelector("#word-grid");
  gridEl.style.gridTemplateColumns = `repeat(${grid[0].length}, 1fr)`;
  grid.flat().forEach((letter) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "word-cell";
    btn.textContent = letter;
    btn.addEventListener("click", () => {
      const input = ctx.mount.querySelector("#word-input");
      input.value += letter;
    });
    gridEl.appendChild(btn);
  });

  const input = ctx.mount.querySelector("#word-input");
  const result = ctx.mount.querySelector("#word-result");

  function checkWord() {
    const value = input.value.trim().toUpperCase();
    if (words.includes(value)) {
      found.add(value);
      input.value = "";
      result.textContent = `Gefunden: ${found.size}/${words.length}`;
      announce(`${value} gefunden.`);
    }
    if (found.size === words.length) announce("Alle Wörter gefunden.");
  }

  ctx.mount.querySelector("#word-check").addEventListener("click", checkWord);
  ctx.on("newGame", () => window.location.reload());
  ctx.on("undo", () => {
    input.value = input.value.slice(0, -1);
  });
  ctx.on("hint", () => {
    const missing = words.find((w) => !found.has(w));
    if (missing) announce(`Hinweis: Suche nach ${missing[0]}...`);
  });
  ctx.on("settings", () => input.focus());
}
