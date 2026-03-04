/**
 * app.js — Haupt-App-Koordination
 * Einstellungen · Sounds · Highscores · Dark Mode · Konfetti
 */
import { DECKS, GRIDS }  from './decks.js';
import { MemoryGame, formatTime } from './game.js';
import { UIRuntime }     from './ui-runtime.js';
import { updateTitle, injectGameSchema } from './seo.js';

/* ══════════════════════════════════════════════════════════
   EINSTELLUNGEN
══════════════════════════════════════════════════════════ */
const SETTINGS_KEY = 'mem_settings_v2';
const DEFAULT_SETTINGS = {
  deckId:       'tiere',
  gridId:       '4x4',
  difficulty:   'normal',
  timer:        true,
  sound:        false,
  largeCards:   false,
  highContrast: false,
  darkMode:     false,
};

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return { ...DEFAULT_SETTINGS, ...s };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

/* ══════════════════════════════════════════════════════════
   HIGHSCORES
══════════════════════════════════════════════════════════ */
function hsKey(deckId, gridId, timer) {
  return `mem_hs_${deckId}_${gridId}_${timer ? '1' : '0'}`;
}

function loadHS(deckId, gridId, timer) {
  try {
    return JSON.parse(localStorage.getItem(hsKey(deckId, gridId, timer)) || 'null');
  } catch { return null; }
}

function saveHS(deckId, gridId, timer, data) {
  try { localStorage.setItem(hsKey(deckId, gridId, timer), JSON.stringify(data)); } catch {}
}

function isNewRecord(old, cur) {
  if (!old) return true;
  // Primär: weniger Züge; Sekundär: weniger Zeit
  if (cur.moves < old.moves) return true;
  if (cur.moves === old.moves && cur.time < old.time) return true;
  return false;
}

/* ══════════════════════════════════════════════════════════
   SOUND (Web Audio API, keine Dateien)
══════════════════════════════════════════════════════════ */
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
  return _audioCtx;
}

function playTone(freq, dur = 0.08, type = 'sine', vol = 0.18) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc   = ctx.createOscillator();
    const gain  = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type            = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch {}
}

function sfxFlip()     { playTone(520, 0.06, 'sine',     0.12); }
function sfxMatch()    { playTone(660, 0.1,  'sine',     0.18); setTimeout(() => playTone(880, 0.12, 'sine', 0.15), 80); }
function sfxMismatch() { playTone(220, 0.12, 'triangle', 0.14); }
function sfxWin()      {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'sine', 0.2), i * 120));
}

