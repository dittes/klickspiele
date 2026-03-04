/**
 * ui-runtime.js — Lädt ui.json und wendet Design-Tokens an
 * Ergänzt das statische CSS mit dynamischen Overrides (falls nötig)
 */

export class UIRuntime {
  constructor(jsonPath) {
    this.path   = jsonPath;
    this.config = null;
  }

  async load() {
    try {
      const res = await fetch(this.path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.config = await res.json();
      this._applyTokens();
      this._patchHeader();
    } catch (e) {
      console.warn('[UIRuntime] ui.json nicht geladen:', e.message);
    }
    return this;
  }

  // Wendet CSS-Variablen aus dem JSON an (falls abweichend vom CSS)
  _applyTokens() {
    if (!this.config?.color) return;
    const root = document.documentElement;
    const c    = this.config.color;
    // Nur überschreiben, wenn explizit im JSON definiert und vom CSS abweichend
    // (Hier: die Werte sind identisch, also kein Override nötig – Sicherheits-Check)
    const varMap = {
      '--c-primary':          c.primary,
      '--c-on-primary':       c.onPrimary,
      '--c-primary-container':c.primaryContainer,
    };
    // Nur setzen wenn Wert vorhanden (kein versehentliches Löschen)
    for (const [prop, val] of Object.entries(varMap)) {
      if (val) root.style.setProperty(prop, val);
    }
  }

  // Stellt sicher, dass Header-Elemente korrekt befüllt sind
  _patchHeader() {
    if (!this.config) return;
    // Footer-Copyright aktualisieren falls im JSON anders
    const copyEl = document.querySelector('.site-footer__copy');
    if (copyEl && this.config.brand?.footerCopyright) {
      copyEl.textContent = this.config.brand.footerCopyright;
    }
  }

  // Gibt Deck-/Grid-Labels aus dem JSON zurück (falls dort definiert)
  getLabel(key) {
    return this.config?.[key] ?? key;
  }

  // Liefert das vollständige Config-Objekt
  get() { return this.config; }
}
