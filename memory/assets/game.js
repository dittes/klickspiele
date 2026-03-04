/**
 * game.js — Memory-Spiel Engine
 * Zustands-Maschine: idle → first-flip → second-flip → locked → finished
 */

export class MemoryGame {
  /**
   * @param {HTMLElement} boardEl  — Das Grid-Element
   * @param {object} deck         — { symbols: string[] }
   * @param {object} grid         — { cols, rows, pairs }
   * @param {object} settings     — { difficulty, timer, sound }
   * @param {object} callbacks    — { onMove, onMatch, onMismatch, onFinish, onTick }
   */
  constructor(boardEl, deck, grid, settings, callbacks) {
    this.boardEl   = boardEl;
    this.deck      = deck;
    this.grid      = grid;
    this.settings  = settings;
    this.cb        = callbacks;

    this.cards     = [];
    this.state     = 'idle';   // idle|first-flip|second-flip|locked|finished|paused
    this.first     = null;
    this.second    = null;

    this.moves     = 0;
    this.matches   = 0;
    this.startTime = null;
    this.elapsed   = 0;     // ms
    this._timerId  = null;
    this._paused   = false;

    // Schwer-Modus: kurzer Peek zu Beginn (alle Karten 1,5s sichtbar)
    this._difficulty = settings.difficulty || 'normal';
  }

  // ── Build & render ──────────────────────────────────────
  start() {
    this.state    = 'idle';
    this.first    = null;
    this.second   = null;
    this.moves    = 0;
    this.matches  = 0;
    this.elapsed  = 0;
    this._paused  = false;
    clearInterval(this._timerId);

    // Symbole auswählen und mischen
    const symbols = this._pick(this.deck.symbols, this.grid.pairs);
    const pairs   = [...symbols, ...symbols];
    this._shuffle(pairs);

    this.cards = pairs.map((sym, i) => ({
      id:     i,
      pairId: symbols.indexOf(sym),
      symbol: sym,
      state:  'hidden',   // hidden|flipped|matched
      el:     null,
    }));

    this._render();

    // Schwer-Modus: kurzer Peek (1,6s alle Karten zeigen)
    if (this._difficulty === 'hard') {
      this._peek(1600);
    }
  }

