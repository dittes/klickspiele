/* ═══════════════════════════════════════════════════════════════
   Schiffe Versenken – game.js
   klickspiele.de · Vanilla JS · Mobile First · No Dependencies
   ─────────────────────────────────────────────────────────────
   Module structure:
   Config · GameState · Grid · ShipPlacement · AI · MoveLogic
   Storage · Render · Animation · UIController · DailyChallenge
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ══════════════════════════════════════
   1. CONFIG MODULE
══════════════════════════════════════ */
const Config = (() => {
  const cfg = {
    grid: { size: 10 },
    ships: [
      { id: 'carrier',    size: 5, count: 1, name: 'Flugzeugträger', emoji: '🛳' },
      { id: 'battleship', size: 4, count: 1, name: 'Schlachtschiff', emoji: '⚓' },
      { id: 'cruiser',    size: 3, count: 2, name: 'Kreuzer',        emoji: '🚢' },
      { id: 'destroyer',  size: 2, count: 1, name: 'Zerstörer',      emoji: '⛵' },
    ],
    aiDifficulty: {
      easy:   { id: 'easy',   label: 'Leicht' },
      medium: { id: 'medium', label: 'Mittel' },
      hard:   { id: 'hard',   label: 'Schwer' },
    },
    modes: { vsAI: 'vsAI', local2P: 'local2P' },
    letters: ['A','B','C','D','E','F','G','H','I','J'],
  };
  return {
    get()        { return cfg; },
    gridSize()   { return cfg.grid.size; },
    ships()      { return cfg.ships; },
    totalCells() { return cfg.ships.reduce((s,sh)=>s+sh.size*sh.count,0); },
  };
})();

/* ══════════════════════════════════════
   2. GRID MODULE
══════════════════════════════════════ */
const Grid = (() => {
  const SIZE = Config.gridSize();

  function create() {
    return Array.from({length: SIZE}, () => Array(SIZE).fill(null));
    // cell: null | { type:'ship'|'hit'|'miss'|'sunk', shipId, shipIdx }
  }

  function clone(grid) {
    return grid.map(row => row.map(c => c ? {...c} : null));
  }

  function get(grid, r, c) {
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return undefined;
    return grid[r][c];
  }

  function set(grid, r, c, val) {
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
    grid[r][c] = val;
  }

  function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  return { create, clone, get, set, inBounds, SIZE };
})();

/* ══════════════════════════════════════
   3. SHIP PLACEMENT MODULE
══════════════════════════════════════ */
const ShipPlacement = (() => {
  // Returns array of {r,c} cells the ship would occupy
  function cells(r, c, size, horiz) {
    const result = [];
    for (let i = 0; i < size; i++) {
      result.push(horiz ? {r, c: c+i} : {r: r+i, c});
    }
    return result;
  }

  function isValid(grid, r, c, size, horiz, shipId) {
    const cs = cells(r, c, size, horiz);
    for (const {r: tr, c: tc} of cs) {
      if (!Grid.inBounds(tr, tc)) return false;
      // Check cell and neighbors
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const cell = Grid.get(grid, tr+dr, tc+dc);
          if (cell && cell.shipId !== shipId) return false;
        }
      }
    }
    return true;
  }

  function place(grid, r, c, size, horiz, shipId, shipIdx) {
    if (!isValid(grid, r, c, size, horiz, shipId)) return false;
    cells(r, c, size, horiz).forEach(({r:tr,c:tc}) => {
      Grid.set(grid, tr, tc, { type:'ship', shipId, shipIdx, horiz, r, c, size });
    });
    return true;
  }

  function remove(grid, shipId) {
    for (let r = 0; r < Grid.SIZE; r++) {
      for (let c = 0; c < Grid.SIZE; c++) {
        if (grid[r][c] && grid[r][c].shipId === shipId) {
          grid[r][c] = null;
        }
      }
    }
  }

  function autoPlace(ships) {
    const grid = Grid.create();
    const placed = [];
    for (const ship of ships) {
      for (let idx = 0; idx < ship.count; idx++) {
        let success = false;
        let attempts = 0;
        while (!success && attempts < 500) {
          attempts++;
          const horiz = Math.random() < 0.5;
          const r = Math.floor(Math.random() * Grid.SIZE);
          const c = Math.floor(Math.random() * Grid.SIZE);
          success = place(grid, r, c, ship.size, horiz, ship.id + '_' + idx, idx);
        }
        if (!success) return autoPlace(ships); // retry
        placed.push({ shipId: ship.id + '_' + idx, shipDef: ship });
      }
    }
    return { grid, placed };
  }

  function getShipsOnGrid(grid) {
    const ships = new Map();
    for (let r = 0; r < Grid.SIZE; r++) {
      for (let c = 0; c < Grid.SIZE; c++) {
        const cell = grid[r][c];
        if (cell && cell.type === 'ship') {
          ships.set(cell.shipId, cell);
        }
      }
    }
    return ships;
  }

  return { cells, isValid, place, remove, autoPlace, getShipsOnGrid };
})();

/* ══════════════════════════════════════
   4. GAME STATE MODULE
══════════════════════════════════════ */
const GameState = (() => {
  let state = null;

  function init(mode, difficulty) {
    state = {
      mode,          // 'vsAI' | 'local2P'
      difficulty,    // 'easy'|'medium'|'hard' (vsAI only)
      phase: 'setup',
      setupPlayer: 1,
      currentPlayer: 1,
      boards: {
        1: { grid: Grid.create(), ships: [], shotsFired: 0, hits: 0 },
        2: { grid: Grid.create(), ships: [], shotsFired: 0, hits: 0 },
      },
      setup: {
        selectedShip: null,  // { shipDef, idx, horiz }
        horiz: true,
        placedShips: [],     // [{shipId, shipDef}]
        shipsToPlace: buildShipQueue(),
      },
      winner: null,
      stats: { shots: 0, hits: 0, start: Date.now() },
      dailySeed: null,
    };
    return state;
  }

  function buildShipQueue() {
    const queue = [];
    Config.ships().forEach(s => {
      for (let i = 0; i < s.count; i++) {
        queue.push({ shipDef: s, idx: i, shipId: s.id + '_' + i });
      }
    });
    return queue;
  }

  function get() { return state; }
  function set(partial) { Object.assign(state, partial); }

  function getBoard(player) { return state.boards[player]; }

  function reset() { state = null; }

  return { init, get, set, getBoard, reset, buildShipQueue };
})();

