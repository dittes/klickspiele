# Memory – klickspiele.de

Produktionsreifes Memory-Spiel (Paare finden) als statische, mobile-first HTML/CSS/Vanilla-JS-Website.

## Ordnerstruktur

```
memory-onegame/
├── index.html          # Hauptseite (SEO + Spiel)
├── impressum.html      # Impressum (noindex)
├── datenschutz.html    # Datenschutzerklärung (noindex)
├── robots.txt
├── sitemap.xml
├── README.md
└── assets/
    ├── styles.css      # Design-System (unverändert, Input)
    ├── ui.json         # Design-Tokens JSON (unverändert, Input)
    ├── memory.css      # Spielspezifische Styles (Karten-Flip, Grid, etc.)
    ├── decks.js        # Karten-Decks (Emoji-Symbole)
    ├── game.js         # Spiel-Engine (Zustands-Maschine)
    ├── ui-runtime.js   # UI-JSON-Lader & Token-Integration
    ├── seo.js          # SEO-Hilfsfunktionen
    ├── app.js          # Haupt-App (Einstellungen, Sound, Highscores)
    └── manifest.json   # PWA-Manifest
```

## Lokal testen

```bash
cd memory-onegame
python3 -m http.server 8080
# → http://localhost:8080/
```

> **Wichtig:** ES-Module (`type="module"`) benötigen einen echten HTTP-Server.
> Direkt via `file://` öffnen funktioniert nicht. Python-Server oder Live Server reichen aus.

## Features

| Feature | Details |
|---|---|
| **Decks** | Tiere 🐾, Flaggen 🏴, Emojis 😊, Weihnachten 🎄, Früchte 🍎, Weltraum 🚀 |
| **Raster** | 3×4, 4×4, 4×5, 5×4, 6×6 |
| **Schwierigkeiten** | Normal / Schwer (Peek + kürzere Anzeigezeit) |
| **Timer** | An/Aus, persistiert Einstellung |
| **Sound** | Web Audio API (synthetisiert, keine Dateien) |
| **Highscores** | Pro Deck + Raster + Timer, localStorage |
| **Dark Mode** | Via `.dark-mode` auf `<body>`, AppBar-Toggle |
| **Große Karten** | Accessibility-Toggle |
| **Hoher Kontrast** | Accessibility-Toggle |
| **PWA** | manifest.json, zum Homescreen hinzufügbar |
| **Tastatur** | Tab/Enter/Space, Escape schließt Dialoge |
| **Screenreader** | ARIA-Labels, Live-Region, aria-pressed |
| **Reduced Motion** | Animationen respektieren prefers-reduced-motion |

## SEO-Checkliste

- [x] `<title>` unique, beschreibend, DE
- [x] `<meta name="description">` vorhanden
- [x] `<link rel="canonical">` gesetzt
- [x] Open Graph Tags (og:title, og:description, og:type, og:url, og:image)
- [x] Twitter Card Tags
- [x] JSON-LD: **WebSite** Schema
- [x] JSON-LD: **WebApplication** / Game Schema
- [x] JSON-LD: **BreadcrumbList** (Home → Memory)
- [x] JSON-LD: **FAQPage** (12 Fragen)
- [x] Longform-Content ~1600 Wörter statisch im HTML
- [x] Semantisches HTML: `<article>`, `<section>`, `<header>`, `<footer>`, `<main>`
- [x] H1 → H2 → H3 Hierarchie korrekt
- [x] `robots.txt` und `sitemap.xml`
- [x] Impressum & Datenschutz verlinkt

## Accessibility-Checkliste

- [x] Skip-Link (#main)
- [x] Min. Touch-Target 56×56px (Design-System)
- [x] Focus-Ring sichtbar (3px solid #F57C00)
- [x] Alle interaktiven Elemente mit `aria-label`
- [x] Karten: `role="button"`, `aria-pressed`, `aria-label` dynamisch
- [x] Spielfeld: `role="grid"`, `aria-label`
- [x] Live-Region für Screenreader-Ansagen
- [x] `aria-hidden="true"` für dekorative Elemente
- [x] Dialoge: `role="dialog"`, `aria-modal="true"`, `aria-hidden`
- [x] Escape schließt alle Dialoge
- [x] `prefers-reduced-motion`: Flip-Animation, Match-Bounce, Shake – alle deaktivierbar
- [x] Kein Layout Shift durch feste `aspect-ratio` auf Karten
- [x] Kontrast: Orange #F57C00 auf Weiß ≥ 3:1 (WCAG AA für UI-Komponenten)

## Abweichungen vom UI-JSON (max. 5 Punkte)

1. **settings-opt** ist kein nativer `<button>` mit `class="pill-btn"`, sondern eine spielspezifische Klasse – weil die Optionen in einem Grid skalieren müssen (flexibles `auto-fill`-Layout).
2. **Karten-Rückseite** hat kein direktes Pendant im Design-System; verwendet trotzdem CSS-Variablen `--c-primary`, `--r-md`, `--elev-1`.
3. **Toggle-Switch** ist kein Standard-Design-System-Komponente; implementiert als barrierefreies `<label><input type="checkbox"></label>` mit CSS-Pseudo-Elementen, nutzt aber `--c-primary` und `--r-full`.
4. **`ui-runtime.js`** lädt `ui.json` nur zur Token-Verifikation – da alle Werte identisch zur `styles.css` sind, werden keine Overrides durchgeführt. Dynamische SEO-Updates (Titel, Schema) erfolgen trotzdem.
5. **Kein separater Navigations-Block** aus dem UI-JSON generiert – der Header ist im HTML fest codiert (SEO-Anforderung; dynamisch geladener Header wäre für Crawler unsichtbar).

## Lizenz / Credits

- Design-System: klickspiele.de (via styles.css + ui.json, Input)
- Spiel-Engine: Vanilla JS, keine Abhängigkeiten
- Symbole: Unicode Emoji Standard (keine externen Ressourcen)
