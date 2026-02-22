# klickspiele.de – static game portal (vanilla HTML/CSS/JS)

This repository is a fully static, mobile-first game portal with per-game static pages for SEO.

## Structure

- `/index.html` – homepage (categories + top games)
- `/{category}/index.html` – category hubs
- `/{category}/{game-id}/index.html` – individual game page
- `/{category}/{game-id}/game.js` – game type selector (connects page to engine)
- `/{category}/{game-id}/page.js` – page wiring (modes, scoring, history, share, tracking)
- `/assets/css/site.css` – global CSS
- `/assets/js/site.js` – global JS (cookie consent + scroll depth)
- `/assets/js/tracking.js` – local analytics abstraction (no external calls)
- `/assets/js/engine.js` – tiny game engine implementations
- `/data/games.json` – dataset (source of truth)
- `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`

## Local dev server

From the project root:

```bash
python3 -m http.server 8080 --directory .
```

Open: http://localhost:8080

## Tracking

Nothing fires without consent. After accepting the cookie banner, events are logged to the console:
- start, restart, mode_change, score_submit, share, faq_open, scroll_depth_50, ad_impression

Swap tracking output in `/assets/js/tracking.js` if you want Plausible/GA later.

## Rebuild

A minimal scaffold exists in `tools/build.py`. The current output is already generated; extend that script if you want full regeneration from templates.
