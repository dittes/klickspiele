/**
 * game.js – Zahlenjagd · klickspiele.de
 * ─────────────────────────────────────────────────────────────────
 * Modules (strict separation of concerns):
 *  1. Config          – all constants & tuning
 *  2. GameState       – single source of truth
 *  3. NumberGenerator – RNG, grids, math equations
 *  4. Timer           – rAF-based countdown / countup
 *  5. Scoring         – points, combos, bonuses
 *  6. Storage         – localStorage helpers
 *  7. Animation       – confetti, cell fx, rAF loops
 *  8. Render          – all DOM writes (separated from logic)
 *  9. InputHandler    – event delegation, keyboard
 * 10. UIController    – orchestrator, game flow
 */
'use strict';

/* ═══════════════════════════════════════════════════════════
   1.  CONFIG
═══════════════════════════════════════════════════════════ */
const Config = (() => {
  const MODES = {
    order: {
      id: 'order', label: 'Reihenfolge', icon: '🔢', gridCols: 5,
      desc: 'Klicke die Zahlen 1–25 so schnell wie möglich in aufsteigender Reihenfolge.',
      countUp: true
    },
    time: {
      id: 'time', label: 'Zeitdruck', icon: '⏱️', gridCols: 5,
      desc: 'Klicke so viele Zahlen wie möglich in der richtigen Reihenfolge – bevor die Zeit abläuft!',
      countUp: false
    },
    math: {
      id: 'math', label: 'Kopfrechnen', icon: '🧮', gridCols: 4,
      desc: 'Eine Rechenaufgabe erscheint. Finde das richtige Ergebnis im Zahlenfeld und klicke es an.',
      countUp: false
    },
    flash: {
      id: 'flash', label: 'Grid-Jagd', icon: '⚡', gridCols: 5,
      desc: 'Zahlen erscheinen kurz und verschwinden. Merke dir die Position und klicke sie!',
      countUp: false
    }
  };

  const DIFFICULTIES = {
    easy:   { id: 'easy',   label: 'Leicht', timeLimit: 90,  flashMs: 1400, comboStep: 5, emoji: '😊' },
    normal: { id: 'normal', label: 'Normal', timeLimit: 60,  flashMs: 900,  comboStep: 3, emoji: '🎯' },
    hard:   { id: 'hard',   label: 'Schwer', timeLimit: 40,  flashMs: 450,  comboStep: 2, emoji: '🔥' }
  };

  const SCORE = {
    BASE:        100,
    WRONG:       -50,
    MAX_COMBO:   5,
    TIME_BONUS:  8,    // pts per remaining second
    ROUND_BONUS: 500   // order-mode completion bonus
  };

  const MATH_OPS = [
    { sym: '+', fn: (a,b) => a+b, rng: [1,15] },
    { sym: '−', fn: (a,b) => a-b, rng: [1,15], ok: (a,b) => a>b },
    { sym: '×', fn: (a,b) => a*b, rng: [2,9]  },
    { sym: '÷', fn: (a,b) => a/b, rng: [1,9],  ok: (a,b) => b>1 && a%b===0 }
  ];

  const GRID_SIZE = { 4: 16, 5: 25, 6: 36 };
  const HS_LIMIT  = 5;

  return Object.freeze({ MODES, DIFFICULTIES, SCORE, MATH_OPS, GRID_SIZE, HS_LIMIT });
})();


/* ═══════════════════════════════════════════════════════════
   2.  GAME STATE
═══════════════════════════════════════════════════════════ */
const GameState = (() => {
  let _s = {};

  function reset(mode, difficulty) {
    _s = {
      mode, difficulty,
      phase: 'playing',   // playing | paused | gameover
      score:       0,
      combo:       0,
      maxCombo:    0,
      streak:      0,
      errors:      0,
      correct:     0,
      rounds:      0,
      nextTarget:  1,
      timeElapsed: 0,
      timeRemaining: Config.DIFFICULTIES[difficulty].timeLimit,
      numbers:     [],
      foundSet:    new Set(),
      flashTarget: null,
      flashPhase:  'show',   // show | hide
      equation:    null,
      isNewRecord: false,
    };
    return _s;
  }

  function get()     { return _s; }
  function patch(o)  { Object.assign(_s, o); }

  return { reset, get, patch };
})();