  _pick(arr, n) {
    const copy = [...arr];
    this._shuffle(copy);
    return copy.slice(0, n);
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  _render() {
    const { cols } = this.grid;
    this.boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    this.boardEl.setAttribute('aria-label', `Memory Spielfeld ${this.grid.cols}×${this.grid.rows}`);
    this.boardEl.innerHTML = '';

    this.cards.forEach(card => {
      const btn = document.createElement('button');
      btn.className  = 'mem-card rpl';
      btn.type       = 'button';
      btn.setAttribute('aria-label', 'Verdeckte Karte');
      btn.setAttribute('aria-pressed', 'false');
      btn.dataset.id = card.id;

      btn.innerHTML = `
        <div class="mem-card__inner" aria-hidden="true">
          <div class="mem-card__back">
            <span class="mem-card__back-icon">🂠</span>
          </div>
          <div class="mem-card__face">${card.symbol}</div>
        </div>`;

      btn.addEventListener('click', () => this._onCardClick(card));
      btn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._onCardClick(card);
        }
      });

      card.el = btn;
      this.boardEl.appendChild(btn);
    });
  }

  // ── Peek (Schwer-Modus) ─────────────────────────────────
  _peek(ms) {
    this.state = 'locked';
    this.cards.forEach(c => c.el.classList.add('is-flipped'));
    setTimeout(() => {
      this.cards.forEach(c => {
        if (c.state === 'hidden') c.el.classList.remove('is-flipped');
      });
      this.state = 'idle';
    }, ms);
  }

  // ── Karte anklicken ─────────────────────────────────────
  _onCardClick(card) {
    if (this.state === 'locked'  ||
        this.state === 'finished'||
        this.state === 'paused'  ||
        card.state !== 'hidden') return;

    // Timer starten beim ersten Klick
    if (this.state === 'idle' && !this._paused) {
      this._startTimer();
    }

    card.state = 'flipped';
    card.el.classList.add('is-flipped');
    card.el.setAttribute('aria-pressed', 'true');
    card.el.setAttribute('aria-label', `Aufgedeckt: ${card.symbol}`);

    this.cb.onFlip && this.cb.onFlip(card);

    if (this.state === 'idle' || this.state === 'first-flip') {
      if (!this.first) {
        this.first = card;
        this.state = 'first-flip';
      } else {
        this.second = card;
        this.state  = 'second-flip';
        this._evaluate();
      }
    }
  }

  // ── Paar auswerten ──────────────────────────────────────
  _evaluate() {
    this.moves++;
    this.cb.onMove && this.cb.onMove(this.moves);

    const c1 = this.first;
    const c2 = this.second;
    this.first  = null;
    this.second = null;

    if (c1.pairId === c2.pairId) {
      // ✅ Treffer
      c1.state = c2.state = 'matched';
      c1.el.classList.replace('is-flipped', 'is-matched');
      c2.el.classList.replace('is-flipped', 'is-matched');
      c1.el.setAttribute('aria-label', `Gefunden: ${c1.symbol}`);
      c2.el.setAttribute('aria-label', `Gefunden: ${c2.symbol}`);
      c1.el.setAttribute('aria-disabled', 'true');
      c2.el.setAttribute('aria-disabled', 'true');
      this.matches++;
      this.cb.onMatch && this.cb.onMatch(this.matches, this.grid.pairs);
      this.state = 'idle';

      if (this.matches === this.grid.pairs) {
        this._finish();
      }
    } else {
      // ❌ Kein Treffer
      this.state = 'locked';
      c1.el.classList.add('is-error');
      c2.el.classList.add('is-error');
      this.cb.onMismatch && this.cb.onMismatch();

      const delay = this._difficulty === 'hard' ? 700 : 1000;
      setTimeout(() => {
        c1.el.classList.remove('is-flipped', 'is-error');
        c2.el.classList.remove('is-flipped', 'is-error');
        c1.el.setAttribute('aria-label', 'Verdeckte Karte');
        c2.el.setAttribute('aria-label', 'Verdeckte Karte');
        c1.el.setAttribute('aria-pressed', 'false');
        c2.el.setAttribute('aria-pressed', 'false');
        c1.state = c2.state = 'hidden';
        this.state = 'idle';
      }, delay);
    }
  }

  // ── Timer ────────────────────────────────────────────────
  _startTimer() {
    if (!this.settings.timer) return;
    this.startTime = Date.now() - this.elapsed;
    this._timerId  = setInterval(() => {
      this.elapsed = Date.now() - this.startTime;
      this.cb.onTick && this.cb.onTick(this.elapsed);
    }, 500);
  }

  _stopTimer() {
    clearInterval(this._timerId);
    if (this.startTime) {
      this.elapsed = Date.now() - this.startTime;
    }
  }

  // ── Pause / Fortsetzen ───────────────────────────────────
  pause() {
    if (this.state === 'finished' || this._paused) return;
    this._stopTimer();
    this._prevState = this.state;
    this.state  = 'paused';
    this._paused = true;
    // Alle sichtbaren (nicht gematchten) Karten zudecken
    this.cards.forEach(c => {
      if (c.state === 'flipped') {
        c.el.classList.remove('is-flipped');
        c.el.setAttribute('aria-pressed', 'false');
        c.el.setAttribute('aria-label', 'Verdeckte Karte');
        c.state = 'hidden';
      }
    });
    this.first  = null;
    this.second = null;
  }

  resume() {
    if (!this._paused) return;
    this._paused = false;
    this.state   = 'idle';
    this._startTimer();
  }

  // ── Spiel beendet ────────────────────────────────────────
  _finish() {
    this._stopTimer();
    this.state = 'finished';
    const accuracy = Math.round((this.grid.pairs / this.moves) * 100);
    this.cb.onFinish && this.cb.onFinish({
      moves:    this.moves,
      time:     this.elapsed,
      pairs:    this.grid.pairs,
      accuracy: Math.min(accuracy, 100),
    });
  }

  // ── Hilfsmethoden ───────────────────────────────────────
  getElapsed() { return this.elapsed; }
  getMoves()   { return this.moves; }
  getMatches() { return this.matches; }
  isPaused()   { return this._paused; }
  isFinished() { return this.state === 'finished'; }
}

// Formatiert ms in MM:SS
export function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
