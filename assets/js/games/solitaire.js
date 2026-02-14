import { announce } from "../core/ui.js";

const suits = ["♠", "♥", "♦", "♣"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const red = new Set(["♥", "♦"]);

function deck() {
  const d = suits.flatMap((s) => values.map((v, i) => ({ s, v, n: i + 1 })));
  for (let i = d.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function canStack(a, b) {
  return b.n === a.n - 1 && red.has(a.s) !== red.has(b.s);
}

function canFoundation(card, pile) {
  if (!pile.length) return card.n === 1;
  const top = pile[pile.length - 1];
  return top.s === card.s && card.n === top.n + 1;
}

function cardText(c) {
  return `${c.v}${c.s}`;
}

export function initSolitaire(ctx) {
  ctx.mount.innerHTML = `<div id="solitaire-root"></div>`;
  const root = ctx.mount.querySelector("#solitaire-root");
  let stock = [];
  let waste = [];
  let tableaus = [];
  let foundations = [[], [], [], []];
  let selected = null;

  function drawCard(card, source, index) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `card-btn ${selected?.source === source && selected?.index === index ? "selected" : ""}`;
    btn.textContent = cardText(card);
    btn.addEventListener("click", () => {
      selected = { source, index, card };
      render();
    });
    return btn;
  }

  function moveSelectedToTableau(target) {
    if (!selected) return false;
    const card = selected.card;
    const pile = tableaus[target];
    const top = pile[pile.length - 1];
    if ((top && canStack(top, card)) || (!top && card.n === 13)) {
      removeSelected();
      pile.push(card);
      selected = null;
      return true;
    }
    return false;
  }

  function moveSelectedToFoundation(target) {
    if (!selected) return false;
    const card = selected.card;
    if (canFoundation(card, foundations[target])) {
      removeSelected();
      foundations[target].push(card);
      selected = null;
      return true;
    }
    return false;
  }

  function removeSelected() {
    if (!selected) return;
    if (selected.source === "waste") waste.pop();
    if (selected.source.startsWith("t")) tableaus[Number(selected.source.slice(1))].pop();
  }

  function render() {
    root.innerHTML = "";
    const top = document.createElement("div");
    top.className = "sol-top";
    const stockBtn = document.createElement("button");
    stockBtn.type = "button";
    stockBtn.className = "card-back";
    stockBtn.textContent = stock.length ? "Stock" : "Neu";
    stockBtn.addEventListener("click", () => {
      if (stock.length) {
        waste.push(stock.pop());
      } else {
        stock = waste.reverse();
        waste = [];
      }
      selected = null;
      render();
    });
    top.appendChild(stockBtn);

    const wasteWrap = document.createElement("div");
    wasteWrap.className = "pile";
    if (waste.length) wasteWrap.appendChild(drawCard(waste[waste.length - 1], "waste", waste.length - 1));
    top.appendChild(wasteWrap);

    const foundationWrap = document.createElement("div");
    foundationWrap.className = "foundation-wrap";
    foundations.forEach((pile, i) => {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "foundation-slot";
      slot.textContent = pile.length ? cardText(pile[pile.length - 1]) : "A";
      slot.addEventListener("click", () => {
        if (moveSelectedToFoundation(i)) {
          announce("Karte abgelegt.");
          render();
          if (foundations.every((f) => f.length === 13)) announce("Solitär gewonnen.");
        }
      });
      foundationWrap.appendChild(slot);
    });
    top.appendChild(foundationWrap);

    const tabs = document.createElement("div");
    tabs.className = "sol-tabs";
    tableaus.forEach((pile, i) => {
      const col = document.createElement("button");
      col.type = "button";
      col.className = "tab-col";
      const topCard = pile[pile.length - 1];
      col.textContent = topCard ? cardText(topCard) : "Leer";
      col.addEventListener("click", () => {
        if (selected && moveSelectedToTableau(i)) {
          announce("Zug ausgeführt.");
        } else if (topCard) {
          selected = { source: `t${i}`, index: pile.length - 1, card: topCard };
        }
        render();
      });
      tabs.appendChild(col);
    });

    root.append(top, tabs);
  }

  function newGame() {
    const d = deck();
    tableaus = Array.from({ length: 7 }, (_, i) => d.splice(0, i + 1));
    stock = d;
    waste = [];
    foundations = [[], [], [], []];
    selected = null;
    render();
  }

  ctx.on("newGame", newGame);
  ctx.on("undo", () => announce("Rückgängig ist für diese Version deaktiviert."));
  ctx.on("hint", () => announce("Tipp: Lege zuerst Asse und Zweien in die Ablage."));
  ctx.on("settings", () => announce("Ziehmodus: Tippen aktiviert."));

  newGame();
}