/* ═══════════════════════════════════════════════════════════
   3.  NUMBER GENERATOR
═══════════════════════════════════════════════════════════ */
const NumberGenerator = (() => {
  /* Mulberry32 seeded PRNG */
  function mkRng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function dailySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
  }

  function shuffle(arr, rng = Math.random) {
    const a = arr.slice();
    for (let i = a.length-1; i > 0; i--) {
      const j = Math.floor(rng() * (i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function makeGrid(cols, daily = false) {
    const n = Config.GRID_SIZE[cols];
    const nums = Array.from({ length: n }, (_, i) => i+1);
    return shuffle(nums, daily ? mkRng(dailySeed()) : undefined);
  }

  function makeEquation() {
    const ops = Config.MATH_OPS;
    for (let tries = 0; tries < 60; tries++) {
      const op  = ops[Math.floor(Math.random() * ops.length)];
      const [lo, hi] = op.rng;
      const a   = Math.floor(Math.random() * (hi - lo + 1)) + lo;
      const b   = Math.floor(Math.random() * (hi - lo + 1)) + lo;
      if (op.ok && !op.ok(a, b)) continue;
      const ans = op.fn(a, b);
      if (ans < 1 || ans > 99 || !Number.isInteger(ans)) continue;
      return { a, b, sym: op.sym, ans, display: `${a} ${op.sym} ${b} = ?` };
    }
    return { a: 4, b: 3, sym: '+', ans: 7, display: '4 + 3 = ?' };
  }

  function mathGrid(answer, cols = 4) {
    const n   = Config.GRID_SIZE[cols];
    const set = new Set([answer]);
    for (let tries = 0; set.size < n && tries < 300; tries++) {
      const d = Math.floor(Math.random() * 98) + 1;
      if (d !== answer) set.add(d);
    }
    return shuffle([...set]);
  }

  return { makeGrid, makeEquation, mathGrid, dailySeed };
})();


/* ═══════════════════════════════════════════════════════════
   4.  TIMER
═══════════════════════════════════════════════════════════ */
const Timer = (() => {
  let raf = null, running = false, lastTs = null;
  let elapsed = 0, remaining = 0, countDown = false;
  let onTick = null, onEnd = null;

  function start(cfg) {
    stop();
    countDown  = !!cfg.countDown;
    remaining  = cfg.initial ?? 60;
    elapsed    = 0;
    onTick     = cfg.onTick ?? null;
    onEnd      = cfg.onEnd  ?? null;
    running    = true;
    lastTs     = null;
    raf = requestAnimationFrame(_tick);
  }

  function _tick(ts) {
    if (!running) return;
    if (lastTs === null) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;
    elapsed   += dt;
    remaining = Math.max(0, remaining - dt);
    onTick?.({ elapsed, remaining });
    if (countDown && remaining <= 0) { running = false; onEnd?.(); return; }
    raf = requestAnimationFrame(_tick);
  }

  function stop()   { running = false; if (raf) { cancelAnimationFrame(raf); raf = null; } }
  function pause()  { running = false; }
  function resume() {
    if (!running) { running = true; lastTs = null; raf = requestAnimationFrame(_tick); }
  }

  return { start, stop, pause, resume };
})();


/* ═══════════════════════════════════════════════════════════
   5.  SCORING
═══════════════════════════════════════════════════════════ */
const Scoring = (() => {
  function combo(streak, step) {
    return Math.min(Config.SCORE.MAX_COMBO, Math.floor(streak / step) + 1);
  }

  function correct(state) {
    const step   = Config.DIFFICULTIES[state.difficulty].comboStep;
    state.streak = (state.streak || 0) + 1;
    state.combo  = combo(state.streak, step);
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.correct++;
    const pts = Config.SCORE.BASE * state.combo;
    state.score = Math.max(0, state.score + pts);
    return { pts, mult: state.combo };
  }

  function wrong(state) {
    state.streak = 0;
    state.combo  = 0;
    state.errors++;
    state.score  = Math.max(0, state.score + Config.SCORE.WRONG);
  }

  function timeBonus(remaining) {
    return Math.max(0, Math.round(remaining)) * Config.SCORE.TIME_BONUS;
  }

  function fmt(n) {
    return n.toLocaleString('de-DE');
  }

  function accuracy(correct, errors) {
    const total = correct + errors;
    if (!total) return '—';
    return Math.round((correct / total) * 100) + '%';
  }

  return { correct, wrong, timeBonus, fmt, accuracy };
})();


/* ═══════════════════════════════════════════════════════════
   6.  STORAGE
═══════════════════════════════════════════════════════════ */
const Storage = (() => {
  const P = 'zj2_';

  function _key(sfx)           { return P + sfx; }
  function _get(k, fb = null)  { try { return JSON.parse(localStorage.getItem(_key(k))); } catch { return fb; } }
  function _set(k, v)          { try { localStorage.setItem(_key(k), JSON.stringify(v)); } catch {} }

  function getHS(mode, diff)   { return _get(`hs_${mode}_${diff}`) || []; }
  function saveHS(mode, diff, entry) {
    const list = getHS(mode, diff);
    list.push(entry);
    list.sort((a,b) => b.score - a.score);
    list.splice(Config.HS_LIMIT);
    _set(`hs_${mode}_${diff}`, list);
    // Is entry still in list and in top 1?
    return list[0]?.score === entry.score;
  }
  function isRecord(mode, diff, score) {
    const list = getHS(mode, diff);
    if (list.length < Config.HS_LIMIT) return true;
    return score > (list[list.length - 1]?.score ?? 0);
  }

  function getStats(mode) {
    return _get(`st_${mode}`) || { games: 0, best: 0, totalCorrect: 0 };
  }
  function updateStats(mode, { score, correct }) {
    const s = getStats(mode);
    s.games++;
    s.best = Math.max(s.best, score);
    s.totalCorrect = (s.totalCorrect || 0) + correct;
    _set(`st_${mode}`, s);
  }

  function getDark()    { return _get('dark') === true; }
  function setDark(v)   { _set('dark', !!v); }
  function getLastMode(){ return _get('lmode') || 'order'; }
  function setLastMode(m){ _set('lmode', m); }
  function getLastDiff(){ return _get('ldiff') || 'normal'; }
  function setLastDiff(d){ _set('ldiff', d); }

  return { getHS, saveHS, isRecord, getStats, updateStats, getDark, setDark, getLastMode, setLastMode, getLastDiff, setLastDiff };
})();


/* ═══════════════════════════════════════════════════════════
   7.  ANIMATION
═══════════════════════════════════════════════════════════ */
const Animation = (() => {
  let cvs, ctx, particles = [], rafId = null;

  function init() {
    cvs = document.getElementById('zj-cv');
    ctx = cvs ? cvs.getContext('2d') : null;
  }

  function confetti() {
    if (!cvs || !ctx) return;
    cvs.style.display = 'block';
    cvs.width  = window.innerWidth;
    cvs.height = window.innerHeight;
    const palette = ['#F57C00','#FFE0B2','#FF9800','#FFB74D','#FFF3E0','#4A4A4A'];
    particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * cvs.width,
      y: -20 - Math.random() * 100,
      w: 7 + Math.random() * 7,
      h: 4 + Math.random() * 4,
      color: palette[Math.floor(Math.random() * palette.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: 2.5 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      drot: (Math.random() - 0.5) * 0.15
    }));
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(_drawConfetti);
    setTimeout(stopConfetti, 3200);
  }

  function _drawConfetti() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    particles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.drot;
      if (p.y > cvs.height + 20) { p.y = -20; p.x = Math.random() * cvs.width; }
    });
    rafId = requestAnimationFrame(_drawConfetti);
  }

  function stopConfetti() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (cvs) cvs.style.display = 'none';
  }

  // Burst of particles from a cell (click feedback)
  function cellBurst(cellEl) {
    const rect = cellEl.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top  + rect.height/2;
    for (let i = 0; i < 6; i++) {
      const dot = document.createElement('div');
      dot.style.cssText = `
        position:fixed;left:${cx}px;top:${cy}px;width:8px;height:8px;
        border-radius:50%;background:var(--c-primary);pointer-events:none;z-index:400;
        transform:translate(-50%,-50%);animation:dot-burst .5s ease forwards;
        --dx:${(Math.random()-0.5)*80}px;--dy:${(Math.random()-0.5)*80}px;
      `;
      document.body.appendChild(dot);
      dot.addEventListener('animationend', () => dot.remove());
    }
  }

  function pulse(el) {
    if (!el) return;
    el.classList.remove('anim-pulse');
    void el.offsetWidth;
    el.classList.add('anim-pulse');
    setTimeout(() => el.classList.remove('anim-pulse'), 400);
  }

  return { init, confetti, stopConfetti, cellBurst, pulse };
})();