/* ══════════════════════════════════════
   5. MOVE LOGIC MODULE
══════════════════════════════════════ */
const MoveLogic = (() => {
  // Returns result: 'miss'|'hit'|'sunk'|'already'
  function shoot(targetBoard, r, c) {
    const cell = Grid.get(targetBoard.grid, r, c);
    if (!cell) {
      // Miss
      Grid.set(targetBoard.grid, r, c, { type: 'miss' });
      targetBoard.shotsFired++;
      return { result: 'miss', r, c };
    }
    if (cell.type === 'miss' || cell.type === 'hit' || cell.type === 'sunk') {
      return { result: 'already', r, c };
    }
    if (cell.type === 'ship') {
      const shipId = cell.shipId;
      // Mark hit
      Grid.set(targetBoard.grid, r, c, { ...cell, type: 'hit' });
      targetBoard.shotsFired++;
      targetBoard.hits++;

      // Check if sunk
      const sunk = isShipSunk(targetBoard.grid, shipId);
      if (sunk) {
        markSunk(targetBoard.grid, shipId);
        return { result: 'sunk', r, c, shipId, shipSize: cell.size };
      }
      return { result: 'hit', r, c, shipId };
    }
    return { result: 'miss', r, c };
  }

  function isShipSunk(grid, shipId) {
    for (let r = 0; r < Grid.SIZE; r++) {
      for (let c = 0; c < Grid.SIZE; c++) {
        const cell = Grid.get(grid, r, c);
        if (cell && cell.shipId === shipId && cell.type === 'ship') return false;
      }
    }
    return true;
  }

  function markSunk(grid, shipId) {
    for (let r = 0; r < Grid.SIZE; r++) {
      for (let c = 0; c < Grid.SIZE; c++) {
        const cell = Grid.get(grid, r, c);
        if (cell && cell.shipId === shipId) {
          Grid.set(grid, r, c, { ...cell, type: 'sunk' });
        }
      }
    }
    // Mark neighbors as miss (safe zone)
    for (let r = 0; r < Grid.SIZE; r++) {
      for (let c = 0; c < Grid.SIZE; c++) {
        const cell = Grid.get(grid, r, c);
        if (cell && cell.shipId === shipId) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nc = Grid.get(grid, r+dr, c+dc);
              if (nc === null) {
                Grid.set(grid, r+dr, c+dc, { type: 'miss' });
              }
            }
          }
        }
      }
    }
  }

  function checkWin(board) {
    const total = Config.totalCells();
    return board.hits >= total;
  }

  function getValidShots(grid) {
    const valid = [];
    for (let r = 0; r < Grid.SIZE; r++) {
      for (let c = 0; c < Grid.SIZE; c++) {
        const cell = Grid.get(grid, r, c);
        if (!cell || cell.type === 'ship') valid.push({r, c});
      }
    }
    return valid;
  }

  return { shoot, checkWin, getValidShots, isShipSunk };
})();

