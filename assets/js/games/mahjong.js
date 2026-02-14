import { announce } from "../core/ui.js";

const symbols = ["BAM", "DOT", "CHR", "WND", "DRG", "SEAS", "FLOW", "SUN"];

function generateTiles() {
  const pool = symbols.flatMap((s) => [s, s, s, s]);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 24);
}

export function initMahjong(ctx) {
  ctx.mount.innerHTML = `<p class="small text-body-secondary">Wähle zwei gleiche freie Steine. Ein Stein ist frei, wenn links oder rechts kein Nachbar liegt.</p><div class="mahjong-board" id="mahjong-board"></div>`;
  const board = ctx.mount.querySelector("#mahjong-board");
  let selected = null;
  let tiles = [];

  function free(index) {
    if (!tiles[index]) return false;
    return !tiles[index - 1] || !tiles[index + 1];
  }

  function draw() {
    board.innerHTML = "";
    tiles.forEach((tile, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `mahjong-tile ${selected === i ? "selected" : ""}`;
      btn.disabled = !tile;
      btn.textContent = tile || "";
      btn.setAttribute("aria-label", tile ? `Stein ${tile}` : "Leeres Feld");
      if (tile && !free(i)) btn.classList.add("blocked");
      btn.addEventListener("click", () => {
        if (!tile || !free(i)) return;
        if (selected === null) {
          selected = i;
        } else if (selected === i) {
          selected = null;
        } else if (tiles[selected] === tile) {
          tiles[selected] = "";
          tiles[i] = "";
          selected = null;
          announce("Paar entfernt.");
        } else {
          selected = i;
        }
        draw();
        if (tiles.every((t) => !t)) announce("Mahjong gewonnen.");
      });
      board.appendChild(btn);
    });
  }

  function newGame() {
    tiles = generateTiles();
    selected = null;
    draw();
  }

  ctx.on("newGame", newGame);
  ctx.on("undo", () => announce("Rückgängig ist in dieser Version nicht aktiv."));
  ctx.on("hint", () => {
    for (let i = 0; i < tiles.length; i += 1) {
      for (let j = i + 1; j < tiles.length; j += 1) {
        if (tiles[i] && tiles[i] === tiles[j] && free(i) && free(j)) {
          announce(`Hinweis: Paar ${tiles[i]} ist verfügbar.`);
          return;
        }
      }
    }
    announce("Kein freies Paar gefunden.");
  });
  ctx.on("settings", () => announce("Keine zusätzlichen Einstellungen."));

  newGame();
}