/* ═══════════════════════════════════════════════════════════
   8.  RENDER
═══════════════════════════════════════════════════════════ */
const Render = (() => {
  let _cache = {};

  function init() {
    _cache = {
      score:         document.getElementById('hud-score'),
      timer:         document.getElementById('hud-timer'),
      comboBadge:    document.getElementById('combo-badge'),
      targetLabel:   document.getElementById('target-label'),
      targetVal:     document.getElementById('target-val'),
      grid:          document.getElementById('num-grid'),
      pauseOverlay:  document.getElementById('pause-overlay'),
      pauseBtn:      document.getElementById('btn-pause'),
      startDesc:     document.getElementById('start-mode-desc'),
      toast:         document.getElementById('zj-toast'),
      sStart:        document.getElementById('section-start'),
      sPlay:         document.getElementById('section-play'),
      sResult:       document.getElementById('section-result'),
    };
  }

  /* ── HUD ───────────────────────────────────────────── */
  function hud(state) {
    const { score, combo, timeRemaining, timeElapsed, mode } = state;
    if (_cache.score) _cache.score.textContent = Scoring.fmt(score);

    if (_cache.timer) {
      const isUp   = Config.MODES[mode]?.countUp;
      const secs   = isUp ? timeElapsed : timeRemaining;
      _cache.timer.textContent = _fmtTime(secs);
      _cache.timer.classList.toggle('warn', !isUp && timeRemaining <= 10 && timeRemaining > 0);
    }

    if (_cache.comboBadge) {
      const show = combo >= 2;
      _cache.comboBadge.hidden = !show;
      _cache.comboBadge.textContent = combo + '×';
    }
  }

  /* ── Target display ────────────────────────────────── */
  function target(state) {
    const { mode, nextTarget, equation, flashPhase, flashTarget } = state;
    let lbl = 'Finde', val = '';

    if (mode === 'math' && equation) {
      lbl = 'Berechne';
      val = equation.display;
    } else if (mode === 'flash') {
      if (flashPhase === 'show') {
        lbl = 'Merke dir alle Zahlen';
        val = '👁️';
      } else {
        lbl = 'Wo steht die';
        val = String(flashTarget) + ' ?';
      }
    } else {
      lbl  = 'Klicke die';
      val  = String(nextTarget);
    }

    if (_cache.targetLabel) _cache.targetLabel.textContent = lbl;
    if (_cache.targetVal)   _cache.targetVal.textContent   = val;
  }

  /* ── Grid ──────────────────────────────────────────── */
  function grid(state) {
    const g = _cache.grid;
    if (!g) return;
    const { numbers, mode, foundSet, flashPhase } = state;
    const cols  = Config.MODES[mode].gridCols;

    g.className = `zj-grid g${cols}`;
    g.setAttribute('aria-label', 'Zahlenraster');

    // Use fragment for performance
    const frag = document.createDocumentFragment();
    numbers.forEach((num, i) => {
      const btn = document.createElement('button');
      btn.className = 'zj-cell rpl';
      btn.dataset.idx = i;
      btn.dataset.val = num;
      btn.setAttribute('aria-label', `Zahl ${num}`);
      btn.setAttribute('tabindex', '0');

      if (foundSet.has(i)) {
        btn.classList.add('found');
        btn.setAttribute('aria-disabled', 'true');
        btn.textContent = num;
      } else if (mode === 'flash') {
        if (flashPhase === 'show') {
          btn.classList.add('flash-show');
          btn.textContent = num;
        } else {
          btn.classList.add('flash-hide');
          btn.textContent = '?';
        }
      } else {
        btn.textContent = num;
      }

      frag.appendChild(btn);
    });

    g.innerHTML = '';
    g.appendChild(frag);
  }

  /* ── Cell state ─────────────────────────────────────── */
  function cellFeedback(idx, type) {
    const cell = _cache.grid?.querySelector(`[data-idx="${idx}"]`);
    if (!cell) return;
    cell.classList.remove('correct', 'wrong');
    void cell.offsetWidth;
    cell.classList.add(type);
    setTimeout(() => {
      cell.classList.remove(type);
      if (type === 'correct') {
        cell.classList.add('found');
        cell.setAttribute('aria-disabled', 'true');
      }
    }, 380);
  }

  function cellFlashHide(cols, numbers) {
    const g = _cache.grid;
    if (!g) return;
    g.querySelectorAll('.zj-cell').forEach((btn, i) => {
      if (!btn.classList.contains('found')) {
        btn.classList.remove('flash-show');
        btn.classList.add('flash-hide');
        btn.textContent = '?';
      }
    });
  }

  /* ── Sections ───────────────────────────────────────── */
  function section(which) {
    // which: 'start' | 'play' | 'result'
    _cache.sStart?.toggleAttribute('hidden',  which !== 'start');
    _cache.sPlay?.toggleAttribute('hidden',   which !== 'play');
    _cache.sResult?.toggleAttribute('hidden', which !== 'result');
  }

  /* ── Result page ─────────────────────────────────────── */
  function result(state) {
    _set('result-score',   Scoring.fmt(state.score));
    _set('result-correct', state.correct);
    _set('result-errors',  state.errors);
    _set('result-accuracy', Scoring.accuracy(state.correct, state.errors));
    _set('result-maxcombo', state.maxCombo + '×');
    _set('result-time',    _fmtTime(state.timeElapsed));
    _set('result-rounds',  state.rounds);

    const rec = document.getElementById('result-record');
    if (rec) rec.hidden = !state.isNewRecord;

    highscores(state.mode, state.difficulty, 'hs-list');

    // Update result title emoji by mode
    const modeEmoji = { order:'🔢', time:'⏱️', math:'🧮', flash:'⚡' };
    _set('result-icon', modeEmoji[state.mode] || '🎯');
  }

  function highscores(mode, diff, listId = 'hs-list') {
    const el = document.getElementById(listId);
    if (!el) return;
    const list = Storage.getHS(mode, diff);
    if (!list.length) {
      el.innerHTML = '<li class="hs-empty">Noch kein Highscore – spiel los! 🚀</li>';
      return;
    }
    const medals = ['🥇','🥈','🥉'];
    el.innerHTML = list.map((e, i) => `
      <li class="hs-item">
        <span class="hs-rank">${medals[i] || '#'+(i+1)}</span>
        <span class="hs-score">${Scoring.fmt(e.score)}</span>
        <span class="hs-meta">${e.date} · ${e.elapsed}</span>
      </li>`
    ).join('');
  }

  /* ── Mode / Diff active states ─────────────────────── */
  function activateMode(id) {
    document.querySelectorAll('.mode-btn').forEach(b => {
      const on = b.dataset.mode === id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (_cache.startDesc) {
      _cache.startDesc.textContent = Config.MODES[id]?.desc || '';
    }
  }

  function activateDiff(id) {
    document.querySelectorAll('.diff-btn-zj').forEach(b => {
      const on = b.dataset.diff === id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* ── Toast ─────────────────────────────────────────── */
  let _toastTimer = null;
  function toast(msg, ms = 2200) {
    const el = _cache.toast;
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  /* ── Pause overlay ─────────────────────────────────── */
  function pauseOverlay(show) {
    _cache.pauseOverlay?.toggleAttribute('hidden', !show);
    if (_cache.pauseBtn) {
      _cache.pauseBtn.querySelector('.btn-icon-label').textContent = show ? 'Weiter' : 'Pause';
      _cache.pauseBtn.setAttribute('aria-label', show ? 'Spiel fortsetzen' : 'Spiel pausieren');
    }
  }

  /* ── Helpers ──────────────────────────────────────── */
  function _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function _fmtTime(s) {
    const t = Math.floor(Math.max(0, s ?? 0));
    return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
  }

  return { init, hud, target, grid, cellFeedback, cellFlashHide, section, result, highscores, activateMode, activateDiff, toast, pauseOverlay };
})();


/* ═══════════════════════════════════════════════════════════
   9.  INPUT HANDLER
═══════════════════════════════════════════════════════════ */
const InputHandler = (() => {
  let _cb = null;

  function init(cellClickCb) {
    _cb = cellClickCb;
    const grid = document.getElementById('num-grid');
    if (!grid) return;
    grid.addEventListener('click', _onClick);
    grid.addEventListener('keydown', _onKey);
  }

  function _onClick(e) {
    const cell = e.target.closest('.zj-cell');
    if (!cell || cell.classList.contains('found') || cell.getAttribute('aria-disabled') === 'true') return;
    _cb?.(+cell.dataset.idx, +cell.dataset.val, cell);
  }

  function _onKey(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const cell = e.target.closest('.zj-cell');
    if (!cell || cell.classList.contains('found')) return;
    e.preventDefault();
    _cb?.(+cell.dataset.idx, +cell.dataset.val, cell);
  }

  return { init };
})();


/* ═══════════════════════════════════════════════════════════
   10.  UI CONTROLLER  (orchestrator)
═══════════════════════════════════════════════════════════ */
const UIController = (() => {
  let mode = 'order';
  let diff = 'normal';
  let flashTimer   = null;
  let mathAnswers  = new Set();

  /* ── Bootstrap ────────────────────────────────────── */
  function init() {
    // Init sub-modules
    Render.init();
    Animation.init();
    InputHandler.init(_onCellClick);

    // Restore last session
    mode = Storage.getLastMode();
    diff = Storage.getLastDiff();
    if (Storage.getDark()) document.body.classList.add('dark-mode');

    // Bind buttons
    _on('btn-start',      'click', startGame);
    _on('btn-restart',    'click', startGame);
    _on('btn-play-again', 'click', startGame);
    _on('btn-pause',      'click', _togglePause);
    _on('btn-menu',       'click', _toMenu);
    _on('btn-back-menu',  'click', _toMenu);
    _on('btn-darkmode',   'click', _toggleDark);
    _on('btn-share',      'click', _share);
    _on('btn-daily',      'click', _startDaily);

    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(b => {
      b.addEventListener('click', () => {
        mode = b.dataset.mode;
        Storage.setLastMode(mode);
        Render.activateMode(mode);
        Render.highscores(mode, diff, 'start-hs-list');
      });
    });

    // Difficulty buttons
    document.querySelectorAll('.diff-btn-zj').forEach(b => {
      b.addEventListener('click', () => {
        diff = b.dataset.diff;
        Storage.setLastDiff(diff);
        Render.activateDiff(diff);
        Render.highscores(mode, diff, 'start-hs-list');
      });
    });

    // Ripple handler (shared)
    document.addEventListener('pointerdown', e => {
      const h = e.target.closest('.rpl');
      if (!h) return;
      const r = h.getBoundingClientRect();
      const sz = Math.max(r.width, r.height) * 2.4;
      const w  = document.createElement('span');
      w.className = 'rpl-wave';
      w.style.cssText = `width:${sz}px;height:${sz}px;left:${e.clientX-r.left-sz/2}px;top:${e.clientY-r.top-sz/2}px`;
      h.appendChild(w);
      w.addEventListener('animationend', () => w.remove());
    }, { passive: true });

    // Keyboard shortcut: Space = pause during play
    document.addEventListener('keydown', e => {
      const s = GameState.get();
      if (e.key === 'Escape' && (s.phase === 'playing' || s.phase === 'paused')) {
        _togglePause();
      }
    });

    // Initial render
    Render.activateMode(mode);
    Render.activateDiff(diff);
    Render.highscores(mode, diff, 'start-hs-list');
    Render.section('start');

    // Update dark-mode icon
    _updateDarkIcon();
  }

  /* ── Start game ───────────────────────────────────── */
  function startGame(daily = false) {
    mathAnswers.clear();
    clearTimeout(flashTimer);

    const state = GameState.reset(mode, diff);
    Render.section('play');
    Render.pauseOverlay(false);
    _setupRound(daily);

    const diffCfg = Config.DIFFICULTIES[diff];
    const modeCfg = Config.MODES[mode];

    Timer.start({
      countDown: !modeCfg.countUp,
      initial:   modeCfg.countUp ? 0 : diffCfg.timeLimit,
      onTick({ elapsed, remaining }) {
        GameState.patch({ timeElapsed: elapsed, timeRemaining: remaining });
        Render.hud(GameState.get());
      },
      onEnd() { _endGame(true); }
    });

    Render.hud(state);
  }

  function _startDaily() {
    mode = Storage.getLastMode();
    diff = 'normal';
    Render.activateDiff('normal');
    startGame(true);
    Render.toast('📅 Daily Challenge gestartet!');
  }

  /* ── Setup a round (or sub-round for math/flash) ─── */
  function _setupRound(daily = false) {
    const state = GameState.get();
    const { mode: m, difficulty: d } = state;
    const cols = Config.MODES[m].gridCols;

    if (m === 'math') {
      const eq  = NumberGenerator.makeEquation();
      const nums = NumberGenerator.mathGrid(eq.ans, cols);
      GameState.patch({ numbers: nums, equation: eq, foundSet: new Set() });

    } else if (m === 'flash') {
      const nums  = NumberGenerator.makeGrid(cols, daily);
      const tidx  = Math.floor(Math.random() * nums.length);
      const ftgt  = nums[tidx];
      GameState.patch({ numbers: nums, flashTarget: ftgt, flashPhase: 'show', foundSet: new Set() });
      _runFlash();

    } else {
      // order / time
      const existing = state.numbers.length > 0 && m === 'time';
      if (!existing || state.nextTarget > Config.GRID_SIZE[cols]) {
        const nums = NumberGenerator.makeGrid(cols, daily);
        GameState.patch({ numbers: nums, foundSet: new Set() });
        if (m === 'time') GameState.patch({ nextTarget: 1 });
      }
    }

    Render.grid(GameState.get());
    Render.target(GameState.get());
  }

  function _runFlash() {
    const state  = GameState.get();
    const flashMs = Config.DIFFICULTIES[state.difficulty].flashMs;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      if (GameState.get().phase !== 'playing') return;
      GameState.patch({ flashPhase: 'hide' });
      Render.cellFlashHide();
      Render.target(GameState.get());
    }, flashMs);
  }

  /* ── Cell click ───────────────────────────────────── */
  function _onCellClick(idx, val, cellEl) {
    const state = GameState.get();
    if (state.phase !== 'playing') return;
    const { mode: m } = state;

    const correct = (() => {
      if (m === 'order' || m === 'time') return val === state.nextTarget;
      if (m === 'math')  return state.equation && val === state.equation.ans;
      if (m === 'flash') return state.flashPhase === 'hide' && val === state.flashTarget;
      return false;
    })();

    if (correct) {
      const { pts, mult } = Scoring.correct(state);
      state.foundSet.add(idx);
      GameState.patch(state);

      Render.cellFeedback(idx, 'correct');
      Animation.cellBurst(cellEl);
      Animation.pulse(document.getElementById('hud-score'));

      if (mult >= 3) Render.toast(`🔥 ${mult}× Combo!`);

      Render.hud(state);
      Render.target(state);

      // Mode-specific next-step
      if (m === 'order') {
        const count = Config.GRID_SIZE[Config.MODES[m].gridCols];
        state.nextTarget++;
        GameState.patch({ nextTarget: state.nextTarget });
        if (state.nextTarget > count) {
          // All found → add bonus, end game
          state.score += Config.SCORE.ROUND_BONUS;
          state.rounds++;
          GameState.patch(state);
          Timer.stop();
          setTimeout(() => _endGame(false), 500);
          return;
        }
        Render.target(GameState.get());

      } else if (m === 'time') {
        const count = Config.GRID_SIZE[Config.MODES[m].gridCols];
        state.nextTarget++;
        state.rounds = Math.floor(state.correct / count);
        GameState.patch(state);
        if (state.nextTarget > count) {
          // Regenerate grid
          const cols = Config.MODES[m].gridCols;
          const nums = NumberGenerator.makeGrid(cols);
          GameState.patch({ numbers: nums, nextTarget: 1, foundSet: new Set() });
          Render.grid(GameState.get());
          Render.toast('⚡ Neue Runde!');
        }
        Render.target(GameState.get());

      } else if (m === 'math') {
        // Short delay then next equation
        setTimeout(() => {
          if (GameState.get().phase !== 'playing') return;
          mathAnswers.add(state.equation.ans);
          _setupRound();
        }, 450);

      } else if (m === 'flash') {
        state.rounds++;
        GameState.patch(state);
        setTimeout(() => {
          if (GameState.get().phase !== 'playing') return;
          _setupRound();
        }, 600);
      }

    } else {
      // Wrong click
      Scoring.wrong(state);
      GameState.patch(state);
      Render.cellFeedback(idx, 'wrong');
      Render.hud(state);
      // Flash score red briefly
      const sc = document.getElementById('hud-score');
      if (sc) { sc.style.color = 'var(--c-error)'; setTimeout(() => sc.style.color = '', 600); }
    }
  }

  /* ── Pause ────────────────────────────────────────── */
  function _togglePause() {
    const state = GameState.get();
    if (state.phase === 'playing') {
      Timer.pause();
      clearTimeout(flashTimer);
      GameState.patch({ phase: 'paused' });
      Render.pauseOverlay(true);
    } else if (state.phase === 'paused') {
      Timer.resume();
      GameState.patch({ phase: 'playing' });
      Render.pauseOverlay(false);
      // Resume flash if needed
      if (state.mode === 'flash' && state.flashPhase === 'show') {
        _runFlash();
      }
    }
  }

  /* ── End game ─────────────────────────────────────── */
  function _endGame(timeUp = false) {
    Timer.stop();
    clearTimeout(flashTimer);
    const state = GameState.get();
    if (state.phase === 'gameover') return;

    // Time bonus (not for order mode which is score-as-you-go)
    if (!Config.MODES[state.mode].countUp) {
      const bonus = Scoring.timeBonus(state.timeRemaining);
      state.score += bonus;
    }

    GameState.patch({ phase: 'gameover' });

    // Persist
    const now = new Date();
    const entry = {
      score:   state.score,
      elapsed: Render._fmtTime ? Render._fmtTime(state.timeElapsed) : (Math.floor(state.timeElapsed) + 's'),
      date:    `${now.getDate().toString().padStart(2,'0')}.${(now.getMonth()+1).toString().padStart(2,'0')}.${now.getFullYear()}`
    };
    // Use private format time helper
    const m2  = Math.floor(state.timeElapsed / 60);
    const s2  = Math.floor(state.timeElapsed % 60);
    entry.elapsed = `${m2}:${String(s2).padStart(2,'0')}`;

    const newRecord = Storage.isRecord(state.mode, diff, state.score);
    Storage.saveHS(state.mode, diff, entry);
    Storage.updateStats(state.mode, { score: state.score, correct: state.correct });
    GameState.patch({ isNewRecord: newRecord });

    if (newRecord && state.score > 100) Animation.confetti();

    Render.section('result');
    Render.result(GameState.get());
  }

  /* ── Menu ─────────────────────────────────────────── */
  function _toMenu() {
    Timer.stop();
    clearTimeout(flashTimer);
    GameState.patch({ phase: 'idle' });
    Render.section('start');
    Render.highscores(mode, diff, 'start-hs-list');
  }

  /* ── Dark mode ────────────────────────────────────── */
  function _toggleDark() {
    const dark = document.body.classList.toggle('dark-mode');
    Storage.setDark(dark);
    _updateDarkIcon();
  }

  function _updateDarkIcon() {
    const dark = document.body.classList.contains('dark-mode');
    const ic = document.querySelector('#btn-darkmode .dm-icon');
    const btn = document.getElementById('btn-darkmode');
    if (ic) ic.textContent = dark ? '☀️' : '🌙';
    if (btn) btn.setAttribute('aria-label', dark ? 'Hell-Modus aktivieren' : 'Dunkel-Modus aktivieren');
  }

  /* ── Share ────────────────────────────────────────── */
  function _share() {
    const s    = GameState.get();
    const mLbl = Config.MODES[s.mode]?.label || s.mode;
    const dLbl = Config.DIFFICULTIES[s.difficulty]?.label || s.difficulty;
    const text = `🎯 Zahlenjagd – ${mLbl} (${dLbl}): ${Scoring.fmt(s.score)} Punkte!\nKannst du das toppen? 👉 https://klickspiele.de/zahlenjagd`;
    if (navigator.share) {
      navigator.share({ title: 'Zahlenjagd', text, url: 'https://klickspiele.de/zahlenjagd' })
        .catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => Render.toast('📋 Ergebnis kopiert!'));
    } else {
      Render.toast('Teilen nicht unterstützt');
    }
  }

  /* ── Util ─────────────────────────────────────────── */
  function _on(id, ev, fn) {
    document.getElementById(id)?.addEventListener(ev, fn);
  }

  return { init };
})();


/* ═══════════════════════════════════════════════════════════
   BOOTSTRAP
═══════════════════════════════════════════════════════════ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => UIController.init());
} else {
  UIController.init();
}