/* ══════════════════════════════════════════════════════════
   KONFETTI
══════════════════════════════════════════════════════════ */
function launchConfetti() {
  const cv = document.getElementById('confetti-cv');
  if (!cv) return;
  cv.style.display = 'block';
  cv.width  = window.innerWidth;
  cv.height = window.innerHeight;
  const ctx = cv.getContext('2d');
  const particles = Array.from({ length: 90 }, () => ({
    x:   Math.random() * cv.width,
    y:   -20 - Math.random() * 60,
    vx:  (Math.random() - 0.5) * 4,
    vy:  3 + Math.random() * 3,
    w:   8 + Math.random() * 8,
    h:   4 + Math.random() * 5,
    rot: Math.random() * Math.PI * 2,
    rv:  (Math.random() - 0.5) * 0.2,
    col: ['#F57C00','#FFD54F','#81C784','#64B5F6','#F06292','#BA68C8'][Math.floor(Math.random()*6)],
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    let alive = false;
    particles.forEach(p => {
      if (p.y < cv.height + 30) { alive = true; }
      p.x  += p.vx;
      p.y  += p.vy;
      p.rot += p.rv;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.col;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if (alive && frame < 200) requestAnimationFrame(draw);
    else { ctx.clearRect(0,0,cv.width,cv.height); cv.style.display='none'; }
  }
  draw();
}

/* ══════════════════════════════════════════════════════════
   HAUPT-APP
══════════════════════════════════════════════════════════ */
let settings = loadSettings();
let game     = null;

// DOM-Referenzen
const boardEl        = document.getElementById('mem-board');
const statMoves      = document.getElementById('stat-moves');
const statTime       = document.getElementById('stat-time');
const statPairs      = document.getElementById('stat-pairs');
const statTimerWrap  = document.getElementById('stat-timer-wrap');
const liveEl         = document.getElementById('mem-live');
const boardWrap      = document.querySelector('.mem-board-wrap');

// Buttons
const btnNew         = document.getElementById('btn-new');
const btnPause       = document.getElementById('btn-pause');
const btnSettings    = document.getElementById('btn-settings-open');
const btnDark        = document.getElementById('btn-dark');

// Settings dialog
const settingsScrim  = document.getElementById('settings-scrim');
const btnSettClose   = document.getElementById('btn-sett-close');
const btnSettApply   = document.getElementById('btn-sett-apply');

// End dialog
const endScrim       = document.getElementById('end-scrim');
const endMoves       = document.getElementById('end-moves');
const endTime        = document.getElementById('end-time');
const endAccuracy    = document.getElementById('end-accuracy');
const endHsBadge     = document.getElementById('end-hs-badge');
const endHsOld       = document.getElementById('end-hs-old');
const btnEndNew      = document.getElementById('btn-end-new');
const btnEndClose    = document.getElementById('btn-end-close');

/* ── Pause-Overlay ────────────────────────────────────── */
const pauseOverlay   = document.querySelector('.pause-overlay');

/* ══════════════════════════════════════════════════════════
   SPIEL STARTEN
══════════════════════════════════════════════════════════ */
function startGame() {
  const deck = DECKS[settings.deckId] || DECKS.tiere;
  const grid = GRIDS.find(g => g.id === settings.gridId) || GRIDS[1];

  // Titel + Schema
  updateTitle(deck.label, grid.label);
  injectGameSchema(deck.label);

  // Stats zurücksetzen
  statMoves.textContent = '0';
  statTime.textContent  = '0:00';
  statPairs.textContent = `0 / ${grid.pairs}`;
  statTimerWrap.style.display = settings.timer ? '' : 'none';

  // Pause aufheben
  if (boardWrap) {
    boardWrap.classList.remove('is-paused');
  }
  if (btnPause) {
    btnPause.textContent = '⏸';
    btnPause.title       = 'Pause';
    btnPause.setAttribute('aria-label', 'Pause');
  }

  // Body-Klassen
  document.body.classList.toggle('dark-mode',     settings.darkMode);
  document.body.classList.toggle('large-cards',   settings.largeCards);
  document.body.classList.toggle('high-contrast', settings.highContrast);

  game = new MemoryGame(boardEl, deck, grid, settings, {
    onFlip(card) {
      if (settings.sound) sfxFlip();
      announce(`Karte aufgedeckt: ${card.symbol}`);
    },
    onMove(moves) {
      statMoves.textContent = moves;
    },
    onMatch(matches, total) {
      if (settings.sound) sfxMatch();
      statPairs.textContent = `${matches} / ${total}`;
      announce(`Paar gefunden! ${matches} von ${total}`);
    },
    onMismatch() {
      if (settings.sound) sfxMismatch();
    },
    onTick(ms) {
      statTime.textContent = formatTime(ms);
      statTimerWrap.classList.toggle('timer-run', true);
    },
    onFinish(result) {
      statTimerWrap.classList.remove('timer-run');
      showEndDialog(result);
    },
  });

  game.start();
  boardEl.focus();
}

/* ══════════════════════════════════════════════════════════
   END-DIALOG
══════════════════════════════════════════════════════════ */
function showEndDialog(result) {
  if (settings.sound) sfxWin();
  launchConfetti();

  endMoves.textContent    = result.moves;
  endTime.textContent     = settings.timer ? formatTime(result.time) : '–';
  endAccuracy.textContent = result.accuracy + ' %';

  // Highscore
  const old = loadHS(settings.deckId, settings.gridId, settings.timer);
  if (isNewRecord(old, result)) {
    saveHS(settings.deckId, settings.gridId, settings.timer, {
      moves: result.moves, time: result.time, date: Date.now(),
    });
    endHsBadge.style.display = 'inline-flex';
    endHsOld.style.display   = 'none';
  } else {
    endHsBadge.style.display = 'none';
    if (old) {
      endHsOld.textContent  = `Rekord: ${old.moves} Züge${settings.timer ? ', ' + formatTime(old.time) : ''}`;
      endHsOld.style.display = 'block';
    } else {
      endHsOld.style.display = 'none';
    }
  }

  openScrim(endScrim);
  announce(`Spiel gewonnen! ${result.moves} Züge. ${result.accuracy} % Trefferquote.`);
}

/* ══════════════════════════════════════════════════════════
   SETTINGS-DIALOG
══════════════════════════════════════════════════════════ */
function openSettings() {
  syncSettingsUI();
  openScrim(settingsScrim);
  if (game && !game.isFinished()) game.pause();
}

function closeSettings(apply) {
  closeScrim(settingsScrim);
  if (apply) {
    readSettingsUI();
    saveSettings(settings);
    startGame();
  } else {
    if (game && game.isPaused()) game.resume();
  }
}

function syncSettingsUI() {
  // Deck
  document.querySelectorAll('[data-sett="deck"]').forEach(el => {
    el.classList.toggle('active', el.dataset.val === settings.deckId);
    el.setAttribute('aria-pressed', el.dataset.val === settings.deckId ? 'true' : 'false');
  });
  // Grid
  document.querySelectorAll('[data-sett="grid"]').forEach(el => {
    el.classList.toggle('active', el.dataset.val === settings.gridId);
    el.setAttribute('aria-pressed', el.dataset.val === settings.gridId ? 'true' : 'false');
  });
  // Difficulty
  document.querySelectorAll('[data-sett="difficulty"]').forEach(el => {
    el.classList.toggle('active', el.dataset.val === settings.difficulty);
    el.setAttribute('aria-pressed', el.dataset.val === settings.difficulty ? 'true' : 'false');
  });
  // Toggles
  const tog = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.checked = val;
  };
  tog('sett-timer',    settings.timer);
  tog('sett-sound',    settings.sound);
  tog('sett-large',    settings.largeCards);
  tog('sett-contrast', settings.highContrast);
  tog('sett-dark',     settings.darkMode);
}

function readSettingsUI() {
  // Deck
  const deckEl = document.querySelector('[data-sett="deck"].active');
  if (deckEl) settings.deckId = deckEl.dataset.val;
  // Grid
  const gridEl = document.querySelector('[data-sett="grid"].active');
  if (gridEl) settings.gridId = gridEl.dataset.val;
  // Difficulty
  const diffEl = document.querySelector('[data-sett="difficulty"].active');
  if (diffEl) settings.difficulty = diffEl.dataset.val;
  // Toggles
  const getChk = id => { const e = document.getElementById(id); return e ? e.checked : false; };
  settings.timer        = getChk('sett-timer');
  settings.sound        = getChk('sett-sound');
  settings.largeCards   = getChk('sett-large');
  settings.highContrast = getChk('sett-contrast');
  settings.darkMode     = getChk('sett-dark');
}

// Settings-Optionen click-Handler
document.querySelectorAll('[data-sett]').forEach(el => {
  el.addEventListener('click', () => {
    const group = el.dataset.sett;
    document.querySelectorAll(`[data-sett="${group}"]`).forEach(x => {
      x.classList.remove('active');
      x.setAttribute('aria-pressed', 'false');
    });
    el.classList.add('active');
    el.setAttribute('aria-pressed', 'true');
  });
});

/* ══════════════════════════════════════════════════════════
   SCRIM-HELFER
══════════════════════════════════════════════════════════ */
function openScrim(scrim) {
  scrim.classList.add('show');
  scrim.setAttribute('aria-hidden', 'false');
  // Fokus auf ersten fokussierbaren Element im Dialog
  requestAnimationFrame(() => {
    const focusable = scrim.querySelector('button, [tabindex="0"]');
    if (focusable) focusable.focus();
  });
}

function closeScrim(scrim) {
  scrim.classList.remove('show');
  scrim.setAttribute('aria-hidden', 'true');
  // Fokus zurück zu Settings-Button
  if (btnSettings) btnSettings.focus();
}

/* ══════════════════════════════════════════════════════════
   LIVE REGION
══════════════════════════════════════════════════════════ */
function announce(msg) {
  if (!liveEl) return;
  liveEl.textContent = '';
  requestAnimationFrame(() => { liveEl.textContent = msg; });
}

/* ══════════════════════════════════════════════════════════
   EVENT-LISTENER
══════════════════════════════════════════════════════════ */
btnNew?.addEventListener('click', () => startGame());

btnPause?.addEventListener('click', () => {
  if (!game) return;
  if (game.isPaused()) {
    game.resume();
    boardWrap?.classList.remove('is-paused');
    btnPause.textContent = '⏸';
    btnPause.title       = 'Pause';
    btnPause.setAttribute('aria-label', 'Pause');
  } else {
    game.pause();
    boardWrap?.classList.add('is-paused');
    btnPause.textContent = '▶';
    btnPause.title       = 'Weiter';
    btnPause.setAttribute('aria-label', 'Weiter');
  }
});

btnSettings?.addEventListener('click', openSettings);

btnSettClose?.addEventListener('click', () => closeSettings(false));
btnSettApply?.addEventListener('click', () => closeSettings(true));

btnEndNew?.addEventListener('click', () => { closeScrim(endScrim); startGame(); });
btnEndClose?.addEventListener('click', () => closeScrim(endScrim));

// Escape schließt offene Dialoge
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (settingsScrim.classList.contains('show')) closeSettings(false);
  if (endScrim.classList.contains('show'))      closeScrim(endScrim);
});

// Klick auf Scrim-Hintergrund schließt Settings
settingsScrim?.addEventListener('click', e => {
  if (e.target === settingsScrim) closeSettings(false);
});
endScrim?.addEventListener('click', e => {
  if (e.target === endScrim) closeScrim(endScrim);
});

// Dark-Mode-Toggle in AppBar
btnDark?.addEventListener('click', () => {
  settings.darkMode = !settings.darkMode;
  document.body.classList.toggle('dark-mode', settings.darkMode);
  saveSettings(settings);
  btnDark.setAttribute('aria-label', settings.darkMode ? 'Heller Modus' : 'Dunkler Modus');
  btnDark.title = settings.darkMode ? 'Heller Modus' : 'Dunkler Modus';
});

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
async function init() {
  // Lade UI-Runtime (Design-Tokens aus ui.json)
  const runtime = new UIRuntime('./assets/ui.json');
  await runtime.load();

  // Einstellungen anwenden
  document.body.classList.toggle('dark-mode',     settings.darkMode);
  document.body.classList.toggle('large-cards',   settings.largeCards);
  document.body.classList.toggle('high-contrast', settings.highContrast);

  // Dark-Mode-Button-Label
  if (btnDark) {
    btnDark.setAttribute('aria-label', settings.darkMode ? 'Heller Modus' : 'Dunkler Modus');
    btnDark.title = settings.darkMode ? 'Heller Modus' : 'Dunkler Modus';
  }

  // Spiel starten
  startGame();
}

init();
