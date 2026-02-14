import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const { games, gameBySlug, SITE_URL } = await import(path.join(root, "assets/js/core/game-data.mjs"));

const categories = Object.entries(
  games.reduce((acc, game) => {
    acc[game.category] = acc[game.category] || [];
    acc[game.category].push(game);
    return acc;
  }, {})
);

function faqFor(name) {
  return [
    {
      q: `Wie starte ich ${name} auf dem Handy?`,
      a: `${name} startet direkt im Browser. Tippe auf "Neues Spiel" und nutze die untere Aktionsleiste für Hinweise und Einstellungen.`,
    },
    {
      q: `Gibt es tägliche Aufgaben in ${name}?`,
      a: `Ja. Die Tagesaufgaben rotieren lokal nach Datum, ohne Serverabfrage.`,
    },
    {
      q: `Kann ich Züge rückgängig machen?`,
      a: `Viele Spiele unterstützen eine Rückgängig-Funktion. Wenn sie eingeschränkt ist, wird das im Spielhinweis angezeigt.`,
    },
    {
      q: `Welche Schwierigkeitsgrade sind verfügbar?`,
      a: `Je nach Spiel gibt es leichte, mittlere und schwere Varianten oder unterschiedliche Puzzlegrößen.`,
    },
    {
      q: `Funktioniert ${name} auch ohne App?`,
      a: `Ja, alle Spiele laufen direkt im Browser auf Smartphone, Tablet und Desktop.`,
    },
    {
      q: `Wie verbessere ich mich bei ${name}?`,
      a: `Arbeite in kleinen Schritten, prüfe Muster systematisch und nutze Hinweise nur gezielt.`,
    },
  ];
}

function baseHead({ title, description, canonical, type = "website", image = "/assets/img/og-default.svg" }) {
  return `
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonical}" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <meta property="og:locale" content="de_DE" />
  <meta property="og:type" content="${type}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:site_name" content="Denksport & Logikspiele" />
  <meta property="og:image" content="${SITE_URL}${image}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${SITE_URL}${image}" />
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous" />
  <link rel="stylesheet" href="/assets/css/styles.css" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta name="theme-color" content="#0b6e4f" />`;
}

function siteHeader() {
  return `<header class="site-header"><nav class="container py-2 d-flex justify-content-between align-items-center" aria-label="Hauptnavigation"><a href="/" class="fw-bold text-decoration-none">Denksport & Logikspiele</a><div class="d-flex gap-2"><a class="btn btn-sm btn-outline-secondary" href="/kontakt/">Kontakt</a><button type="button" class="btn btn-sm btn-outline-secondary" data-theme-toggle aria-label="Farbschema wechseln">Dunkel</button></div></nav></header>`;
}

function siteFooter() {
  return `<footer class="mt-5 border-top border-soft"><div class="container py-4 small d-flex flex-column flex-md-row justify-content-between gap-2"><p class="mb-0">© ${new Date().getFullYear()} Denksport & Logikspiele</p><p class="mb-0"><a href="/impressum/">Impressum</a> · <a href="/datenschutz/">Datenschutz</a> · <a href="/kontakt/">Kontakt</a></p></div></footer>`;
}

function cookieBanner() {
  return `<section id="cookie-banner" class="bg-surface p-3" hidden aria-label="Cookie-Einwilligung"><div class="container d-flex flex-column flex-md-row gap-2 align-items-md-center justify-content-between"><p class="mb-0 small">Wir verwenden nur notwendige Cookies. Optionale Statistik wird erst nach Einwilligung geladen.</p><div class="d-flex gap-2"><button class="btn btn-outline-secondary btn-sm" data-consent="necessary">Nur notwendig</button><button class="btn btn-primary btn-sm" data-consent="statistik">Statistik</button></div></div></section>`;
}