/* ══════════════════════════════════════
   6. AI MODULE
══════════════════════════════════════ */
const AI = (() => {
  let state = {
    difficulty: 'medium',
    huntMode: false,
    targets: [],      // Cells to try after a hit
    hits: [],         // Current ship being hunted
    direction: null,  // null | 'h' | 'v'
    dirTried: [],
  };

  function reset(difficulty) {
    state = {
      difficulty: difficulty || 'medium',
      huntMode: false,
      targets: [],
      hits: [],
      direction: null,
      dirTried: [],
    };
  }

  function chooseMove(grid) {
    switch (state.difficulty) {
      case 'easy':   return easyMove(grid);
      case 'medium': return mediumMove(grid);
      case 'hard':   return hardMove(grid);
      default:       return easyMove(grid);
    }
  }

  function easyMove(grid) {
    const valid = MoveLogic.getValidShots(grid);
    return valid[Math.floor(Math.random() * valid.length)];
  }

  function mediumMove(grid) {
    // Hunt mode: if we have targets, try them
    if (state.huntMode && state.targets.length > 0) {
      // Filter still-valid targets
      state.targets = state.targets.filter(({r,c}) => {
        const cell = Grid.get(grid, r, c);
        return cell === null || cell.type === 'ship';
      });
      if (state.targets.length > 0) {
        const idx = Math.floor(Math.random() * state.targets.length);
        return state.targets.splice(idx, 1)[0];
      }
    }
    state.huntMode = false;
    state.targets = [];
    return easyMove(grid);
  }

  function hardMove(grid) {
    // Destroy mode: follow direction after 2 hits
    if (state.huntMode && state.hits.length >= 2 && state.direction) {
      const next = getNextInDirection(grid);
      if (next) return next;
      // Try opposite direction
      const first = state.hits[0];
      const last = state.hits[state.hits.length-1];
      state.direction = state.direction === 'h' ? 'h_rev' : 'v_rev';
      const opp = getOppDirection(grid, first, last);
      if (opp) return opp;
    }

    // Hunt mode after single hit
    if (state.huntMode && state.targets.length > 0) {
      state.targets = state.targets.filter(({r,c}) => {
        const cell = Grid.get(grid, r, c);
        return cell === null || cell.type === 'ship';
      });
      if (state.targets.length > 0) {
        return state.targets.shift();
      }
    }
    state.huntMode = false;
    state.targets = [];
    state.hits = [];
    state.direction = null;

    // Checkerboard pattern for hunt phase
    const valid = MoveLogic.getValidShots(grid);
    const checker = valid.filter(({r,c}) => (r+c)%2 === 0);
    const pool = checker.length > 0 ? checker : valid;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function getNextInDirection(grid) {
    if (!state.direction || state.hits.length < 2) return null;
    const sorted = [...state.hits].sort((a,b) =>
      state.direction === 'h' ? a.c-b.c : a.r-b.r);
    const last = sorted[sorted.length-1];
    const dr = state.direction === 'v' ? 1 : 0;
    const dc = state.direction === 'h' ? 1 : 0;
    const nr = last.r+dr, nc = last.c+dc;
    const cell = Grid.get(grid, nr, nc);
    if (cell === null || cell && cell.type === 'ship') return {r:nr, c:nc};
    return null;
  }

  function getOppDirection(grid, first) {
    const dr = state.direction === 'v_rev' ? -1 : 0;
    const dc = state.direction === 'h_rev' ? -1 : 0;
    const nr = first.r+dr, nc = first.c+dc;
    const cell = Grid.get(grid, nr, nc);
    if (cell === null || cell && cell.type === 'ship') return {r:nr, c:nc};
    return null;
  }

  function onHit(r, c, sunk) {
    if (sunk) {
      // Reset hunt mode
      state.huntMode = false;
      state.targets = [];
      state.hits = [];
      state.direction = null;
      return;
    }
    state.huntMode = true;
    state.hits.push({r, c});

    if (state.hits.length === 2) {
      // Determine direction
      const h0 = state.hits[0], h1 = state.hits[1];
      state.direction = h0.r === h1.r ? 'h' : 'v';
    }

    // Add adjacent cells as targets
    const dirs = [{dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}];
    state.targets = [];
    dirs.forEach(({dr,dc}) => {
      const nr = r+dr, nc = c+dc;
      if (Grid.inBounds(nr, nc)) {
        state.targets.push({r:nr, c:nc});
      }
    });
  }

  function onMiss() {
    // If in direction mode, try to reverse
    if (state.direction && !state.direction.includes('rev')) {
      state.direction += '_rev';
    }
  }

  return { reset, chooseMove, onHit, onMiss };
})();

/* ══════════════════════════════════════
   7. STORAGE MODULE
══════════════════════════════════════ */
const Storage = (() => {
  const KEYS = {
    save:       'sv_battleship_save',
    highscores: 'sv_battleship_scores',
    dark:       'sv_dark',
    daily:      'sv_daily',
  };

  function save(state) {
    try {
      localStorage.setItem(KEYS.save, JSON.stringify({
        ...state,
        savedAt: Date.now(),
      }));
    } catch(e) {}
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEYS.save);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function clearSave() {
    localStorage.removeItem(KEYS.save);
  }

  function addHighscore(entry) {
    try {
      const scores = getHighscores();
      scores.push(entry);
      scores.sort((a,b) => a.shots - b.shots);
      const top10 = scores.slice(0, 10);
      localStorage.setItem(KEYS.highscores, JSON.stringify(top10));
    } catch(e) {}
  }

  function getHighscores() {
    try {
      const raw = localStorage.getItem(KEYS.highscores);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function getDark() {
    return localStorage.getItem(KEYS.dark) === '1';
  }

  function setDark(val) {
    localStorage.setItem(KEYS.dark, val ? '1' : '0');
  }

  function getDailyCompleted(dateStr) {
    try {
      const raw = localStorage.getItem(KEYS.daily);
      const data = raw ? JSON.parse(raw) : {};
      return data[dateStr] || null;
    } catch(e) { return null; }
  }

  function setDailyCompleted(dateStr, shots) {
    try {
      const raw = localStorage.getItem(KEYS.daily);
      const data = raw ? JSON.parse(raw) : {};
      data[dateStr] = shots;
      localStorage.setItem(KEYS.daily, JSON.stringify(data));
    } catch(e) {}
  }

  return { save, load, clearSave, addHighscore, getHighscores, getDark, setDark, getDailyCompleted, setDailyCompleted };
})();

/* ══════════════════════════════════════
   8. DAILY CHALLENGE MODULE
══════════════════════════════════════ */
const DailyChallenge = (() => {
  function getTodayStr() {
    return new Date().toISOString().slice(0,10);
  }

  // Seeded PRNG (Mulberry32)
  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function dateToSeed(dateStr) {
    return dateStr.split('').reduce((s,c) => s + c.charCodeAt(0), 0) * 31;
  }

  function generatePlacement(dateStr) {
    const seed = dateToSeed(dateStr);
    const rng = mulberry32(seed);
    const ships = Config.ships();
    const grid = Grid.create();
    const placed = [];

    for (const ship of ships) {
      for (let idx = 0; idx < ship.count; idx++) {
        let success = false, attempts = 0;
        while (!success && attempts < 500) {
          attempts++;
          const horiz = rng() < 0.5;
          const r = Math.floor(rng() * Grid.SIZE);
          const c = Math.floor(rng() * Grid.SIZE);
          success = ShipPlacement.place(grid, r, c, ship.size, horiz, ship.id+'_'+idx, idx);
        }
        placed.push({ shipId: ship.id+'_'+idx, shipDef: ship });
      }
    }
    return { grid, placed };
  }

  function getTodaySeed() {
    return getTodayStr();
  }

  return { getTodayStr, generatePlacement, getTodaySeed };
})();

/* ══════════════════════════════════════
   9. ANIMATION MODULE
══════════════════════════════════════ */
const Animation = (() => {
  const canvas = document.getElementById('cv');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let particles = [];
  let rafId = null;

  function resize() {
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function explode(x, y, color) {
    if (!canvas || !ctx) return;
    if (!canvas.style.display || canvas.style.display === 'none') {
      canvas.style.display = 'block';
    }
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r:  3 + Math.random() * 5,
        alpha: 1,
        color: color || '#F57C00',
        decay: 0.03 + Math.random() * 0.02,
      });
    }
    if (!rafId) loop();
  }

  function splashMiss(x, y) {
    if (!canvas || !ctx) return;
    if (!canvas.style.display || canvas.style.display === 'none') {
      canvas.style.display = 'block';
    }
    for (let i = 0; i < 8; i++) {
      const angle = -Math.PI/2 + (Math.random()-0.5) * Math.PI;
      const speed = 1.5 + Math.random() * 3;
      particles.push({
        x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
        r: 2+Math.random()*3, alpha:0.8, color:'#4FC3F7', decay:0.04,
      });
    }
    if (!rafId) loop();
  }

  function sunkWave(x, y) {
    explode(x, y, '#FF6F00');
    explode(x, y, '#FFCC02');
  }

  function loop() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => p.alpha > 0.01);
    for (const p of particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // gravity
      p.alpha -= p.decay;
    }
    ctx.globalAlpha = 1;
    if (particles.length > 0) {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
      canvas.style.display = 'none';
    }
  }

  window.addEventListener('resize', resize, {passive:true});
  resize();

  return { explode, splashMiss, sunkWave };
})();

