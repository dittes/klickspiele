/**
 * ════════════════════════════════════════════════════════════════
 * klickspiele.de – Freecell Game Engine
 * Vanilla JS · Modular · No dependencies · Mobile-first
 * ════════════════════════════════════════════════════════════════
 */

;(function () {
  'use strict';

  /* ════════════════════════════════════════
     CONFIG
  ════════════════════════════════════════ */
  const CONFIG = {
    SUITS:       ['♠', '♥', '♦', '♣'],
    SUIT_NAMES:  ['spades', 'hearts', 'diamonds', 'clubs'],
    RANKS:       ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
    RANK_VALUES: { A:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 10:10, J:11, Q:12, K:13 },
    RED_SUITS:   ['♥', '♦'],
    DAILY_SEED_BASE: 20250101,
    STORAGE_KEY: 'fc_state_v2',
    HS_KEY:      'fc_highscore_v2',
    STATS_KEY:   'fc_stats_v2',
    ANIM_DURATION: 220,
  };

  /* ════════════════════════════════════════
     DECK MODULE
  ════════════════════════════════════════ */
  const DeckModule = (() => {
    function createDeck() {
      const deck = [];
      CONFIG.SUITS.forEach((suit, si) => {
        CONFIG.RANKS.forEach((rank, ri) => {
          deck.push({
            id:      `${rank}${suit}`,
            suit,
            rank,
            value:   ri + 1, // 1=Ace, 13=King
            isRed:   CONFIG.RED_SUITS.includes(suit),
            suitIdx: si,
          });
        });
      });
      return deck;
    }

    // Seeded PRNG (Mulberry32)
    function createPRNG(seed) {
      let s = seed >>> 0;
      return function () {
        s = Math.imul(s ^ (s >>> 15), s | 1);
        s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
        return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
      };
    }

    function shuffle(deck, seed) {
      const rng  = createPRNG(seed);
      const arr  = [...deck];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function dailySeed() {
      const now  = new Date();
      const date = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
      return date;
    }

    function randomSeed() {
      return Math.floor(Math.random() * 1_000_000) + 1;
    }

    return { createDeck, shuffle, dailySeed, randomSeed };
  })();

  /* ════════════════════════════════════════
     GAME STATE MODULE
  ════════════════════════════════════════ */
  const GameStateModule = (() => {
    let state = null;

    function createInitialState(seed) {
      const deck     = DeckModule.createDeck();
      const shuffled = DeckModule.shuffle(deck, seed);

      // Deal: 8 columns, first 4 get 7 cards, last 4 get 6
      const tableau = Array.from({ length: 8 }, () => []);
      shuffled.forEach((card, i) => {
        tableau[i % 8].push(card);
      });

      return {
        seed,
        tableau,
        freeCells:   [null, null, null, null],
        foundations: [[], [], [], []],   // indexed by suit: spades=0, hearts=1, diamonds=2, clubs=3
        history:     [],
        moves:       0,
        startTime:   Date.now(),
        elapsed:     0,
        timerActive: true,
        won:         false,
        gameOver:    false,
        autoFoundation: true,
      };
    }

    function getState()  { return state; }

    function setState(s) { state = s; }

    function newGame(seed) {
      state = createInitialState(seed);
      return state;
    }

    // Deep clone state for history (JSON is fast enough for card objects)
    function cloneState() {
      return JSON.parse(JSON.stringify({
        tableau:     state.tableau,
        freeCells:   state.freeCells,
        foundations: state.foundations,
        moves:       state.moves,
        elapsed:     state.elapsed,
      }));
    }

    function pushHistory() {
      state.history.push(cloneState());
      if (state.history.length > 100) state.history.shift();
    }

    function undo() {
      if (!state || state.history.length === 0) return false;
      const prev = state.history.pop();
      state.tableau     = prev.tableau;
      state.freeCells   = prev.freeCells;
      state.foundations = prev.foundations;
      state.moves       = prev.moves;
      state.elapsed     = prev.elapsed;
      state.won         = false;
      state.gameOver    = false;
      return true;
    }

    function isWon() {
      return state.foundations.every(f => f.length === 13);
    }

    return { getState, setState, newGame, pushHistory, undo, isWon };
  })();

  /* ════════════════════════════════════════
     MOVE VALIDATION MODULE
  ════════════════════════════════════════ */
  const MoveValidationModule = (() => {
    function isRed(card)   { return card.isRed; }
    function oppColor(a, b){ return isRed(a) !== isRed(b); }

    // Foundation: must be same suit, next rank (A first)
    function canMoveToFoundation(card, foundation) {
      if (!card) return false;
      // Determine foundation slot by suit index
      const suitIdx = CONFIG.SUITS.indexOf(card.suit);
      const found   = foundation[suitIdx];
      if (found.length === 0) return card.value === 1; // Ace
      return found[found.length - 1].value === card.value - 1;
    }

    // Freecell: must be empty
    function canMoveToFreeCell(card, freeCells) {
      return freeCells.some(fc => fc === null);
    }

    // Tableau: target column must be empty OR top card is opposite color and one rank higher
    function canMoveToTableau(card, targetCol) {
      if (targetCol.length === 0) return true;
      const top = targetCol[targetCol.length - 1];
      return oppColor(card, top) && top.value === card.value + 1;
    }

    // Supermove: number of cards we can move at once
    // = (freeCells + 1) * 2^(emptyColumns) — but exclude current source if empty
    function maxMovableCards(state, targetColIdx) {
      const freeCellsEmpty = state.freeCells.filter(f => f === null).length;
      const emptyTableau   = state.tableau.filter((col, i) => col.length === 0 && i !== targetColIdx).length;
      return (freeCellsEmpty + 1) * Math.pow(2, emptyTableau);
    }

    // Check if a sequence of cards forms a valid alternating sequence
    function isValidSequence(cards) {
      for (let i = 1; i < cards.length; i++) {
        if (!oppColor(cards[i - 1], cards[i])) return false;
        if (cards[i - 1].value !== cards[i].value + 1) return false;
      }
      return true;
    }

    // Returns the movable sequence from a column starting at index
    function getMovableSequence(col, fromIdx) {
      const seq = col.slice(fromIdx);
      if (!isValidSequence(seq)) return null;
      return seq;
    }

    function findFreeCellIndex(freeCells) {
      return freeCells.findIndex(fc => fc === null);
    }

    // Auto-foundation: find a card that can safely go to foundation
    function findAutoFoundation(state) {
      // Safe = both lower-rank opposite-color cards are on foundation
      function isSafe(card) {
        if (card.value <= 2) return true;
        // Check that opposite-color suit ranks are at least card.value - 1
        const minOpp = CONFIG.SUITS.reduce((min, suit, idx) => {
          const c = { suit, isRed: CONFIG.RED_SUITS.includes(suit) };
          if (isRed(c) !== isRed(card)) {
            const f = state.foundations[idx];
            return Math.min(min, f.length); // length = top rank value
          }
          return min;
        }, Infinity);
        return minOpp >= card.value - 1;
      }

      // Check free cells
      for (let i = 0; i < state.freeCells.length; i++) {
        const card = state.freeCells[i];
        if (card && canMoveToFoundation(card, state.foundations) && isSafe(card)) {
          return { source: 'freecell', index: i, card };
        }
      }
      // Check tableau tops
      for (let i = 0; i < state.tableau.length; i++) {
        const col  = state.tableau[i];
        if (col.length === 0) continue;
        const card = col[col.length - 1];
        if (canMoveToFoundation(card, state.foundations) && isSafe(card)) {
          return { source: 'tableau', index: i, card };
        }
      }
      return null;
    }

    return {
      canMoveToFoundation,
      canMoveToFreeCell,
      canMoveToTableau,
      maxMovableCards,
      isValidSequence,
      getMovableSequence,
      findFreeCellIndex,
      findAutoFoundation,
    };
  })();

  /* ════════════════════════════════════════
     STORAGE MODULE
  ════════════════════════════════════════ */
  const StorageModule = (() => {
    function save(state) {
      try {
        const s = {
          seed:        state.seed,
          tableau:     state.tableau,
          freeCells:   state.freeCells,
          foundations: state.foundations,
          moves:       state.moves,
          elapsed:     state.elapsed + (state.timerActive ? Date.now() - state.startTime : 0),
          won:         state.won,
          gameOver:    state.gameOver,
          autoFoundation: state.autoFoundation,
          savedAt:     Date.now(),
        };
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(s));
      } catch (e) { /* quota exceeded etc. */ }
    }

    function load() {
      try {
        const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) { return null; }
    }

    function saveHighscore(moves, time) {
      try {
        const cur = loadHighscore();
        const hs  = {
          moves: (cur && cur.moves < moves) ? cur.moves : moves,
          time:  (cur && cur.time  < time)  ? cur.time  : time,
          date:  Date.now(),
        };
        localStorage.setItem(CONFIG.HS_KEY, JSON.stringify(hs));
        return hs;
      } catch (e) { return null; }
    }

    function loadHighscore() {
      try {
        const raw = localStorage.getItem(CONFIG.HS_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }

    function loadStats() {
      try {
        const raw = localStorage.getItem(CONFIG.STATS_KEY);
        return raw ? JSON.parse(raw) : { played: 0, won: 0, streak: 0, bestStreak: 0 };
      } catch (e) { return { played: 0, won: 0, streak: 0, bestStreak: 0 }; }
    }

    function saveStats(stats) {
      try {
        localStorage.setItem(CONFIG.STATS_KEY, JSON.stringify(stats));
      } catch (e) {}
    }

    function clearSave() {
      try { localStorage.removeItem(CONFIG.STORAGE_KEY); } catch (e) {}
    }

    return { save, load, saveHighscore, loadHighscore, loadStats, saveStats, clearSave };
  })();

  /* ════════════════════════════════════════
     RENDER MODULE
  ════════════════════════════════════════ */
  const RenderModule = (() => {
    // Card HTML
    function cardEl(card, opts = {}) {
      if (!card) return '';
      const { draggable = false, idx = 0, source = '', sourceIdx = 0, fanned = false, topOnly = false } = opts;
      const colorClass = card.isRed ? 'card--red' : 'card--black';
      const rankDisp   = card.rank;
      const suitDisp   = card.suit;

      return `<div class="card ${colorClass}"
        data-card-id="${card.id}"
        data-rank="${card.rank}"
        data-suit="${card.suit}"
        data-value="${card.value}"
        data-source="${source}"
        data-source-idx="${sourceIdx}"
        data-card-idx="${idx}"
        ${draggable ? 'draggable="true"' : ''}
        role="button"
        tabindex="0"
        aria-label="${rankDisp} ${suitName(card.suit)} (${card.isRed ? 'Rot' : 'Schwarz'})"
      >
        <span class="card__rank">${rankDisp}</span>
        <span class="card__suit">${suitDisp}</span>
        <span class="card__rank card__rank--br">${rankDisp}</span>
      </div>`;
    }

    function suitName(s) {
      const names = { '♠':'Pik', '♥':'Herz', '♦':'Karo', '♣':'Kreuz' };
      return names[s] || s;
    }

    function suitClass(s) {
      const map = { '♠':'spades', '♥':'hearts', '♦':'diamonds', '♣':'clubs' };
      return map[s] || '';
    }

    function renderFreeCells(state) {
      const el = document.getElementById('freecells');
      if (!el) return;
      let html = '';
      state.freeCells.forEach((card, i) => {
        html += `<div class="cell freecell${card ? ' freecell--filled' : ' freecell--empty'}"
          data-zone="freecell"
          data-zone-idx="${i}"
          aria-label="Freie Zelle ${i + 1}${card ? ': ' + card.rank + ' ' + card.suit : ' (leer)'}">
          ${card ? cardEl(card, { draggable: true, source: 'freecell', sourceIdx: i, idx: 0 }) : ''}
        </div>`;
      });
      el.innerHTML = html;
    }

    function renderFoundations(state) {
      const el = document.getElementById('foundations');
      if (!el) return;
      let html = '';
      CONFIG.SUITS.forEach((suit, i) => {
        const pile = state.foundations[i];
        const top  = pile.length ? pile[pile.length - 1] : null;
        html += `<div class="cell foundation foundation--${suitClass(suit)}${top ? ' foundation--filled' : ''}"
          data-zone="foundation"
          data-zone-idx="${i}"
          data-suit="${suit}"
          aria-label="Ablage ${suitName(suit)}${top ? ': ' + top.rank : ' (leer)'}">
          ${top
            ? cardEl(top, { draggable: false, source: 'foundation', sourceIdx: i })
            : `<span class="cell__hint">${suit}</span>`}
        </div>`;
      });
      el.innerHTML = html;
    }

    function renderTableau(state) {
      const el = document.getElementById('tableau');
      if (!el) return;
      let html = '';
      state.tableau.forEach((col, ci) => {
        html += `<div class="tableau-col" data-zone="tableau" data-zone-idx="${ci}" aria-label="Spalte ${ci + 1}">`;
        if (col.length === 0) {
          html += `<div class="tableau-col__empty" aria-label="Leere Spalte"></div>`;
        } else {
          col.forEach((card, ri) => {
            const isTop   = ri === col.length - 1;
            const isDraggable = isTop || MoveValidationModule.isValidSequence(col.slice(ri));
            html += `<div class="tableau-card-wrapper${isDraggable ? ' draggable-group' : ''}"
              style="--stack-idx:${ri}"
              data-zone="tableau"
              data-zone-idx="${ci}"
              data-card-idx="${ri}">
              ${cardEl(card, { draggable: isDraggable, source: 'tableau', sourceIdx: ci, idx: ri })}
            </div>`;
          });
        }
        html += `</div>`;
      });
      el.innerHTML = html;
    }

    function renderStats(state) {
      const movesEl = document.getElementById('stat-moves');
      const timeEl  = document.getElementById('stat-time');
      if (movesEl) movesEl.textContent = state.moves;
      if (timeEl)  timeEl.textContent  = formatTime(getCurrentElapsed(state));
    }

    function getCurrentElapsed(state) {
      if (!state.timerActive) return state.elapsed;
      return state.elapsed + (Date.now() - state.startTime);
    }

    function formatTime(ms) {
      const s   = Math.floor(ms / 1000);
      const min = Math.floor(s / 60);
      const sec = s % 60;
      return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    function renderAll(state) {
      renderFreeCells(state);
      renderFoundations(state);
      renderTableau(state);
      renderStats(state);
    }

    function highlightDropTarget(el, valid) {
      el.classList.remove('drop-valid', 'drop-invalid');
      if (valid === true)  el.classList.add('drop-valid');
      if (valid === false) el.classList.add('drop-invalid');
    }

    function clearDropHighlights() {
      document.querySelectorAll('.drop-valid, .drop-invalid').forEach(el => {
        el.classList.remove('drop-valid', 'drop-invalid');
      });
    }

    function showWinScreen(moves, time, hs) {
      const el = document.getElementById('win-dialog-scrim');
      if (!el) return;
      const movesEl = el.querySelector('.win__moves');
      const timeEl  = el.querySelector('.win__time');
      const hsEl    = el.querySelector('.win__hs');
      if (movesEl) movesEl.textContent = moves;
      if (timeEl)  timeEl.textContent  = formatTime(time);
      if (hsEl && hs) hsEl.textContent = `Bestzeit: ${formatTime(hs.time)} · Beste Züge: ${hs.moves}`;
      el.classList.add('show');
      el.setAttribute('aria-hidden', 'false');
      triggerConfetti();
    }

    function hideWinScreen() {
      const el = document.getElementById('win-dialog-scrim');
      if (!el) return;
      el.classList.remove('show');
      el.setAttribute('aria-hidden', 'true');
    }

    function showStatsDialog() {
      const el = document.getElementById('stats-dialog-scrim');
      if (!el) return;
      const stats = StorageModule.loadStats();
      const hs    = StorageModule.loadHighscore();
      const sEl   = el.querySelector('.stats__body');
      if (sEl) {
        sEl.innerHTML = `
          <div class="stats-grid">
            <div class="stats-item"><span class="stats-item__val">${stats.played}</span><span class="stats-item__lbl">Gespielt</span></div>
            <div class="stats-item"><span class="stats-item__val">${stats.won}</span><span class="stats-item__lbl">Gewonnen</span></div>
            <div class="stats-item"><span class="stats-item__val">${stats.played > 0 ? Math.round(stats.won / stats.played * 100) : 0}%</span><span class="stats-item__lbl">Gewinnrate</span></div>
            <div class="stats-item"><span class="stats-item__val">${stats.bestStreak}</span><span class="stats-item__lbl">Best Streak</span></div>
            ${hs ? `<div class="stats-item"><span class="stats-item__val">${formatTime(hs.time)}</span><span class="stats-item__lbl">Bestzeit</span></div>` : ''}
            ${hs ? `<div class="stats-item"><span class="stats-item__val">${hs.moves}</span><span class="stats-item__lbl">Wenigste Züge</span></div>` : ''}
          </div>`;
      }
      el.classList.add('show');
      el.setAttribute('aria-hidden', 'false');
    }

    function hideStatsDialog() {
      const el = document.getElementById('stats-dialog-scrim');
      if (!el) return;
      el.classList.remove('show');
      el.setAttribute('aria-hidden', 'true');
    }

    function triggerConfetti() {
      const canvas = document.getElementById('confetti-canvas');
      if (!canvas) return;
      canvas.style.display = 'block';
      const ctx = canvas.getContext('2d');
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;

      const pieces = Array.from({ length: 120 }, () => ({
        x:  Math.random() * canvas.width,
        y:  -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        size: 8 + Math.random() * 8,
        color: ['#F57C00','#FFB74D','#FF8A65','#4CAF50','#2196F3','#E91E63'][Math.floor(Math.random() * 6)],
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.2,
      }));

      let frame;
      function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        pieces.forEach(p => {
          p.x  += p.vx;
          p.y  += p.vy;
          p.vy += 0.05;
          p.rot += p.rotV;
          if (p.y < canvas.height + 20) alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        });
        if (alive) {
          frame = requestAnimationFrame(animate);
        } else {
          canvas.style.display = 'none';
          cancelAnimationFrame(frame);
        }
      }
      animate();
    }

    return {
      renderAll, renderFreeCells, renderFoundations, renderTableau, renderStats,
      highlightDropTarget, clearDropHighlights,
      showWinScreen, hideWinScreen,
      showStatsDialog, hideStatsDialog,
      formatTime, getCurrentElapsed,
      cardEl,
    };
  })();

  /* ════════════════════════════════════════
     DRAG & DROP MODULE
  ════════════════════════════════════════ */
  const DragDropModule = (() => {
    let dragState = null;
    let ghostEl   = null;
    let touchStartX = 0, touchStartY = 0;

    // Find drop zone from point
    function getZoneFromPoint(x, y) {
      const zones = document.querySelectorAll('.cell, .tableau-col');
      for (const zone of zones) {
        const r = zone.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          return zone;
        }
      }
      return null;
    }

    function createGhost(cards, x, y) {
      ghostEl = document.createElement('div');
      ghostEl.className = 'drag-ghost';
      ghostEl.style.left = x + 'px';
      ghostEl.style.top  = y + 'px';

      cards.forEach((card, i) => {
        const el = document.createElement('div');
        el.className = `card ${card.isRed ? 'card--red' : 'card--black'} ghost-card`;
        el.style.top = (i * 28) + 'px';
        el.innerHTML = `<span class="card__rank">${card.rank}</span><span class="card__suit">${card.suit}</span>`;
        ghostEl.appendChild(el);
      });
      document.body.appendChild(ghostEl);
    }

    function moveGhost(x, y) {
      if (!ghostEl) return;
      ghostEl.style.left = (x - 30) + 'px';
      ghostEl.style.top  = (y - 20) + 'px';
    }

    function removeGhost() {
      if (ghostEl) { ghostEl.remove(); ghostEl = null; }
    }

    function getDragCards(source, sourceIdx, cardIdx, state) {
      if (source === 'freecell') {
        return [state.freeCells[sourceIdx]];
      }
      if (source === 'tableau') {
        return state.tableau[sourceIdx].slice(cardIdx);
      }
      return [];
    }

    function canDropOnZone(cards, zone, state) {
      const zoneType = zone.dataset.zone;
      const zoneIdx  = parseInt(zone.dataset.zoneIdx);
      if (!zoneType || isNaN(zoneIdx)) return false;

      if (zoneType === 'foundation') {
        if (cards.length !== 1) return false;
        return MoveValidationModule.canMoveToFoundation(cards[0], state.foundations);
      }
      if (zoneType === 'freecell') {
        if (cards.length !== 1) return false;
        return state.freeCells[zoneIdx] === null;
      }
      if (zoneType === 'tableau') {
        const targetCol = state.tableau[zoneIdx];
        if (!MoveValidationModule.canMoveToTableau(cards[0], targetCol)) return false;
        const max = MoveValidationModule.maxMovableCards(state, zoneIdx);
        return cards.length <= max;
      }
      return false;
    }

    // ── HTML5 Drag & Drop ──────────────────────
    function onDragStart(e) {
      const cardEl = e.target.closest('[data-card-id]');
      if (!cardEl) return;

      const source    = cardEl.dataset.source;
      const sourceIdx = parseInt(cardEl.dataset.sourceIdx);
      const cardIdx   = parseInt(cardEl.dataset.cardIdx);
      const state     = GameStateModule.getState();
      if (!state || state.won || state.gameOver) return;

      const cards = getDragCards(source, sourceIdx, cardIdx, state);
      if (!cards || cards.length === 0) return;

      dragState = { source, sourceIdx, cardIdx, cards };
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', cardEl.dataset.cardId);

      // Semi-transparent drag image
      const ghost = document.createElement('div');
      ghost.style.position = 'absolute';
      ghost.style.top = '-1000px';
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      setTimeout(() => ghost.remove(), 0);

      cardEl.closest('.tableau-card-wrapper, .freecell, .foundation')?.classList.add('dragging');
    }

    function onDragOver(e) {
      e.preventDefault();
      if (!dragState) return;
      const zone = e.target.closest('[data-zone]');
      if (!zone) return;
      const state = GameStateModule.getState();
      const valid = canDropOnZone(dragState.cards, zone, state);
      e.dataTransfer.dropEffect = valid ? 'move' : 'none';
      RenderModule.clearDropHighlights();
      RenderModule.highlightDropTarget(zone, valid);
    }

    function onDragLeave(e) {
      const zone = e.target.closest('[data-zone]');
      if (zone && !zone.contains(e.relatedTarget)) {
        zone.classList.remove('drop-valid', 'drop-invalid');
      }
    }

    function onDrop(e) {
      e.preventDefault();
      RenderModule.clearDropHighlights();
      if (!dragState) return;
      const zone = e.target.closest('[data-zone]');
      if (!zone) return;
      const state = GameStateModule.getState();
      if (canDropOnZone(dragState.cards, zone, state)) {
        executeMove(dragState, zone.dataset.zone, parseInt(zone.dataset.zoneIdx), state);
      }
      dragState = null;
      document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    }

    function onDragEnd() {
      RenderModule.clearDropHighlights();
      document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
      dragState = null;
    }

    // ── Touch Support ──────────────────────────
    function onTouchStart(e) {
      const cardEl = e.target.closest('[data-card-id]');
      if (!cardEl) return;

      const source    = cardEl.dataset.source;
      const sourceIdx = parseInt(cardEl.dataset.sourceIdx);
      const cardIdx   = parseInt(cardEl.dataset.cardIdx);
      const state     = GameStateModule.getState();
      if (!state || state.won || state.gameOver) return;

      const cards = getDragCards(source, sourceIdx, cardIdx, state);
      if (!cards || cards.length === 0) return;

      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;

      dragState = { source, sourceIdx, cardIdx, cards };
      createGhost(cards, t.clientX, t.clientY);
      cardEl.closest('.tableau-card-wrapper, .freecell')?.classList.add('dragging');
      e.preventDefault();
    }

    function onTouchMove(e) {
      if (!dragState) return;
      const t = e.touches[0];
      moveGhost(t.clientX, t.clientY);

      const zone = getZoneFromPoint(t.clientX, t.clientY);
      RenderModule.clearDropHighlights();
      if (zone) {
        const state = GameStateModule.getState();
        const valid = canDropOnZone(dragState.cards, zone, state);
        RenderModule.highlightDropTarget(zone, valid);
      }
      e.preventDefault();
    }

    function onTouchEnd(e) {
      removeGhost();
      RenderModule.clearDropHighlights();
      if (!dragState) return;

      const t    = e.changedTouches[0];
      const zone = getZoneFromPoint(t.clientX, t.clientY);
      if (zone) {
        const state = GameStateModule.getState();
        if (canDropOnZone(dragState.cards, zone, state)) {
          executeMove(dragState, zone.dataset.zone, parseInt(zone.dataset.zoneIdx), state);
        }
      }
      document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
      dragState = null;
    }

    // ── Execute a valid move ───────────────────
    function executeMove(drag, targetZone, targetIdx, state) {
      GameStateModule.pushHistory();

      const { source, sourceIdx, cardIdx, cards } = drag;

      // Remove cards from source
      if (source === 'freecell') {
        state.freeCells[sourceIdx] = null;
      } else if (source === 'tableau') {
        state.tableau[sourceIdx].splice(cardIdx);
      }

      // Place cards at target
      if (targetZone === 'foundation') {
        cards.forEach(card => state.foundations[CONFIG.SUITS.indexOf(card.suit)].push(card));
      } else if (targetZone === 'freecell') {
        state.freeCells[targetIdx] = cards[0];
      } else if (targetZone === 'tableau') {
        cards.forEach(card => state.tableau[targetIdx].push(card));
      }

      state.moves++;
      UIControllerModule.afterMove();
    }

    function init() {
      const board = document.getElementById('game-board');
      if (!board) return;

      // HTML5 Drag & Drop
      board.addEventListener('dragstart',  onDragStart);
      board.addEventListener('dragover',   onDragOver);
      board.addEventListener('dragleave',  onDragLeave);
      board.addEventListener('drop',       onDrop);
      board.addEventListener('dragend',    onDragEnd);

      // Touch
      board.addEventListener('touchstart', onTouchStart, { passive: false });
      board.addEventListener('touchmove',  onTouchMove,  { passive: false });
      board.addEventListener('touchend',   onTouchEnd,   { passive: true });
    }

    return { init, canDropOnZone, executeMove, getDragCards };
  })();

  /* ════════════════════════════════════════
     CLICK-TO-MOVE (keyboard & click)
  ════════════════════════════════════════ */
  const ClickMoveModule = (() => {
    let selected = null; // { source, sourceIdx, cardIdx, cards }

    function clearSelection() {
      selected = null;
      document.querySelectorAll('.card--selected').forEach(el => el.classList.remove('card--selected'));
      document.querySelectorAll('.drop-hint').forEach(el => el.classList.remove('drop-hint'));
    }

    function selectCard(cardEl) {
      clearSelection();
      const source    = cardEl.dataset.source;
      const sourceIdx = parseInt(cardEl.dataset.sourceIdx);
      const cardIdx   = parseInt(cardEl.dataset.cardIdx);
      const state     = GameStateModule.getState();

      const cards = DragDropModule.getDragCards(source, sourceIdx, cardIdx, state);
      if (!cards || cards.length === 0) return;

      // Validate sequence
      if (source === 'tableau' && !MoveValidationModule.isValidSequence(cards)) return;

      selected = { source, sourceIdx, cardIdx, cards };
      cardEl.classList.add('card--selected');

      // Highlight valid drops
      document.querySelectorAll('[data-zone]').forEach(zone => {
        if (DragDropModule.canDropOnZone(cards, zone, state)) {
          zone.classList.add('drop-hint');
        }
      });
    }

    function handleClick(e) {
      const cardEl  = e.target.closest('[data-card-id]');
      const zoneEl  = e.target.closest('[data-zone]');
      const state   = GameStateModule.getState();
      if (!state || state.won || state.gameOver) return;

      if (cardEl && selected) {
        // Clicking another card — try to move there (treat as drop on its column)
        const targetZone    = cardEl.dataset.source === 'tableau' ? 'tableau' : cardEl.dataset.source;
        const targetZoneIdx = parseInt(cardEl.dataset.sourceIdx);
        const zone = document.querySelector(`[data-zone="${targetZone}"][data-zone-idx="${targetZoneIdx}"]`);
        if (zone && DragDropModule.canDropOnZone(selected.cards, zone, state)) {
          DragDropModule.executeMove(selected, targetZone, targetZoneIdx, state);
          clearSelection();
          return;
        } else {
          clearSelection();
          // If clicked own card, deselect. Otherwise try to select new card
          if (!(cardEl.dataset.source === selected.source &&
                parseInt(cardEl.dataset.sourceIdx) === selected.sourceIdx &&
                parseInt(cardEl.dataset.cardIdx) === selected.cardIdx)) {
            selectCard(cardEl);
          }
          return;
        }
      }

      if (zoneEl && selected && !cardEl) {
        const targetZone    = zoneEl.dataset.zone;
        const targetZoneIdx = parseInt(zoneEl.dataset.zoneIdx);
        if (DragDropModule.canDropOnZone(selected.cards, zoneEl, state)) {
          DragDropModule.executeMove(selected, targetZone, targetZoneIdx, state);
          clearSelection();
          return;
        }
        clearSelection();
        return;
      }

      if (cardEl) {
        // Double-click: auto-move to foundation or freecell
        if (e.type === 'dblclick') {
          autoMove(cardEl, state);
          return;
        }
        selectCard(cardEl);
        return;
      }

      clearSelection();
    }

    function autoMove(cardEl, state) {
      const source    = cardEl.dataset.source;
      const sourceIdx = parseInt(cardEl.dataset.sourceIdx);
      const cardIdx   = parseInt(cardEl.dataset.cardIdx);

      // Only top cards
      if (source === 'tableau' && cardIdx !== state.tableau[sourceIdx].length - 1) return;

      const cards = DragDropModule.getDragCards(source, sourceIdx, cardIdx, state);
      if (!cards || cards.length !== 1) return;
      const card = cards[0];

      // Try foundation first
      const suitIdx = CONFIG.SUITS.indexOf(card.suit);
      const foundationEl = document.querySelector(`[data-zone="foundation"][data-zone-idx="${suitIdx}"]`);
      if (foundationEl && DragDropModule.canDropOnZone(cards, foundationEl, state)) {
        DragDropModule.executeMove({ source, sourceIdx, cardIdx, cards }, 'foundation', suitIdx, state);
        return;
      }

      // Try freecell
      const freeIdx = MoveValidationModule.findFreeCellIndex(state.freeCells);
      if (freeIdx !== -1) {
        const freecellEl = document.querySelector(`[data-zone="freecell"][data-zone-idx="${freeIdx}"]`);
        if (freecellEl) {
          DragDropModule.executeMove({ source, sourceIdx, cardIdx, cards }, 'freecell', freeIdx, state);
        }
      }
    }

    function init() {
      const board = document.getElementById('game-board');
      if (!board) return;
      board.addEventListener('click',    handleClick);
      board.addEventListener('dblclick', handleClick);
    }

    return { init, clearSelection };
  })();

  /* ════════════════════════════════════════
     TIMER MODULE
  ════════════════════════════════════════ */
  const TimerModule = (() => {
    let intervalId = null;

    function start() {
      const state = GameStateModule.getState();
      if (!state) return;
      state.startTime  = Date.now();
      state.timerActive = true;
      clearInterval(intervalId);
      intervalId = setInterval(() => {
        const s = GameStateModule.getState();
        if (!s) return;
        const timeEl = document.getElementById('stat-time');
        if (timeEl) {
          timeEl.textContent = RenderModule.formatTime(RenderModule.getCurrentElapsed(s));
        }
      }, 1000);
    }

    function stop() {
      clearInterval(intervalId);
      intervalId = null;
      const state = GameStateModule.getState();
      if (!state) return;
      state.elapsed    += Date.now() - state.startTime;
      state.timerActive = false;
    }

    function resume(state) {
      state.startTime  = Date.now();
      state.timerActive = true;
      clearInterval(intervalId);
      intervalId = setInterval(() => {
        const s = GameStateModule.getState();
        if (!s) return;
        const timeEl = document.getElementById('stat-time');
        if (timeEl) timeEl.textContent = RenderModule.formatTime(RenderModule.getCurrentElapsed(s));
      }, 1000);
    }

    function reset() {
      stop();
      const state = GameStateModule.getState();
      if (!state) return;
      state.elapsed    = 0;
      state.startTime  = Date.now();
      state.timerActive = true;
      start();
    }

    return { start, stop, resume, reset };
  })();

  /* ════════════════════════════════════════
     UI CONTROLLER MODULE
  ════════════════════════════════════════ */
  const UIControllerModule = (() => {
    let autoSaveTimeout = null;

    function afterMove() {
      const state = GameStateModule.getState();
      if (!state) return;

      // Auto-foundation
      if (state.autoFoundation) {
        let autoFound = null;
        let iterations = 0;
        do {
          autoFound = MoveValidationModule.findAutoFoundation(state);
          if (autoFound) {
            if (autoFound.source === 'freecell') {
              state.freeCells[autoFound.index] = null;
            } else {
              state.tableau[autoFound.index].pop();
            }
            state.foundations[CONFIG.SUITS.indexOf(autoFound.card.suit)].push(autoFound.card);
            state.moves++;
          }
          iterations++;
        } while (autoFound && iterations < 52);
      }

      RenderModule.renderAll(state);

      // Check win
      if (GameStateModule.isWon()) {
        state.won = true;
        TimerModule.stop();
        StorageModule.clearSave();
        const elapsed = state.elapsed;
        const hs      = StorageModule.saveHighscore(state.moves, elapsed);

        // Update stats
        const stats = StorageModule.loadStats();
        stats.played++;
        stats.won++;
        stats.streak++;
        stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
        StorageModule.saveStats(stats);

        setTimeout(() => RenderModule.showWinScreen(state.moves, elapsed, hs), 600);
        return;
      }

      // Auto-save
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => StorageModule.save(state), 500);
    }

    function newGame(seed) {
      TimerModule.stop();
      RenderModule.hideWinScreen();
      ClickMoveModule.clearSelection();

      const s = GameStateModule.newGame(seed !== undefined ? seed : DeckModule.randomSeed());
      RenderModule.renderAll(s);
      TimerModule.start();

      // Stats
      const stats = StorageModule.loadStats();
      stats.played++;
      stats.streak = 0; // reset on new game start (won increments)
      // We only count played when the game ends, so we handle it on win
      // Actually let's count on new game start instead
      StorageModule.saveStats(stats);
    }

    function restartGame() {
      const state = GameStateModule.getState();
      if (!state) return;
      const seed = state.seed;
      newGame(seed);
    }

    function dailyChallenge() {
      const seed = DeckModule.dailySeed();
      newGame(seed);
      // Show toast
      showToast(`Tages-Challenge: ${new Date().toLocaleDateString('de-DE')}`);
    }

    function undoMove() {
      if (GameStateModule.undo()) {
        RenderModule.renderAll(GameStateModule.getState());
        ClickMoveModule.clearSelection();
      }
    }

    function toggleDarkMode() {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('fc_dark', isDark ? '1' : '0');
      const btn = document.getElementById('btn-dark');
      if (btn) btn.setAttribute('aria-pressed', String(isDark));
    }

    function toggleAutoFoundation() {
      const state = GameStateModule.getState();
      if (!state) return;
      state.autoFoundation = !state.autoFoundation;
      const btn = document.getElementById('btn-auto-found');
      if (btn) btn.setAttribute('aria-pressed', String(state.autoFoundation));
    }

    function showToast(msg, duration = 2500) {
      let toast = document.getElementById('toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.classList.add('toast--visible');
      clearTimeout(toast._timeout);
      toast._timeout = setTimeout(() => toast.classList.remove('toast--visible'), duration);
    }

    function shareResult() {
      const state = GameStateModule.getState();
      if (!state) return;
      const time = RenderModule.formatTime(state.elapsed);
      const text = `Ich habe Freecell in ${state.moves} Zügen und ${time} gelöst! 🃏\nhttps://klickspiele.de/freecell`;
      if (navigator.share) {
        navigator.share({ title: 'Freecell', text, url: 'https://klickspiele.de/freecell' })
          .catch(() => {});
      } else {
        navigator.clipboard?.writeText(text).then(() => showToast('Ergebnis kopiert! 📋'));
      }
    }

    function init() {
      // Button bindings
      bindBtn('btn-new-game',   () => newGame());
      bindBtn('btn-restart',    restartGame);
      bindBtn('btn-undo',       undoMove);
      bindBtn('btn-daily',      dailyChallenge);
      bindBtn('btn-stats',      RenderModule.showStatsDialog);
      bindBtn('btn-dark',       toggleDarkMode);
      bindBtn('btn-auto-found', toggleAutoFoundation);
      bindBtn('btn-share',      shareResult);

      // Win dialog
      bindBtn('win-new-game', () => { RenderModule.hideWinScreen(); newGame(); });
      bindBtn('win-share',    shareResult);
      bindBtn('win-restart',  () => { RenderModule.hideWinScreen(); restartGame(); });

      // Stats dialog close
      document.querySelectorAll('[data-close-dialog]').forEach(btn => {
        btn.addEventListener('click', () => {
          RenderModule.hideStatsDialog();
          RenderModule.hideWinScreen();
        });
      });

      // Scrim click closes dialogs
      document.querySelectorAll('.dialog-scrim').forEach(scrim => {
        scrim.addEventListener('click', e => {
          if (e.target === scrim) {
            scrim.classList.remove('show');
            scrim.setAttribute('aria-hidden', 'true');
          }
        });
      });

      // Keyboard: Escape closes, Ctrl+Z undo
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          ClickMoveModule.clearSelection();
          document.querySelectorAll('.dialog-scrim.show').forEach(s => {
            s.classList.remove('show');
            s.setAttribute('aria-hidden', 'true');
          });
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          e.preventDefault();
          undoMove();
        }
      });

      // Dark mode init
      if (localStorage.getItem('fc_dark') === '1') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('btn-dark');
        if (btn) btn.setAttribute('aria-pressed', 'true');
      }

      // Auto-foundation toggle init
      const afBtn = document.getElementById('btn-auto-found');
      if (afBtn) afBtn.setAttribute('aria-pressed', 'true');
    }

    function bindBtn(id, fn) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    }

    return { afterMove, newGame, restartGame, undoMove, shareResult, init, showToast };
  })();

  /* ════════════════════════════════════════
     BOOTSTRAP
  ════════════════════════════════════════ */
  function init() {
    UIControllerModule.init();
    DragDropModule.init();
    ClickMoveModule.init();

    // Try to resume saved game
    const saved = StorageModule.load();
    if (saved && !saved.won && !saved.gameOver && saved.savedAt > Date.now() - 24 * 3600 * 1000) {
      const state = {
        seed:         saved.seed,
        tableau:      saved.tableau,
        freeCells:    saved.freeCells,
        foundations:  saved.foundations,
        moves:        saved.moves,
        elapsed:      saved.elapsed,
        startTime:    Date.now(),
        timerActive:  true,
        won:          false,
        gameOver:     false,
        history:      [],
        autoFoundation: saved.autoFoundation !== undefined ? saved.autoFoundation : true,
      };
      GameStateModule.setState(state);
      RenderModule.renderAll(state);
      TimerModule.resume(state);
      UIControllerModule.showToast('Spiel fortgesetzt 🃏');
    } else {
      UIControllerModule.newGame();
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