function homePage() {
  const title = "Denksport & Logikspiele: 30 kostenlose Browser-Spiele";
  const description = "Spiele Sudoku online, Kreuzworträtsel, Solitär, Mahjong, Wortsuche und 25 weitere Logikspiele kostenlos auf Deutsch. Mobil optimiert und ohne Anmeldung.";
  const canonical = `${SITE_URL}/`;
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Denksport & Logikspiele",
    url: SITE_URL,
    inLanguage: "de-DE",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const categoryBlocks = categories
    .map(
      ([name, items]) => `<section class="mb-4"><h2 class="h4">${name}</h2><div class="row g-3">${items
        .map(
          (g) => `<article class="col-12 col-md-6 col-xl-4"><a class="card h-100 game-card text-decoration-none" href="/spiele/${g.slug}/"><div class="card-body"><h3 class="h5 mb-2">${g.name}</h3><p class="small mb-0 text-body-secondary">${g.description}</p></div></a></article>`
        )
        .join("")}</div></section>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="de">
<head>${baseHead({ title, description, canonical })}
<script type="application/ld+json">${JSON.stringify(websiteSchema)}</script>
</head>
<body>
${siteHeader()}
<main class="container py-4">
  <section class="hero-box p-4 mb-4">
    <h1 class="display-6 mb-3">Denksport & Logikspiele kostenlos online spielen</h1>
    <p class="mb-0">Willkommen auf deinem Portal für Sudoku online, Kreuzworträtsel online, Solitär, Mahjong und viele weitere Knobelspiele auf Deutsch. Alle Spiele laufen direkt im Browser, ohne Download und ohne Registrierung. Die Seiten sind für mobile Geräte optimiert, schnell geladen und barrierearm bedienbar. Entdecke tägliche Rätsel, trainiere Logik und Konzentration und finde neue Lieblingsspiele für kurze Pausen oder längere Sessions.</p>
  </section>
  <nav aria-label="Schnellzugriff" class="mb-4"><ul class="list-inline mb-0"><li class="list-inline-item"><a href="/spiele/sudoku/">Sudoku online</a></li><li class="list-inline-item"><a href="/spiele/kreuzwortraetsel/">Kreuzworträtsel online</a></li><li class="list-inline-item"><a href="/spiele/solitaer-klondike/">Solitär</a></li><li class="list-inline-item"><a href="/spiele/mahjong-solitaer/">Mahjong</a></li><li class="list-inline-item"><a href="/spiele/wortsuche/">Wortsuche</a></li></ul></nav>
  ${categoryBlocks}
</main>
${siteFooter()}
${cookieBanner()}
<script type="module" src="/assets/js/core/main.js" defer></script>
</body>
</html>`;
}

function gamePage(game) {
  const canonical = `${SITE_URL}/spiele/${game.slug}/`;
  const faqs = faqFor(game.name);
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Startseite", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Spiele", item: `${SITE_URL}/#spiele` },
      { "@type": "ListItem", position: 3, name: game.name, item: canonical },
    ],
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: game.name,
    url: canonical,
    description: game.description,
    inLanguage: "de-DE",
    isPartOf: { "@type": "WebSite", name: "Denksport & Logikspiele", url: SITE_URL },
  };

  const videoGame = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.name,
    applicationCategory: "Game",
    genre: game.category,
    operatingSystem: "Browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    inLanguage: "de-DE",
    url: canonical,
    description: game.description,
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const related = game.related
    .map((slug) => gameBySlug[slug])
    .filter(Boolean)
    .map((rel) => `<li><a href="/spiele/${rel.slug}/">${rel.name}</a></li>`)
    .join("");

  return `<!doctype html>
<html lang="de">
<head>${baseHead({ title: game.title, description: game.description, canonical, type: "article" })}
<script type="application/ld+json">${JSON.stringify(webPage)}</script>
<script type="application/ld+json">${JSON.stringify(videoGame)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
</head>
<body data-game-slug="${game.slug}">
${siteHeader()}
<main class="container py-3 py-md-4">
  <nav aria-label="Breadcrumb" class="small mb-3">
    <ol class="breadcrumb mb-0"><li class="breadcrumb-item"><a href="/">Startseite</a></li><li class="breadcrumb-item"><a href="/">Spiele</a></li><li class="breadcrumb-item active" aria-current="page">${game.name}</li></ol>
  </nav>
  <article>
    <header class="mb-3">
      <h1 class="h2 mb-3">${game.title}</h1>
      <p>${game.intro}</p>
    </header>
    <section class="game-shell mb-4" aria-label="Spielbereich">
      <div id="game-root"></div>
      <p id="sr-status" aria-live="polite" class="visually-hidden-live"></p>
    </section>
    <section class="mb-4">
      <h2 class="h4">Spielregeln</h2>
      <p>Starte über die Schaltfläche "Neues Spiel". Spieleingaben erfolgen per Touch, Maus oder Tastatur. Das Ziel ist abhängig vom jeweiligen Regelwerk und wird direkt im Spielfeld erklärt. Die Eingabevalidierung zeigt fehlerhafte Schritte frühzeitig, damit du strukturiert weiterlösen kannst.</p>
      <h2 class="h4">Tipps & Strategien</h2>
      <p>Arbeite mit klaren Zwischenzielen, vermeide vorschnelle Züge und nutze Hinweise nur gezielt. Gerade bei Zahlen- und Rasterrätseln hilft es, sichere Felder zuerst festzuhalten und danach offene Bereiche systematisch zu prüfen. Wiederkehrende Muster erkennst du schneller, wenn du regelmäßig kurze Runden spielst.</p>
      <h2 class="h4">Schwierigkeitsgrade und Varianten</h2>
      <p>Viele Spiele bieten mehrere Stufen von leicht bis schwer oder rotierende Tagesaufgaben. Auf Mobilgeräten helfen große Eingabeflächen und die untere Aktionsleiste, damit du schnell zwischen Neu, Rückgängig, Hinweis und Einstellungen wechseln kannst.</p>
    </section>
    <section class="mb-4">
      <h2 class="h4">Verwandte Spiele</h2>
      <ul>${related}</ul>
    </section>
    <section id="faq" class="mb-5">
      <h2 class="h4">FAQ</h2>
      <div class="accordion" id="faq-${game.slug}">${faqs
        .map(
          (f, i) => `<div class="accordion-item"><h3 class="accordion-header"><button class="accordion-button ${i ? "collapsed" : ""}" type="button" data-bs-toggle="collapse" data-bs-target="#faq-${game.slug}-${i}">${f.q}</button></h3><div id="faq-${game.slug}-${i}" class="accordion-collapse collapse ${i ? "" : "show"}" data-bs-parent="#faq-${game.slug}"><div class="accordion-body">${f.a}</div></div></div>`
        )
        .join("")}</div>
    </section>
  </article>
</main>
<div class="action-bar-wrap"><div class="container"><div id="action-bar" aria-label="Spielaktionen"></div></div></div>
${siteFooter()}
${cookieBanner()}
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" defer></script>
<script type="module" src="/assets/js/core/game-page.js" defer></script>
</body>
</html>`;
}

