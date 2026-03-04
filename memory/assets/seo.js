/**
 * seo.js — SEO-Hilfsfunktionen (Ergänzung zum statischen JSON-LD in index.html)
 * Aktualisiert dynamische Metadaten nach Spielende / Einstellungsänderung
 */

// Aktualisiert den <title> je nach aktivem Deck/Grid
export function updateTitle(deckLabel, gridLabel) {
  const base = `Memory online spielen – ${deckLabel} ${gridLabel} – klickspiele.de`;
  document.title = base;
}

// Setzt strukturierte Daten für das aktuelle Spiel-Setup (BreadcrumbList)
// Wird nur einmalig beim Init aufgerufen; JSON-LD ist größtenteils statisch
export function injectGameSchema(deckLabel) {
  const existing = document.getElementById('ld-game-dynamic');
  if (existing) existing.remove();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': `Memory – ${deckLabel}`,
    'url': 'https://klickspiele.de/memory/',
    'applicationCategory': 'GameApplication',
    'operatingSystem': 'Browser',
    'inLanguage': 'de',
    'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR' },
  };
  const script = document.createElement('script');
  script.id   = 'ld-game-dynamic';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}
