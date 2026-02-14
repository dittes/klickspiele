# Denksport & Logikspiele (statische Web-App)

Dieses Projekt ist ein mobil-optimiertes, deutsches Spieleportal mit 30 Browser-Spielen, SEO-Basis (Meta, JSON-LD, Sitemap, Robots), Cookie-Einwilligung und optionaler PWA-Unterstützung.

## Projektstruktur

- `/index.html` Startseite
- `/spiele/<slug>/index.html` 30 Spielseiten
- `/assets/css/styles.css` globales Styling
- `/assets/js/core/*` Kernlogik (Theme, Consent, Seite)
- `/assets/js/games/*` Spiel-Engines
- `/impressum/`, `/datenschutz/`, `/kontakt/` Recht & Kontakt
- `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, `/sw.js`

## Lokal starten

1. In den Projektordner wechseln.
2. Einen statischen Server starten, z. B.:

```bash
python3 -m http.server 8080
```

3. Im Browser öffnen: `http://localhost:8080`

## Deployment (statisches Hosting)

Du kannst das Projekt direkt auf Netlify, Vercel (Static), GitHub Pages, Cloudflare Pages oder jedem klassischen Webspace mit HTML-Auslieferung deployen.

1. Dateien unverändert hochladen.
2. Sicherstellen, dass Root-Auslieferung aktiv ist (kein Unterordner-Offset).
3. Eigene Domain eintragen (z. B. `www.deine-domain.de`).
4. In `assets/js/core/game-data.js` und `assets/js/core/game-data.mjs` die `SITE_URL` auf deine echte Domain ändern.
5. Danach `node scripts/generate-pages.mjs` erneut ausführen, damit Canonicals und Sitemap korrekt zur Domain passen.

## Rechtlicher Hinweis

Die Seiten in `/impressum/` und `/datenschutz/` enthalten Platzhalter und müssen vor produktivem Einsatz rechtlich geprüft und vollständig ersetzt werden.
