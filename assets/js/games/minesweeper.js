import { announce } from "../core/ui.js";

const size = 9;
const minesCount = 10;

function neighbors(r, c) {
  const out = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < size && cc >= 0 && cc < size) out.push([rr, cc]);
    }
  }
  return out;
}

export function initMinesweeper(ctx) {
  ctx.mount.innerHTML = `<p class="small">Tippen: Feld öffnen. Langer Tipp/Rechtsklick: Flagge setzen.</p><div class="mine-grid" id="mine-grid"></div>`;
  const root = ctx.mount.querySelector("#mine-grid");
  root.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

  let mines = new Set();
  let open = new Set();
  let flags = new Set();

  function key(r, c) {
    return `${r},${c}`;
  }

  function count(r, c) {
    return neighbors(r, c).filter(([rr, cc]) => mines.has(key(rr, cc))).length;
  }

  function flood(r, c) {
    const k = key(r, c);
    if (open.has(k) || flags.has(k)) return;
    open.add(k);
    if (count(r, c) === 0) neighbors(r, c).forEach(([rr, cc]) => flood(rr, cc));
  }

  function draw() {
    root.innerHTML = "";
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        const k = key(r, c);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mine-cell";
        btn.setAttribute("aria-label", `Feld ${r + 1}-${c + 1}`);
        if (flags.has(k)) btn.textContent = "⚑";
        if (open.has(k)) {
          btn.classList.add("open");
          const n = count(r, c);
          btn.textContent = n ? String(n) : "";
        }
        btn.addEventListener("click", () => {
          if (flags.has(k) || open.has(k)) return;
          if (mines.has(k)) {
            announce("Mine getroffen. Neues Spiel starten.");
            open = new Set([...open, ...mines]);
          } else {
            flood(r, c);
            if (open.size === size * size - minesCount) announce("Gewonnen. Alle sicheren Felder geöffnet.");
          }
          draw();
        });
        btn.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          if (open.has(k)) return;
          if (flags.has(k)) flags.delete(k); else flags.add(k);
          draw();
        });
        root.appendChild(btn);
      }
    }
  }

  function newGame() {
    mines = new Set();
    open = new Set();
    flags = new Set();
    while (mines.size < minesCount) {
      mines.add(key(Math.floor(Math.random() * size), Math.floor(Math.random() * size)));
    }
    draw();
  }

  ctx.on("newGame", newGame);
  ctx.on("undo", () => announce("Rückgängig ist nicht verfügbar."));
  ctx.on("hint", () => announce("Tipp: Beginne in Ecken für große Öffnungsflächen."));
  ctx.on("settings", () => announce("Modus: 9x9 mit 10 Minen."));

  newGame();
}