/* ══════════════════════════════════════
   10. RENDER MODULE
══════════════════════════════════════ */
const Render = (() => {
  const SIZE = Grid.SIZE;

  // Build a board grid element
  function buildBoard(id, clickable, showShips) {
    const wrap = document.getElementById(id);
    if (!wrap) return;
    wrap.innerHTML = '';

    // Column headers A-J
    const headerRow = document.createElement('div');
    headerRow.className = 'brd-header-row';
    headerRow.appendChild(document.createElement('div')); // corner
    const letters = Config.get().letters;
    letters.forEach(l => {
      const lbl = document.createElement('div');
      lbl.className = 'brd-label';
      lbl.textContent = l;
      headerRow.appendChild(lbl);
    });
    wrap.appendChild(headerRow);

    for (let r = 0; r < SIZE; r++) {
      const row = document.createElement('div');
      row.className = 'brd-row';

      // Row number label
      const rLbl = document.createElement('div');
      rLbl.className = 'brd-label brd-label--num';
      rLbl.textContent = r + 1;
      row.appendChild(rLbl);

      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'brd-cell rpl';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.setAttribute('tabindex', clickable ? '0' : '-1');
        cell.setAttribute('aria-label', `${letters[c]}${r+1}`);
        if (clickable) {
          cell.setAttribute('role', 'button');
        }
        row.appendChild(cell);
      }
      wrap.appendChild(row);
    }
  }

  function updateBoard(id, grid, opts = {}) {
    const wrap = document.getElementById(id);
    if (!wrap) return;
    const cells = wrap.querySelectorAll('.brd-cell');
    cells.forEach(cellEl => {
      const r = +cellEl.dataset.r;
      const c = +cellEl.dataset.c;
      const cell = Grid.get(grid, r, c);

      cellEl.className = 'brd-cell rpl';
      cellEl.textContent = '';

      if (!cell) return;

      switch (cell.type) {
        case 'ship':
          if (opts.showShips) {
            cellEl.classList.add('cell-ship');
            // Ship segment decorations
            addShipSegment(cellEl, cell, r, c);
          }
          break;
        case 'hit':
          cellEl.classList.add('cell-hit');
          cellEl.textContent = '✕';
          break;
        case 'miss':
          cellEl.classList.add('cell-miss');
          cellEl.textContent = '·';
          break;
        case 'sunk':
          cellEl.classList.add('cell-sunk');
          cellEl.textContent = '✕';
          break;
      }
    });
  }

  function addShipSegment(el, cell, r, c) {
    // Add shape class based on position in ship
    if (cell.horiz) {
      if (c === cell.c) el.classList.add('ship-head-h');
      else if (c === cell.c + cell.size - 1) el.classList.add('ship-tail-h');
      else el.classList.add('ship-mid-h');
    } else {
      if (r === cell.r) el.classList.add('ship-head-v');
      else if (r === cell.r + cell.size - 1) el.classList.add('ship-tail-v');
      else el.classList.add('ship-mid-v');
    }
  }

  function flashCell(boardId, r, c, cls) {
    const wrap = document.getElementById(boardId);
    if (!wrap) return;
    const cells = wrap.querySelectorAll('.brd-cell');
    cells.forEach(cell => {
      if (+cell.dataset.r === r && +cell.dataset.c === c) {
        cell.classList.add(cls);
        setTimeout(() => cell.classList.remove(cls), 600);
      }
    });
  }

  function updateSetupBoard(grid, placedShips, hoverCells, validHover) {
    updateBoard('board-setup', grid, { showShips: true });
    const wrap = document.getElementById('board-setup');
    if (!wrap) return;

    // Highlight hover preview
    if (hoverCells) {
      const cells = wrap.querySelectorAll('.brd-cell');
      cells.forEach(cellEl => {
        const r = +cellEl.dataset.r, c = +cellEl.dataset.c;
        if (hoverCells.some(h => h.r===r && h.c===c)) {
          cellEl.classList.add(validHover ? 'cell-preview-valid' : 'cell-preview-invalid');
        }
      });
    }
  }

  function updateShipList(shipsToPlace, placedShips) {
    const list = document.getElementById('ship-list');
    if (!list) return;
    list.innerHTML = '';
    const cfg = Config.ships();
    cfg.forEach(shipDef => {
      for (let i = 0; i < shipDef.count; i++) {
        const sid = shipDef.id + '_' + i;
        const placed = placedShips.some(p => p.shipId === sid);
        const item = document.createElement('div');
        item.className = 'ship-list-item' + (placed ? ' placed' : '');
        item.dataset.shipId = sid;
        item.dataset.shipIdx = i;

        const nameEl = document.createElement('span');
        nameEl.textContent = `${shipDef.emoji} ${shipDef.name}`;

        const sizeEl = document.createElement('span');
        sizeEl.className = 'ship-size-vis';
        for (let s = 0; s < shipDef.size; s++) {
          const seg = document.createElement('span');
          seg.className = 'ship-seg';
          sizeEl.appendChild(seg);
        }

        item.appendChild(nameEl);
        item.appendChild(sizeEl);

        if (placed) {
          const editBtn = document.createElement('button');
          editBtn.className = 'btn-text ship-edit-btn rpl';
          editBtn.textContent = '✎';
          editBtn.setAttribute('aria-label', `${shipDef.name} neu platzieren`);
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            UIController.removeAndReselectShip(sid, shipDef, i);
          });
          item.appendChild(editBtn);
        }

        if (!placed) {
          item.addEventListener('click', () => UIController.selectShip(shipDef, i));
          item.setAttribute('role', 'button');
          item.setAttribute('tabindex', '0');
          item.setAttribute('aria-label', `${shipDef.name} auswählen`);
        }

        list.appendChild(item);
      }
    });
  }

  function updateTurnBanner(phase, currentPlayer, mode) {
    const banner = document.getElementById('turn-banner');
    if (!banner) return;
    if (phase === 'gameover') return;

    let text = '';
    if (mode === 'vsAI') {
      text = currentPlayer === 1 ? '🎯 Dein Zug — schieß auf das gegnerische Feld!' : '🤖 Computer denkt nach…';
    } else {
      text = `👤 Spieler ${currentPlayer} — schieß auf das gegnerische Feld!`;
    }
    banner.textContent = text;
    banner.className = 'turn-banner turn-p' + currentPlayer;
  }

  function updateStats(board1, board2) {
    const el1  = document.getElementById('stat-shots-1');
    const el2  = document.getElementById('stat-shots-2');
    const els1 = document.getElementById('stat-hits-1');
    const els2 = document.getElementById('stat-sunk-2');
    if (el1)  el1.textContent  = board1.shotsFired;
    if (el2)  el2.textContent  = board2.shotsFired;
    if (els1) els1.textContent = board1.hits;
    if (els2) els2.textContent = board2.hits;
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.hidden = true);
    const el = document.getElementById(id);
    if (el) { el.hidden = false; el.scrollTop = 0; }
  }

  function showDialog(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('show');
      el.removeAttribute('aria-hidden');
      const firstBtn = el.querySelector('button');
      if (firstBtn) setTimeout(() => firstBtn.focus(), 50);
    }
  }

  function hideDialog(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('show');
      el.setAttribute('aria-hidden', 'true');
    }
  }

  function getCellCenter(boardId, r, c) {
    const wrap = document.getElementById(boardId);
    if (!wrap) return {x:0,y:0};
    const cells = wrap.querySelectorAll('.brd-cell');
    for (const cell of cells) {
      if (+cell.dataset.r === r && +cell.dataset.c === c) {
        const rect = cell.getBoundingClientRect();
        return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
      }
    }
    return {x:0,y:0};
  }

  function updateBoardLabel(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  return {
    buildBoard, updateBoard, updateSetupBoard, updateShipList,
    updateTurnBanner, updateStats, showScreen, showDialog, hideDialog,
    getCellCenter, flashCell, updateBoardLabel,
  };
})();

