import { initTheme } from "./theme.js";
import { initConsent } from "./consent.js";
import { loadAnalyticsIfConsented } from "./analytics.js";
import { games } from "./game-data.js";

function renderHomeCards() {
  const wrap = document.getElementById("game-cards");
  if (!wrap) return;
  wrap.innerHTML = games
    .map(
      (game) => `
      <article class="col-12 col-sm-6 col-lg-4">
        <a class="card h-100 game-card text-decoration-none" href="/spiele/${game.slug}/" aria-label="${game.name} öffnen">
          <div class="card-body">
            <p class="small text-uppercase text-secondary mb-1">${game.category}</p>
            <h2 class="h5 card-title mb-2">${game.name}</h2>
            <p class="card-text small text-body-secondary mb-0">${game.description}</p>
          </div>
        </a>
      </article>
    `
    )
    .join("");
}

function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
}

initTheme();
initConsent(loadAnalyticsIfConsented);
renderHomeCards();
registerSW();