function legalPage({ title, h1, content, pathName }) {
  const canonical = `${SITE_URL}${pathName}`;
  return `<!doctype html><html lang="de"><head>${baseHead({ title, description: h1, canonical })}</head><body>${siteHeader()}<main class="container py-4"><h1 class="h2">${h1}</h1>${content}</main>${siteFooter()}${cookieBanner()}<script type="module" src="/assets/js/core/main.js" defer></script></body></html>`;
}

fs.writeFileSync(path.join(root, "index.html"), homePage(), "utf8");

for (const game of games) {
  const dir = path.join(root, "spiele", game.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), gamePage(game), "utf8");
}

fs.mkdirSync(path.join(root, "impressum"), { recursive: true });
fs.mkdirSync(path.join(root, "datenschutz"), { recursive: true });
fs.mkdirSync(path.join(root, "kontakt"), { recursive: true });

fs.writeFileSync(
  path.join(root, "impressum", "index.html"),
  legalPage({
    title: "Impressum | Denksport & Logikspiele Deutschland",
    h1: "Impressum",
    pathName: "/impressum/",
    content: `<p>Angaben gemäß § 5 TMG (Platzhalter):</p><p>Max Mustermann<br>Musterstraße 1<br>10115 Berlin<br>Deutschland</p><p>E-Mail: kontakt@denksport-logikspiele.de</p><p>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV: Max Mustermann, Anschrift wie oben.</p>`,
  }),
  "utf8"
);

fs.writeFileSync(
  path.join(root, "datenschutz", "index.html"),
  legalPage({
    title: "Datenschutz | Denksport & Logikspiele Deutschland",
    h1: "Datenschutzerklärung",
    pathName: "/datenschutz/",
    content: `<p>Diese Website verarbeitet nur technisch notwendige Daten zur Bereitstellung der Inhalte. Optionale Statistik wird ausschließlich nach ausdrücklicher Einwilligung geladen.</p><h2 class="h5">Verantwortlicher</h2><p>Max Mustermann, Musterstraße 1, 10115 Berlin.</p><h2 class="h5">Speicherfristen</h2><p>Einwilligungsstatus wird lokal im Browser gespeichert und kann jederzeit zurückgesetzt werden.</p><h2 class="h5">Rechte</h2><p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Beschwerde bei einer Aufsichtsbehörde.</p><p>Hinweis: Diese Seite enthält Platzhalter und muss vor dem Livebetrieb rechtlich geprüft werden.</p>`,
  }),
  "utf8"
);

fs.writeFileSync(
  path.join(root, "kontakt", "index.html"),
  legalPage({
    title: "Kontakt | Denksport & Logikspiele Deutschland",
    h1: "Kontakt",
    pathName: "/kontakt/",
    content: `<p>Fragen, Feedback oder Fehlermeldungen:</p><p>E-Mail: kontakt@denksport-logikspiele.de</p><p>Antwortzeit in der Regel innerhalb von 2 Werktagen.</p>`,
  }),
  "utf8"
);

const urls = ["", "impressum/", "datenschutz/", "kontakt/", ...games.map((g) => `spiele/${g.slug}/`)];
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((u) => `  <url><loc>${SITE_URL}/${u}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${u ? "0.8" : "1.0"}</priority></url>`)
  .join("\n")}\n</urlset>`;
fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap, "utf8");

const robots = `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`;
fs.writeFileSync(path.join(root, "robots.txt"), robots, "utf8");