/* ══════════════════════════════════════
   11. UI CONTROLLER MODULE
══════════════════════════════════════ */
const UIController = (() => {
  let selectedShip = null;   // { shipDef, idx, horiz }
  let hoverPos = null;       // { r, c }
  let aiMoveTimeout = null;
  let passScreenTimeout = null;

  /* ─── Setup Phase ─────────────────── */
  function startSetup(player) {
    const state = GameState.get();
    state.setupPlayer = player;
    state.phase = 'setup';

    const isAI = state.mode === 'vsAI';
    const pName = isAI ? 'Deine Schiffe' : `Spieler ${player} – Schiffe platzieren`;

    document.getElementById('setup-title').textContent = pName;
    document.getElementById('setup-player-info').textContent =
      isAI ? 'Platziere deine Schiffe auf dem Spielfeld.' :
             `Spieler ${player}, platziere deine Schiffe. Danach wird das Gerät übergeben.`;

    // Reset placement state
    state.setup = {
      horiz: true,
      placedShips: [],
      shipsToPlace: GameState.buildShipQueue(),
    };
    selectedShip = null;
    hoverPos = null;

    Render.buildBoard('board-setup', true, false);
    Render.updateShipList(state.setup.shipsToPlace, state.setup.placedShips);
    Render.showScreen('screen-setup');

    attachSetupEvents();
    updateRotateBtn();
    updateConfirmBtn();
  }

  function attachSetupEvents() {
    const boardWrap = document.getElementById('board-setup');
    if (!boardWrap) return;

    // Remove old listeners by cloning
    const newWrap = boardWrap.cloneNode(true);
    boardWrap.parentNode.replaceChild(newWrap, boardWrap);

    newWrap.addEventListener('click', onSetupCellClick);
    newWrap.addEventListener('mousemove', onSetupCellHover);
    newWrap.addEventListener('mouseleave', () => {
      hoverPos = null;
      refreshSetupBoard();
    });
    newWrap.addEventListener('touchmove', onSetupTouchMove, {passive:true});
  }

  function onSetupCellClick(e) {
    const cellEl = e.target.closest('.brd-cell');
    if (!cellEl) return;
    const r = +cellEl.dataset.r, c = +cellEl.dataset.c;

    if (!selectedShip) {
      // Select topmost unplaced ship
      const state = GameState.get();
      const next = state.setup.shipsToPlace.find(s =>
        !state.setup.placedShips.some(p => p.shipId === s.shipId));
      if (next) selectShip(next.shipDef, next.idx);
      return;
    }

    tryPlaceShip(r, c);
  }

  function onSetupCellHover(e) {
    const cellEl = e.target.closest('.brd-cell');
    if (!cellEl) return;
    hoverPos = { r: +cellEl.dataset.r, c: +cellEl.dataset.c };
    refreshSetupBoard();
  }

  function onSetupTouchMove(e) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return;
    const cellEl = el.closest('.brd-cell');
    if (!cellEl) return;
    hoverPos = { r: +cellEl.dataset.r, c: +cellEl.dataset.c };
  }

  function refreshSetupBoard() {
    const state = GameState.get();
    const board = GameState.getBoard(state.setupPlayer);

    let hoverCells = null, validHover = false;
    if (selectedShip && hoverPos) {
      hoverCells = ShipPlacement.cells(hoverPos.r, hoverPos.c, selectedShip.shipDef.size, selectedShip.horiz);
      validHover = ShipPlacement.isValid(board.grid, hoverPos.r, hoverPos.c,
        selectedShip.shipDef.size, selectedShip.horiz, null);
    }
    Render.updateSetupBoard(board.grid, state.setup.placedShips, hoverCells, validHover);
  }

  function tryPlaceShip(r, c) {
    if (!selectedShip) return;
    const state = GameState.get();
    const board = GameState.getBoard(state.setupPlayer);
    const { shipDef, idx, horiz } = selectedShip;
    const shipId = shipDef.id + '_' + idx;

    const ok = ShipPlacement.place(board.grid, r, c, shipDef.size, horiz, shipId, idx);
    if (!ok) {
      // Shake feedback
      const wrap = document.getElementById('board-setup');
      if (wrap) {
        wrap.classList.add('shake');
        setTimeout(() => wrap.classList.remove('shake'), 400);
      }
      return;
    }

    state.setup.placedShips.push({ shipId, shipDef });
    // Remove from queue
    state.setup.shipsToPlace = state.setup.shipsToPlace.filter(s => s.shipId !== shipId);

    selectedShip = null;
    hoverPos = null;

    Render.updateShipList(state.setup.shipsToPlace, state.setup.placedShips);
    refreshSetupBoard();
    updateConfirmBtn();

    // Auto-select next ship
    const next = state.setup.shipsToPlace.find(s =>
      !state.setup.placedShips.some(p => p.shipId === s.shipId));
    if (next) {
      setTimeout(() => selectShip(next.shipDef, next.idx), 100);
    }
  }

  function selectShip(shipDef, idx) {
    const state = GameState.get();
    selectedShip = { shipDef, idx, horiz: state.setup.horiz };
    // Highlight in list
    document.querySelectorAll('.ship-list-item').forEach(el => {
      el.classList.toggle('active', el.dataset.shipId === shipDef.id+'_'+idx);
    });
    document.getElementById('setup-hint').textContent =
      `${shipDef.emoji} ${shipDef.name} (${shipDef.size} Felder) — Klick ins Feld zum Platzieren`;
  }

  function removeAndReselectShip(shipId, shipDef, idx) {
    const state = GameState.get();
    const board = GameState.getBoard(state.setupPlayer);
    ShipPlacement.remove(board.grid, shipId);
    state.setup.placedShips = state.setup.placedShips.filter(p => p.shipId !== shipId);
    state.setup.shipsToPlace.push({ shipDef, idx, shipId });
    Render.updateShipList(state.setup.shipsToPlace, state.setup.placedShips);
    refreshSetupBoard();
    selectShip(shipDef, idx);
    updateConfirmBtn();
  }

  function toggleRotation() {
    const state = GameState.get();
    state.setup.horiz = !state.setup.horiz;
    if (selectedShip) selectedShip.horiz = state.setup.horiz;
    updateRotateBtn();
    refreshSetupBoard();
  }

  function updateRotateBtn() {
    const state = GameState.get();
    const btn = document.getElementById('btn-rotate');
    if (!btn) return;
    const horiz = state.setup ? state.setup.horiz : true;
    btn.textContent = horiz ? '↕ Drehen (Vertikal)' : '↔ Drehen (Horizontal)';
    btn.setAttribute('aria-label', horiz ? 'Schiff vertikal drehen' : 'Schiff horizontal drehen');
  }

  function autoPlaceAll() {
    const state = GameState.get();
    const board = GameState.getBoard(state.setupPlayer);
    const { grid, placed } = ShipPlacement.autoPlace(Config.ships());
    board.grid = grid;
    state.setup.placedShips = placed;
    state.setup.shipsToPlace = [];
    selectedShip = null;
    hoverPos = null;
    Render.updateShipList(state.setup.shipsToPlace, state.setup.placedShips);
    Render.updateSetupBoard(board.grid, state.setup.placedShips, null, false);
    updateConfirmBtn();
  }

  function updateConfirmBtn() {
    const state = GameState.get();
    const total = Config.ships().reduce((s,sh)=>s+sh.count,0);
    const placed = state.setup.placedShips.length;
    const btn = document.getElementById('btn-confirm-setup');
    if (btn) {
      btn.disabled = placed < total;
      btn.textContent = placed < total
        ? `Schiffe platzieren (${placed}/${total})`
        : '✓ Bereit – Weiter';
    }
  }

  function confirmSetup() {
    const state = GameState.get();
    const total = Config.ships().reduce((s,sh)=>s+sh.count,0);
    if (state.setup.placedShips.length < total) return;

    const board = GameState.getBoard(state.setupPlayer);
    board.ships = [...state.setup.placedShips];

    if (state.mode === 'vsAI') {
      // AI auto-places only if not already set (e.g. daily challenge)
      const aiBoard = GameState.getBoard(2);
      if (!aiBoard.ships || !aiBoard.ships.length) {
        const ai = ShipPlacement.autoPlace(Config.ships());
        aiBoard.grid = ai.grid;
        aiBoard.ships = ai.placed;
      }
      startBattle();
    } else {
      if (state.setupPlayer === 1) {
        showPassScreen(2, () => startSetup(2));
      } else {
        startBattle();
      }
    }
  }

  function showPassScreen(player, cb) {
    const screen = document.getElementById('screen-pass');
    if (!screen) { cb(); return; }
    document.getElementById('pass-text').textContent =
      `Gerät an Spieler ${player} übergeben. Nicht auf das Spielfeld schauen!`;
    Render.showScreen('screen-pass');
    clearTimeout(passScreenTimeout);
    const btn = document.getElementById('btn-pass-ready');
    if (btn) {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => { Render.showScreen('screen-setup'); cb(); });
    }
  }

  /* ─── Battle Phase ─────────────────── */
  function startBattle() {
    const state = GameState.get();
    state.phase = 'battle';
    state.currentPlayer = 1;
    state.stats.start = Date.now();

    AI.reset(state.difficulty);

    Render.buildBoard('board-enemy', true, false);
    Render.buildBoard('board-player', false, true);
    Render.showScreen('screen-battle');

    updateBattleDisplay();
    attachBattleEvents();

    Storage.save(state);
  }

  function updateBattleDisplay() {
    const state = GameState.get();
    const b1 = GameState.getBoard(1);
    const b2 = GameState.getBoard(2);

    if (state.mode === 'vsAI') {
      Render.updateBoard('board-enemy',  b2.grid, { showShips: false });
      Render.updateBoard('board-player', b1.grid, { showShips: true });
      Render.updateBoardLabel('lbl-enemy-board',  '🎯 Gegnerisches Feld');
      Render.updateBoardLabel('lbl-player-board', '⚓ Dein Feld');
    } else {
      if (state.currentPlayer === 1) {
        Render.updateBoard('board-enemy',  b2.grid, { showShips: false });
        Render.updateBoard('board-player', b1.grid, { showShips: true });
        Render.updateBoardLabel('lbl-enemy-board',  '🎯 Feld Spieler 2');
        Render.updateBoardLabel('lbl-player-board', '⚓ Dein Feld (P1)');
      } else {
        Render.updateBoard('board-enemy',  b1.grid, { showShips: false });
        Render.updateBoard('board-player', b2.grid, { showShips: true });
        Render.updateBoardLabel('lbl-enemy-board',  '🎯 Feld Spieler 1');
        Render.updateBoardLabel('lbl-player-board', '⚓ Dein Feld (P2)');
      }
    }

    Render.updateTurnBanner(state.phase, state.currentPlayer, state.mode);
    Render.updateStats(b1, b2);
  }

  function attachBattleEvents() {
    const enemyBoard = document.getElementById('board-enemy');
    if (!enemyBoard) return;
    const newBoard = enemyBoard.cloneNode(true);
    enemyBoard.parentNode.replaceChild(newBoard, enemyBoard);

    newBoard.addEventListener('click', onEnemyCellClick);
    newBoard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const cell = e.target.closest('.brd-cell');
        if (cell) onEnemyCellClick({ target: cell });
      }
    });
  }

  function onEnemyCellClick(e) {
    const state = GameState.get();
    if (state.phase !== 'battle') return;
    if (state.mode === 'vsAI' && state.currentPlayer !== 1) return;

    const cellEl = e.target.closest('.brd-cell');
    if (!cellEl) return;
    const r = +cellEl.dataset.r, c = +cellEl.dataset.c;

    const targetPlayer = state.mode === 'vsAI' ? 2 :
      (state.currentPlayer === 1 ? 2 : 1);
    fireShot(state.currentPlayer, targetPlayer, r, c, false);
  }

  function fireShot(attacker, defender, r, c, isAI) {
    const state = GameState.get();
    const targetBoard = GameState.getBoard(defender);
    const result = MoveLogic.shoot(targetBoard, r, c);

    if (result.result === 'already') return;

    // Visual feedback
    const boardId = isAI ? 'board-player' : 'board-enemy';
    const { x, y } = Render.getCellCenter(boardId, r, c);

    if (result.result === 'miss') {
      Animation.splashMiss(x, y);
      Render.flashCell(boardId, r, c, 'cell-flash-miss');
      if (isAI) AI.onMiss();
    } else if (result.result === 'hit') {
      Animation.explode(x, y, '#F57C00');
      Render.flashCell(boardId, r, c, 'cell-flash-hit');
      if (isAI) AI.onHit(r, c, false);
    } else if (result.result === 'sunk') {
      Animation.sunkWave(x, y);
      Render.flashCell(boardId, r, c, 'cell-flash-sunk');
      if (isAI) AI.onHit(r, c, true);
      showSunkMessage(result.shipId);
    }

    // Update display
    updateBattleDisplay();
    Storage.save(state);

    // Check win
    if (MoveLogic.checkWin(targetBoard)) {
      setTimeout(() => endGame(attacker), 600);
      return;
    }

    // Next turn
    if (result.result !== 'miss' && state.mode === 'vsAI') {
      // Attacker gets another turn on hit (optional rule — standard is always switch)
      // We switch regardless for fairness
    }
    switchTurn(result);
  }

  function switchTurn(result) {
    const state = GameState.get();
    if (state.phase !== 'battle') return;

    if (state.mode === 'vsAI') {
      if (state.currentPlayer === 1) {
        state.currentPlayer = 2;
        Render.updateTurnBanner(state.phase, 2, state.mode);
        clearTimeout(aiMoveTimeout);
        aiMoveTimeout = setTimeout(doAIMove, 950 + Math.random()*400);
      } else {
        state.currentPlayer = 1;
        updateBattleDisplay();
        attachBattleEvents();
      }
    } else {
      // 2P local: pass device
      const next = state.currentPlayer === 1 ? 2 : 1;
      state.currentPlayer = next;
      showPassScreen(next, () => {
        updateBattleDisplay();
        attachBattleEvents();
      });
    }
  }

  function doAIMove() {
    const state = GameState.get();
    if (state.phase !== 'battle' || state.currentPlayer !== 2) return;
    const b1 = GameState.getBoard(1);
    const move = AI.chooseMove(b1.grid);
    if (!move) { state.currentPlayer = 1; updateBattleDisplay(); return; }
    fireShot(2, 1, move.r, move.c, true);
  }

  function showSunkMessage(shipId) {
    const id = shipId.replace(/_\d+$/, '');
    const ship = Config.ships().find(s => s.id === id);
    if (!ship) return;
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = `${ship.emoji} ${ship.name} versenkt!`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  /* ─── Game Over ─────────────────────── */
  function endGame(winner) {
    const state = GameState.get();
    state.phase = 'gameover';
    state.winner = winner;
    clearTimeout(aiMoveTimeout);

    const b = GameState.getBoard(winner);
    const elapsed = Math.floor((Date.now() - state.stats.start) / 1000);
    const mins = Math.floor(elapsed/60), secs = elapsed%60;
    const timeStr = `${mins}:${secs.toString().padStart(2,'0')}`;

    const attackerBoard = GameState.getBoard(winner === 1 ? 2 : 1);

    // Reveal all ships
    if (state.mode === 'vsAI') {
      Render.updateBoard('board-enemy', GameState.getBoard(2).grid, {showShips:true});
    }

    // Show winner dialog
    const isHuman = state.mode === 'vsAI' ? winner === 1 : true;
    document.getElementById('dlg-icon').textContent = winner === 1 && state.mode==='vsAI' ? '🎉' : winner === 2 && state.mode==='vsAI' ? '🤖' : '🏆';
    document.getElementById('dlg-headline').textContent =
      state.mode === 'vsAI'
        ? (winner === 1 ? 'Du hast gewonnen!' : 'Computer gewinnt!')
        : `Spieler ${winner} gewinnt!`;
    document.getElementById('dlg-shots').textContent   = attackerBoard.shotsFired;
    document.getElementById('dlg-hits').textContent    = attackerBoard.hits;
    document.getElementById('dlg-time').textContent    = timeStr;

    // Save highscore for player 1 vs AI win
    if (state.mode === 'vsAI' && winner === 1) {
      Storage.addHighscore({
        shots: attackerBoard.shotsFired,
        hits:  attackerBoard.hits,
        time:  elapsed,
        difficulty: state.difficulty,
        date: new Date().toLocaleDateString('de-DE'),
      });
      if (state.dailySeed) {
        Storage.setDailyCompleted(state.dailySeed, attackerBoard.shotsFired);
      }
    }

    Storage.clearSave();
    Render.showDialog('dialog-gameover');

    // Reveal enemy board fully
    updateBattleDisplay();
  }

  /* ─── Menu ─────────────────────────── */
  function startGame(mode, difficulty) {
    const state = GameState.init(mode, difficulty === 'daily' ? 'hard' : difficulty);

    if (difficulty === 'daily') {
      const dateStr = DailyChallenge.getTodayStr();
      const { grid, placed } = DailyChallenge.generatePlacement(dateStr);
      state.dailySeed = dateStr;
      state.boards[2] = { grid, ships: placed, shotsFired: 0, hits: 0 };
    }

    startSetup(1);
  }

  function restartGame() {
    Render.hideDialog('dialog-gameover');
    const state = GameState.get();
    const mode = state ? state.mode : 'vsAI';
    const diff = state ? state.difficulty : 'medium';
    startGame(mode, diff);
  }

  function resumeGame() {
    const saved = Storage.load();
    if (!saved || saved.phase === 'gameover') return false;
    Storage.clearSave(); // clear for now; full resume requires deep restore
    return false;
  }

  /* ─── Share / Highscores ────────────── */
  function shareResult() {
    const state = GameState.get();
    const b = GameState.getBoard(1);
    const txt = `Schiffe versenken auf klickspiele.de 🚢\n` +
      `Schwierigkeit: ${state.difficulty || 'Mittel'}\n` +
      `Schüsse: ${GameState.getBoard(state.winner === 1 ? 2 : 1).shotsFired}\n` +
      `Ergebnis: ${state.winner===1?'Gewonnen! 🎉':'Verloren 😅'}\n` +
      `https://klickspiele.de`;
    if (navigator.share) {
      navigator.share({ title: 'Schiffe versenken', text: txt }).catch(()=>{});
    } else {
      navigator.clipboard && navigator.clipboard.writeText(txt).then(()=>{
        const btn = document.getElementById('btn-share');
        if (btn) { btn.textContent = '✓ Kopiert!'; setTimeout(()=>btn.textContent='Teilen',2000); }
      });
    }
  }

  function showHighscores() {
    const scores = Storage.getHighscores();
    const list = document.getElementById('hs-list');
    if (!list) return;
    if (!scores.length) {
      list.innerHTML = '<p style="text-align:center;color:var(--c-on-surf-var)">Noch keine Highscores vorhanden.</p>';
    } else {
      list.innerHTML = scores.map((s,i)=>
        `<div class="hs-row">
          <span class="hs-rank">${i+1}.</span>
          <span class="hs-shots">${s.shots} Schüsse</span>
          <span class="hs-diff">${s.difficulty||'?'}</span>
          <span class="hs-date">${s.date||''}</span>
        </div>`
      ).join('');
    }
    Render.showDialog('dialog-highscores');
  }

  return {
    startGame, restartGame, resumeGame, startSetup, confirmSetup,
    autoPlaceAll, toggleRotation, selectShip, removeAndReselectShip,
    shareResult, showHighscores, doAIMove,
  };
})();

