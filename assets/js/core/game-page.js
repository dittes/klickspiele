import { initTheme } from "./theme.js";
import { initConsent } from "./consent.js";
import { loadAnalyticsIfConsented } from "./analytics.js";
import { gameBySlug } from "./game-data.js";
import { setupActionBar } from "./ui.js";
import { initEngine } from "../games/registry.js";

initTheme();
initConsent(loadAnalyticsIfConsented);

const mount = document.getElementById("game-root");
const slug = document.body.dataset.gameSlug;
const game = gameBySlug[slug];

if (!game || !mount) {
  throw new Error("Spielkonfiguration nicht gefunden.");
}

const events = {};
const ctx = {
  game,
  mount,
  on(name, fn) {
    events[name] = fn;
  },
};

setupActionBar([
  { label: "Neues Spiel", onClick: () => events.newGame?.(), ariaLabel: "Neues Spiel starten" },
  { label: "Rückgängig", onClick: () => events.undo?.(), ariaLabel: "Letzten Zug rückgängig" },
  { label: "Hinweis", onClick: () => events.hint?.(), ariaLabel: "Hinweis anzeigen" },
  { label: "Einstellungen", onClick: () => events.settings?.(), ariaLabel: "Spieleinstellungen öffnen" },
]);

initEngine(game.engine, ctx);