/* ══════════════════════════════════════
   12. INIT
══════════════════════════════════════ */
(function init() {
  // Dark mode
  if (Storage.getDark()) document.body.classList.add('dark-mode');

  const btnDark = document.getElementById('btn-dark');
  if (btnDark) {
    btnDark.addEventListener('click', () => {
      const on = document.body.classList.toggle('dark-mode');
      Storage.setDark(on);
      btnDark.setAttribute('aria-label', on ? 'Helles Design' : 'Dunkles Design');
    });
  }

  // Mode buttons
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      const diff = document.querySelector('.diff-opt.active')?.dataset.diff || 'medium';
      UIController.startGame(mode, diff);
    });
  });

  // Difficulty buttons
  document.querySelectorAll('.diff-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Daily challenge button
  const btnDaily = document.getElementById('btn-daily');
  if (btnDaily) {
    const dateStr = DailyChallenge.getTodayStr();
    const completed = Storage.getDailyCompleted(dateStr);
    if (completed) {
      btnDaily.textContent = `📅 Daily (${completed} Schüsse)`;
      btnDaily.title = `Heute bereits gespielt: ${completed} Schüsse`;
    }
    btnDaily.addEventListener('click', () => UIController.startGame('vsAI', 'daily'));
  }

  // Setup controls
  const btnRotate = document.getElementById('btn-rotate');
  if (btnRotate) btnRotate.addEventListener('click', UIController.toggleRotation);

  const btnAuto = document.getElementById('btn-auto-place');
  if (btnAuto) btnAuto.addEventListener('click', UIController.autoPlaceAll);

  const btnConfirm = document.getElementById('btn-confirm-setup');
  if (btnConfirm) btnConfirm.addEventListener('click', UIController.confirmSetup);

  // Battle controls
  const btnRestart = document.getElementById('btn-restart');
  if (btnRestart) btnRestart.addEventListener('click', () => {
    if (confirm('Neues Spiel starten?')) UIController.restartGame();
  });

  // Dialog controls
  const btnPlayAgain = document.getElementById('btn-play-again');
  if (btnPlayAgain) btnPlayAgain.addEventListener('click', UIController.restartGame);

  const btnMenu = document.getElementById('btn-go-menu');
  if (btnMenu) btnMenu.addEventListener('click', () => {
    Render.hideDialog('dialog-gameover');
    Render.showScreen('screen-menu');
  });

  const btnShare = document.getElementById('btn-share');
  if (btnShare) btnShare.addEventListener('click', UIController.shareResult);

  const btnHighscores = document.getElementById('btn-highscores');
  if (btnHighscores) btnHighscores.addEventListener('click', UIController.showHighscores);

  const btnHsClose = document.getElementById('btn-hs-close');
  if (btnHsClose) btnHsClose.addEventListener('click', () => Render.hideDialog('dialog-highscores'));

  // Close dialogs on scrim click
  document.querySelectorAll('.dialog-scrim').forEach(scrim => {
    scrim.addEventListener('click', (e) => {
      if (e.target === scrim) Render.hideDialog(scrim.id);
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
      const state = GameState.get();
      if (state && state.phase === 'setup') UIController.toggleRotation();
    }
  });

  // Resume saved game prompt
  const saved = Storage.load();
  if (saved && saved.phase === 'battle') {
    const resume = document.getElementById('btn-resume');
    if (resume) {
      resume.hidden = false;
      resume.addEventListener('click', () => {
        // Reconstruct state from save
        // For simplicity, start fresh (full resume would need deep object restoration)
        Storage.clearSave();
        resume.hidden = true;
      });
    }
  }

  // Show menu
  Render.showScreen('screen-menu');
})();
