/**
 * game.js — Kreuzworträtsel Engine v1.0 · klickspiele.de
 * Vanilla JS · No dependencies · Mobile First
 * ─────────────────────────────────────────────────────
 * Modules: Config · State · Grid · Input · Validation
 *          Hint · Timer · Scoring · Render · Animation
 *          Storage · UI
 */

const CrosswordApp = (() => {
  'use strict';

  /* ═══════════════════════════════════════════════════
     1 · CONFIG — puzzle data & settings (dynamic)
  ═══════════════════════════════════════════════════ */
  const Config = (() => {
    // Aktives Rätsel — wird von PuzzleManager gesetzt
    let _puzzle = null;

    const SETTINGS = {
      STORAGE_KEY:  'cw_klick_v1',
      SCORES_KEY:   'cw_scores_v1',
      DARK_KEY:     'darkMode',
      POINTS: {
        LETTER:          10,
        WORD_BONUS:      50,
        HINT_PENALTY:    25,
        REVEAL_PENALTY: 100,
        TIME_BONUS_MAX:  300,
        TIME_WINDOW:     300,
      },
    };

    return {
      get PUZZLE()    { return _puzzle; },
      set PUZZLE(p)   { _puzzle = p; },
      get SETTINGS()  { return SETTINGS; },
    };
  })();


  /* ═══════════════════════════════════════════════════
     1b · PUZZLE MANAGER — Auswahl, Wechsel, Browser
  ═══════════════════════════════════════════════════ */
  const PuzzleManager = (() => {
    let _currentEntry = null;
    let _currentCategory = 'all';
    let _list = [];
    let _page = 0;
    const PAGE_SIZE = 12;

    function _hasPuzzleDB() {
      return typeof PuzzleDB !== 'undefined';
    }

    function loadEntry(entry) {
      if (!_hasPuzzleDB()) return false;
      const puzzle = PuzzleDB.loadFromEntry(entry);
      if (!puzzle) return false;
      _currentEntry = entry;
      Config.PUZZLE = puzzle;
      return true;
    }

    function loadFirst() {
      if (!_hasPuzzleDB()) {
        // Fallback: internes Featured-Rätsel
        Config.PUZZLE = _FALLBACK_PUZZLE;
        return;
      }
      const daily = PuzzleDB.daily();
      if (daily) { Config.PUZZLE = daily; return; }
      const featured = PuzzleDB.getFeatured(0);
      if (featured) { Config.PUZZLE = featured; }
    }

    function refreshList(categoryKey) {
      if (!_hasPuzzleDB()) return;
      _currentCategory = categoryKey || 'all';
      _list = PuzzleDB.getList(_currentCategory === 'all' ? null : _currentCategory);
      _page = 0;
    }

    function getPage() {
      const start = _page * PAGE_SIZE;
      return _list.slice(start, start + PAGE_SIZE);
    }

    function nextPage() { if ((_page + 1) * PAGE_SIZE < _list.length) _page++; }
    function prevPage() { if (_page > 0) _page--; }

    function hasNextPage() { return (_page + 1) * PAGE_SIZE < _list.length; }
    function hasPrevPage() { return _page > 0; }

    function pageInfo() {
      const total = _list.length;
      const start = _page * PAGE_SIZE + 1;
      const end   = Math.min((_page + 1) * PAGE_SIZE, total);
      return `${start}–${end} von ${total}`;
    }

    return {
      loadFirst, loadEntry, refreshList,
      getPage, nextPage, prevPage,
      hasNextPage, hasPrevPage, pageInfo,
      get categories() {
        return _hasPuzzleDB() ? PuzzleDB.categories : [];
      },
      get currentCategory() { return _currentCategory; },
      get currentPuzzleId() { return Config.PUZZLE?.id ?? null; },
    };
  })();

  // Fallback-Rätsel (wenn puzzles.js nicht geladen)
  const _FALLBACK_PUZZLE = {
    id: 'kw-001', title: 'Kreuzworträtsel #1', rows: 11, cols: 11,
    grid: [
      ['■','B','R','O','T','■','■','K','U','H','■'],
      ['■','■','■','■','E','U','R','O','P','A','■'],
      ['■','■','■','■','N','■','■','■','■','H','■'],
      ['■','■','■','■','N','E','H','M','E','N','■'],
      ['■','■','■','■','E','S','S','E','N','■','■'],
      ['■','■','■','■','■','■','■','■','■','■','■'],
      ['S','O','N','N','E','■','■','W','I','N','D'],
      ['■','■','■','■','■','■','■','■','■','■','■'],
      ['■','K','A','T','Z','E','■','■','■','■','■'],
      ['■','■','■','■','■','■','■','■','■','■','■'],
      ['■','■','■','■','■','■','■','■','■','■','■'],
    ],
    words: [
      {id:1,number:1,dir:'H',row:0,col:1,answer:'BROT',  clue:'Grundnahrungsmittel aus Mehl'},
      {id:2,number:3,dir:'H',row:0,col:7,answer:'KUH',   clue:'Milchgebendes Nutztier'},
      {id:3,number:5,dir:'H',row:1,col:4,answer:'EUROPA',clue:'Kontinent mit Deutschland und Frankreich'},
      {id:4,number:6,dir:'H',row:3,col:4,answer:'NEHMEN',clue:'Etwas ergreifen'},
      {id:5,number:7,dir:'H',row:4,col:4,answer:'ESSEN', clue:'Nahrung aufnehmen; Ruhrgebietsstadt'},
      {id:6,number:8,dir:'H',row:6,col:0,answer:'SONNE', clue:'Unser Tagesstern'},
      {id:7,number:9,dir:'H',row:6,col:7,answer:'WIND',  clue:'Horizontale Luftbewegung'},
      {id:8,number:10,dir:'H',row:8,col:1,answer:'KATZE',clue:'Schnurrendes Haustier'},
      {id:9,number:2,dir:'V',row:0,col:4,answer:'TENNE', clue:'Dreschboden in der Scheune'},
      {id:10,number:4,dir:'V',row:0,col:9,answer:'HAHN', clue:'Männliches Huhn'},
    ],
  };


  /* ═══════════════════════════════════════════════════
     2 · STATE — single source of truth
  ═══════════════════════════════════════════════════ */
  const State = (() => {
    // Private
    let _cells   = [];
    let _words   = [];
    let _wordMap = {};

    let _selRow    = -1;
    let _selCol    = -1;
    let _selWordId = null;
    let _dir       = 'H';    // 'H' | 'V'

    let _mode      = 'classic';
    let _elapsed   = 0;
    let _score     = 0;
    let _hints     = 0;
    let _complete  = false;
    let _paused    = false;

    function init(puzzle) {
      _cells = []; _words = []; _wordMap = {};
      _selRow = -1; _selCol = -1; _selWordId = null; _dir = 'H';
      _elapsed = 0; _score = 0; _hints = 0;
      _complete = false; _paused = false;

      // Build cell matrix
      for (let r = 0; r < puzzle.rows; r++) {
        _cells[r] = [];
        for (let c = 0; c < puzzle.cols; c++) {
          const sol = puzzle.grid[r][c];
          _cells[r][c] = {
            row: r, col: c,
            isBlack:  sol === '■',
            letter:   '',
            solution: sol === '■' ? null : sol,
            number:   null,
            wordIds:  [],
            el:       null,
            verified: false,
            revealed: false,
          };
        }
      }

      // Register words, link cells
      puzzle.words.forEach(w => {
        const cells = [];
        for (let i = 0; i < w.answer.length; i++) {
          const r = w.dir === 'H' ? w.row     : w.row + i;
          const c = w.dir === 'H' ? w.col + i : w.col;
          cells.push({ row: r, col: c });
          if (!_cells[r][c].wordIds.includes(w.id))
            _cells[r][c].wordIds.push(w.id);
        }
        // Assign clue number to start cell (first write wins)
        const start = _cells[w.row][w.col];
        if (start.number === null) start.number = w.number;

        _wordMap[w.id] = { ...w, cells, complete: false, correct: false };
        _words.push(_wordMap[w.id]);
      });

      _words.sort((a, b) => a.number - b.number || (a.dir === 'H' ? -1 : 1));
    }

    function cell(r, c) {
      const p = Config.PUZZLE;
      if (r < 0 || r >= p.rows || c < 0 || c >= p.cols) return null;
      return _cells[r]?.[c] ?? null;
    }

    function wordForCell(r, c, dir) {
      const cl = cell(r, c);
      if (!cl) return null;
      return cl.wordIds.map(id => _wordMap[id]).find(w => w?.dir === dir) ?? null;
    }

    function setLetter(r, c, letter) {
      const cl = cell(r, c);
      if (!cl || cl.isBlack || cl.revealed) return;
      cl.letter   = letter ? letter.toUpperCase() : '';
      cl.verified = false;
    }

    function updateWordStatus(wordId) {
      const w = _wordMap[wordId];
      if (!w) return;
      w.complete = w.cells.every(({ row, col }) => _cells[row][col].letter !== '');
      w.correct  = w.cells.every(({ row, col }, i) => _cells[row][col].letter === w.answer[i]);
    }

    function allComplete() {
      return _words.length > 0 && _words.every(w => w.correct);
    }

    return {
      get cells()     { return _cells;      },
      get words()     { return _words;      },
      get wordMap()   { return _wordMap;    },
      get selRow()    { return _selRow;     },
      get selCol()    { return _selCol;     },
      get selWordId() { return _selWordId;  },
      get dir()       { return _dir;        },
      get mode()      { return _mode;       },
      get elapsed()   { return _elapsed;    },
      get score()     { return _score;      },
      get hints()     { return _hints;      },
      get complete()  { return _complete;   },
      get paused()    { return _paused;     },

      set selRow(v)    { _selRow    = v; },
      set selCol(v)    { _selCol    = v; },
      set selWordId(v) { _selWordId = v; },
      set dir(v)       { _dir       = v; },
      set mode(v)      { _mode      = v; },
      set elapsed(v)   { _elapsed   = v; },
      set score(v)     { _score     = v; },
      set hints(v)     { _hints     = v; },
      set complete(v)  { _complete  = v; },
      set paused(v)    { _paused    = v; },

      init, cell, wordForCell, setLetter, updateWordStatus, allComplete,
    };
  })();


  /* ═══════════════════════════════════════════════════
     3 · GRID — navigation helpers
  ═══════════════════════════════════════════════════ */
  const Grid = {
    /** Initialise the puzzle — delegates to State.init */
    build(puzzle) {
      State.init(puzzle || Config.PUZZLE);
    },

    /** Next cell in the current word after (r,c).
     *  Prefers first empty cell; falls back to next cell. */
    nextCellInWord(r, c, wordId) {
      const word = State.wordMap[wordId];
      if (!word) return null;
      const idx = word.cells.findIndex(p => p.row === r && p.col === c);
      if (idx < 0) return null;
      // First empty cell ahead
      for (let i = idx + 1; i < word.cells.length; i++) {
        const p = word.cells[i];
        if (State.cells[p.row][p.col].letter === '') return p;
      }
      // No empty ahead → just advance one step
      return idx + 1 < word.cells.length ? word.cells[idx + 1] : null;
    },

    prevCellInWord(r, c, wordId) {
      const word = State.wordMap[wordId];
      if (!word) return null;
      const idx = word.cells.findIndex(p => p.row === r && p.col === c);
      return idx > 0 ? word.cells[idx - 1] : null;
    },

    /** Navigate by arrow key, skipping black cells */
    arrowNeighbour(r, c, key) {
      const deltas = {
        ArrowUp:    [-1, 0],
        ArrowDown:  [ 1, 0],
        ArrowLeft:  [ 0,-1],
        ArrowRight: [ 0, 1],
      };
      const d = deltas[key];
      if (!d) return null;
      const p = Config.PUZZLE;
      let nr = r + d[0], nc = c + d[1];
      while (nr >= 0 && nr < p.rows && nc >= 0 && nc < p.cols) {
        const cell = State.cell(nr, nc);
        if (cell && !cell.isBlack) return { row: nr, col: nc };
        nr += d[0]; nc += d[1];
      }
      return null;
    },

    /** Determine preferred entry direction for a cell */
    preferredDir(r, c) {
      const hasH = !!State.wordForCell(r, c, 'H');
      const hasV = !!State.wordForCell(r, c, 'V');
      if (hasH && hasV) return State.dir;   // keep current
      if (hasH) return 'H';
      if (hasV) return 'V';
      return 'H';
    },
  };

  /* ═══════════════════════════════════════════════════
     4 · INPUT — keyboard, mouse & touch
  ═══════════════════════════════════════════════════ */
  const Input = {
    _hiddenInput: null,

    init() {
      this._hiddenInput = document.getElementById('cw-hidden-input');

      // Grid pointer delegation
      const grid = document.getElementById('cw-grid');
      if (grid) {
        grid.addEventListener('pointerdown', e => {
          const el = e.target.closest('.cw-cell:not(.cw-cell--black)');
          if (!el) return;
          e.preventDefault();
          this._clickCell(+el.dataset.r, +el.dataset.c);
        }, { passive: false });
      }

      // Hidden input — physical + virtual keyboard
      if (this._hiddenInput) {
        this._hiddenInput.addEventListener('keydown', e => this._onKeyDown(e));
        this._hiddenInput.addEventListener('input',   e => this._onInput(e));
        this._hiddenInput.addEventListener('blur', () => {
          if (!State.complete && !State.paused && State.selRow >= 0) {
            setTimeout(() => this._hiddenInput?.focus({ preventScroll: true }), 80);
          }
        });
      }

      // Keyboard nav when cell element itself is focused (tab users / screenreaders)
      grid?.addEventListener('keydown', e => {
        const el = e.target.closest('.cw-cell:not(.cw-cell--black)');
        if (!el) return;
        const r = +el.dataset.r, c = +el.dataset.c;
        if (State.selRow !== r || State.selCol !== c) this._clickCell(r, c);
        this._onKeyDown(e);
      });
    },

    /** Public: focus a specific word from clue list */
    selectWord(wordId) {
      const word = State.wordMap[wordId];
      if (!word) return;
      State.dir = word.dir;
      // Jump to first empty cell in word, else first cell
      const target = word.cells.find(p => State.cells[p.row][p.col].letter === '')
        ?? word.cells[0];
      this._clickCell(target.row, target.col);
    },

    // ── Private ────────────────────────────────────────

    _clickCell(r, c) {
      if (State.complete || State.paused) return;
      const cell = State.cell(r, c);
      if (!cell || cell.isBlack) return;

      Timer.start();

      const sameCell = (State.selRow === r && State.selCol === c);

      if (sameCell) {
        // Toggle direction if cell belongs to words in both orientations
        const hasH = !!State.wordForCell(r, c, 'H');
        const hasV = !!State.wordForCell(r, c, 'V');
        if (hasH && hasV) State.dir = State.dir === 'H' ? 'V' : 'H';
      } else {
        State.dir = Grid.preferredDir(r, c);
      }

      State.selRow    = r;
      State.selCol    = c;
      State.selWordId = State.wordForCell(r, c, State.dir)?.id ?? null;

      Render.allCells();
      Render.activeClue();
      Render.clueHighlight();

      // Scroll active clue into view on small screens
      document.querySelector(`.cw-clue[data-wid="${State.selWordId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      this._focusHidden();
    },

    _focusHidden() {
      if (!this._hiddenInput) return;
      this._hiddenInput.value = '';
      this._hiddenInput.focus({ preventScroll: true });
    },

    _onKeyDown(e) {
      if (State.complete || State.paused || State.selRow < 0) return;
      const key = e.key;

      if (/^[a-zA-ZäöüÄÖÜß]$/.test(key)) {
        e.preventDefault();
        this._enterLetter(key);
        return;
      }

      switch (key) {
        case 'Backspace':
        case 'Delete':
          e.preventDefault();
          this._deleteBack();
          break;

        case 'Tab':
          e.preventDefault();
          this._jumpWord(e.shiftKey ? -1 : 1);
          break;

        case 'Enter':
          e.preventDefault();
          Validation.checkCurrentWord();
          break;

        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight': {
          e.preventDefault();
          const isHKey = key === 'ArrowLeft' || key === 'ArrowRight';
          const wantDir = isHKey ? 'H' : 'V';

          // Same direction already → move spatially
          if (State.dir === wantDir) {
            const next = Grid.arrowNeighbour(State.selRow, State.selCol, key);
            if (next) this._clickCell(next.row, next.col);
          } else {
            // Switch direction if word exists in that orientation
            if (State.wordForCell(State.selRow, State.selCol, wantDir)) {
              State.dir       = wantDir;
              State.selWordId = State.wordForCell(State.selRow, State.selCol, wantDir)?.id ?? null;
              Render.allCells();
              Render.activeClue();
              Render.clueHighlight();
            }
          }
          break;
        }

        case 'Escape':
          State.selRow = -1; State.selCol = -1; State.selWordId = null;
          Render.allCells();
          Render.activeClue();
          break;
      }
    },

    /** Virtual keyboard / paste via input event */
    _onInput(e) {
      const val = this._hiddenInput.value;
      if (!val) return;
      const last = val[val.length - 1];
      if (/[a-zA-Z]/.test(last)) this._enterLetter(last);
      this._hiddenInput.value = '';
    },

    _enterLetter(rawLetter) {
      const r = State.selRow, c = State.selCol;
      const cell = State.cell(r, c);
      if (!cell || cell.isBlack || cell.revealed) return;

      State.setLetter(r, c, rawLetter);
      Animation.pop(r, c);
      Render.cell(r, c);
      Storage.save();

      if (State.selWordId !== null) {
        State.updateWordStatus(State.selWordId);
        const word = State.wordMap[State.selWordId];
        if (word?.correct) {
          Scoring.onWordCorrect(word.id);
          Render.wordDone(word.id);
          if (State.allComplete()) {
            UI.onGameComplete();
            return;
          }
          this._jumpWord(1);
          return;
        }
      }

      // Advance cursor within word
      const next = Grid.nextCellInWord(r, c, State.selWordId);
      if (next) {
        State.selRow = next.row;
        State.selCol = next.col;
        Render.allCells();
        Render.activeClue();
      }
    },

    _deleteBack() {
      const r = State.selRow, c = State.selCol;
      const cell = State.cell(r, c);
      if (!cell || cell.revealed) return;

      if (cell.letter !== '') {
        State.setLetter(r, c, '');
        Render.cell(r, c);
        Storage.save();
      } else {
        // Move to previous cell and clear it
        const prev = State.selWordId
          ? Grid.prevCellInWord(r, c, State.selWordId) : null;
        if (prev) {
          State.selRow = prev.row;
          State.selCol = prev.col;
          const prevCell = State.cell(prev.row, prev.col);
          if (prevCell && !prevCell.revealed) {
            State.setLetter(prev.row, prev.col, '');
          }
          Render.allCells();
          Render.activeClue();
          Storage.save();
        }
      }
    },

    _jumpWord(delta) {
      const ids = State.words.map(w => w.id);
      if (!ids.length) return;
      // Skip already-correct words when jumping forward
      let idx = ids.indexOf(State.selWordId);
      let tries = 0;
      do {
        idx = (idx + delta + ids.length) % ids.length;
        tries++;
      } while (State.wordMap[ids[idx]]?.correct && tries < ids.length);
      this.selectWord(ids[idx]);
    },
  };


  /* ═══════════════════════════════════════════════════
     5 · VALIDATION — letter / word / game checks
  ═══════════════════════════════════════════════════ */
  const Validation = {
    /** Check every filled cell against solution; mark .verified */
    checkAllLetters() {
      const p = Config.PUZZLE;
      let errors = 0;
      for (let r = 0; r < p.rows; r++) {
        for (let c = 0; c < p.cols; c++) {
          const cell = State.cell(r, c);
          if (!cell || cell.isBlack || !cell.letter) continue;
          const correct = cell.letter === cell.solution;
          cell.verified = correct;
          if (!correct) {
            errors++;
            Animation.shake(r, c);
          }
          Render.cell(r, c);
        }
      }
      return errors;
    },

    /** Check only the currently selected word */
    checkCurrentWord() {
      if (State.selWordId === null) return 0;
      const word = State.wordMap[State.selWordId];
      if (!word) return 0;
      let errors = 0;
      word.cells.forEach(({ row, col }, i) => {
        const cell = State.cell(row, col);
        if (!cell || cell.isBlack || !cell.letter) return;
        const correct = cell.letter === word.answer[i];
        cell.verified = correct;
        if (!correct) { errors++; Animation.shake(row, col); }
        Render.cell(row, col);
      });
      return errors;
    },

    /** Verify full puzzle is correct (for game-complete detection) */
    isPuzzleSolved() {
      return State.allComplete();
    },
  };


  /* ═══════════════════════════════════════════════════
     6 · HINT — reveal mechanics
  ═══════════════════════════════════════════════════ */
  const Hint = {
    /** Reveal the currently selected letter */
    revealLetter() {
      const r = State.selRow, c = State.selCol;
      const cell = State.cell(r, c);
      if (!cell || cell.isBlack || cell.revealed) return;

      cell.letter   = cell.solution;
      cell.revealed = true;
      cell.verified = true;
      State.hints++;
      Scoring.applyPenalty(Config.SETTINGS.POINTS.HINT_PENALTY);
      Animation.pop(r, c);
      Render.cell(r, c);
      Render.score();

      if (State.selWordId !== null) {
        State.updateWordStatus(State.selWordId);
        const word = State.wordMap[State.selWordId];
        if (word?.correct) {
          Render.wordDone(word.id);
          if (State.allComplete()) UI.onGameComplete();
        }
      }
      Storage.save();
    },

    /** Reveal every letter in the currently selected word */
    revealWord() {
      if (State.selWordId === null) return;
      const word = State.wordMap[State.selWordId];
      if (!word) return;
      word.cells.forEach(({ row, col }, i) => {
        const cell = State.cell(row, col);
        if (!cell || cell.isBlack || cell.revealed) return;
        cell.letter   = word.answer[i];
        cell.revealed = true;
        cell.verified = true;
        Render.cell(row, col);
      });
      State.hints++;
      Scoring.applyPenalty(Config.SETTINGS.POINTS.REVEAL_PENALTY);
      State.updateWordStatus(word.id);
      Render.wordDone(word.id);
      Render.score();
      if (State.allComplete()) UI.onGameComplete();
      Storage.save();
    },

    /** Reveal entire puzzle */
    revealAll() {
      const p = Config.PUZZLE;
      for (let r = 0; r < p.rows; r++) {
        for (let c = 0; c < p.cols; c++) {
          const cell = State.cell(r, c);
          if (!cell || cell.isBlack || cell.revealed) continue;
          cell.letter   = cell.solution;
          cell.revealed = true;
          cell.verified = true;
          Render.cell(r, c);
        }
      }
      Scoring.applyPenalty(Config.SETTINGS.POINTS.REVEAL_PENALTY * 5);
      State.words.forEach(w => {
        State.updateWordStatus(w.id);
        Render.wordDone(w.id);
      });
      Render.score();
      UI.onGameComplete();
      Storage.save();
    },
  };


  /* ═══════════════════════════════════════════════════
     7 · TIMER — stopwatch & pause
  ═══════════════════════════════════════════════════ */
  const Timer = (() => {
    let _rafId   = null;
    let _started = false;
    let _lastTs  = 0;

    function _tick(ts) {
      if (!_started || State.paused || State.complete) return;
      if (_lastTs) {
        const delta = (ts - _lastTs) / 1000;
        State.elapsed = Math.floor(State.elapsed + delta);
        Render.timer();
      }
      _lastTs = ts;
      _rafId = requestAnimationFrame(_tick);
    }

    function start() {
      if (_started) return;
      _started = true;
      _lastTs  = 0;
      _rafId   = requestAnimationFrame(_tick);
    }

    function pause() {
      State.paused = true;
      if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
    }

    function resume() {
      if (!State.paused) return;
      State.paused = false;
      _lastTs = 0;
      _rafId  = requestAnimationFrame(_tick);
    }

    function stop() {
      _started = false;
      State.paused = false;
      if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
    }

    function reset() {
      stop();
      _started = false;
      State.elapsed = 0;
      Render.timer();
    }

    function togglePause() {
      State.paused ? resume() : pause();
      UI.updatePauseBtn();
    }

    return { start, pause, resume, stop, reset, togglePause };
  })();


  /* ═══════════════════════════════════════════════════
     8 · SCORING — points calculation
  ═══════════════════════════════════════════════════ */
  const Scoring = {
    onWordCorrect(wordId) {
      const word  = State.wordMap[wordId];
      if (!word) return;
      const pts   = Config.SETTINGS.POINTS;
      let   bonus = pts.WORD_BONUS;
      // Letter points for unrevealed cells
      word.cells.forEach(({ row, col }) => {
        if (!State.cells[row][col].revealed) bonus += pts.LETTER;
      });
      State.score += bonus;
      Render.score();
      Animation.scoreFlash(bonus);
    },

    applyPenalty(amount) {
      State.score = Math.max(0, State.score - amount);
      Render.score();
    },

    /** Final time bonus — awarded on game complete */
    timeBonus() {
      const pts = Config.SETTINGS.POINTS;
      if (State.elapsed <= 0) return 0;
      const ratio = Math.max(0, 1 - State.elapsed / pts.TIME_WINDOW);
      return Math.round(pts.TIME_BONUS_MAX * ratio);
    },

    finalScore() {
      return State.score + this.timeBonus();
    },
  };

  /* ═══════════════════════════════════════════════════
     9 · RENDER — minimal, targeted DOM updates
  ═══════════════════════════════════════════════════ */
  const Render = {
    /** Build the grid DOM from scratch */
    buildGrid() {
      const gridEl = document.getElementById('cw-grid');
      if (!gridEl) return;
      const p = Config.PUZZLE;

      gridEl.innerHTML = '';
      gridEl.style.setProperty('--cw-cols', p.cols);
      gridEl.style.setProperty('--cw-rows', p.rows);
      gridEl.setAttribute('aria-label', 'Kreuzworträtsel Gitter');
      gridEl.setAttribute('role', 'grid');

      for (let r = 0; r < p.rows; r++) {
        const rowEl = document.createElement('div');
        rowEl.setAttribute('role', 'row');
        rowEl.className = 'cw-row';

        for (let c = 0; c < p.cols; c++) {
          const data = State.cells[r][c];
          const el   = document.createElement('div');

          if (data.isBlack) {
            el.className = 'cw-cell cw-cell--black';
            el.setAttribute('role', 'gridcell');
            el.setAttribute('aria-hidden', 'true');
          } else {
            el.className = 'cw-cell';
            el.dataset.r  = r;
            el.dataset.c  = c;
            el.setAttribute('role',     'gridcell');
            el.setAttribute('tabindex', '0');
            el.setAttribute('aria-label', `Zeile ${r+1}, Spalte ${c+1}, leer`);

            if (data.number !== null) {
              const num   = document.createElement('span');
              num.className = 'cw-cell__num';
              num.textContent = data.number;
              num.setAttribute('aria-hidden', 'true');
              el.appendChild(num);
            }

            const letter = document.createElement('span');
            letter.className = 'cw-cell__letter';
            letter.setAttribute('aria-hidden', 'true');
            el.appendChild(letter);
          }

          data.el = el;
          rowEl.appendChild(el);
        }
        gridEl.appendChild(rowEl);
      }
    },

    /** Update a single cell's visual state */
    cell(r, c) {
      const data = State.cell(r, c);
      if (!data || data.isBlack || !data.el) return;
      const el = data.el;

      // Letter text
      const letterEl = el.querySelector('.cw-cell__letter');
      if (letterEl) letterEl.textContent = data.letter;

      // Determine highlight class
      const isActive  = (State.selRow === r && State.selCol === c);
      const activeWord = State.selWordId ? State.wordMap[State.selWordId] : null;
      const isInWord  = !isActive && !!activeWord?.cells.some(p => p.row === r && p.col === c);

      el.classList.remove(
        'cw-cell--active', 'cw-cell--word',
        'cw-cell--correct', 'cw-cell--error', 'cw-cell--revealed'
      );

      if      (data.revealed) el.classList.add('cw-cell--revealed');
      else if (data.verified) el.classList.add('cw-cell--correct');

      if      (isActive)  el.classList.add('cw-cell--active');
      else if (isInWord)  el.classList.add('cw-cell--word');

      // Accessible label
      el.setAttribute('aria-label',
        `Zeile ${r+1}, Spalte ${c+1}${data.letter ? ', ' + data.letter : ', leer'}`);
    },

    /** Re-render every non-black cell */
    allCells() {
      const p = Config.PUZZLE;
      for (let r = 0; r < p.rows; r++)
        for (let c = 0; c < p.cols; c++)
          if (!State.cells[r][c].isBlack) this.cell(r, c);
    },

    /** Mark all cells of a correct word as correct */
    wordDone(wordId) {
      const word = State.wordMap[wordId];
      if (!word) return;
      word.cells.forEach(({ row, col }) => {
        const data = State.cell(row, col);
        if (data) { data.verified = true; this.cell(row, col); }
      });
      document.querySelector(`.cw-clue[data-wid="${wordId}"]`)
        ?.classList.add('cw-clue--done');
    },

    /** Show the active clue bar text */
    activeClue() {
      const el = document.getElementById('cw-active-clue');
      if (!el) return;
      if (State.selWordId === null) {
        el.textContent = 'Klicke ein Feld an, um zu starten';
        return;
      }
      const w = State.wordMap[State.selWordId];
      if (!w) return;
      const dir = w.dir === 'H' ? '→ Waagerecht' : '↓ Senkrecht';
      el.textContent = `${w.number} ${dir}: ${w.clue}`;
    },

    /** Highlight the active clue in both lists */
    clueHighlight() {
      document.querySelectorAll('.cw-clue').forEach(li => {
        li.classList.toggle('cw-clue--active', +li.dataset.wid === State.selWordId);
        if (+li.dataset.wid === State.selWordId) {
          li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      });
    },

    timer() {
      const el = document.getElementById('cw-timer');
      if (!el) return;
      const s  = State.elapsed;
      const mm = String(Math.floor(s / 60)).padStart(2,'0');
      const ss = String(s % 60).padStart(2,'0');
      el.textContent = `${mm}:${ss}`;
    },

    score() {
      const el = document.getElementById('cw-score');
      if (el) el.textContent = State.score;
    },

    progress() {
      const total  = State.words.length;
      const done   = State.words.filter(w => w.correct).length;
      const el     = document.getElementById('cw-progress');
      const barEl  = document.getElementById('cw-progress-bar');
      const pct    = total ? Math.round((done / total) * 100) : 0;
      if (el)    el.textContent = `${done} / ${total}`;
      if (barEl) {
        barEl.style.width = pct + '%';
        barEl.setAttribute('aria-valuenow', pct);
      }
    },

    /** Build both clue lists */
    buildClues() {
      ['H','V'].forEach(dir => {
        const ul = document.getElementById(dir === 'H' ? 'cw-list-h' : 'cw-list-v');
        if (!ul) return;
        ul.innerHTML = '';
        State.words.filter(w => w.dir === dir).forEach(w => {
          const li = document.createElement('li');
          li.className    = 'cw-clue rpl';
          li.dataset.wid  = w.id;
          li.setAttribute('tabindex', '0');
          li.setAttribute('role',     'button');
          li.setAttribute('aria-label',
            `${w.number} ${dir === 'H' ? 'Waagerecht' : 'Senkrecht'}: ${w.clue}`);
          li.innerHTML =
            `<span class="cw-clue__n">${w.number}</span>` +
            `<span class="cw-clue__t">${w.clue} <em class="cw-clue__len">(${w.answer.length})</em></span>`;

          const select = () => Input.selectWord(w.id);
          li.addEventListener('click',   select);
          li.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
          });
          ul.appendChild(li);
        });
      });
    },
  };


  /* ═══════════════════════════════════════════════════
     10 · ANIMATION — micro-interactions
  ═══════════════════════════════════════════════════ */
  const Animation = {
    /** Pop animation on letter entry */
    pop(r, c) {
      const el = State.cell(r, c)?.el;
      if (!el) return;
      const letterEl = el.querySelector('.cw-cell__letter');
      if (!letterEl) return;
      letterEl.classList.remove('cw-anim-pop');
      // Force reflow to restart animation
      void letterEl.offsetWidth;
      letterEl.classList.add('cw-anim-pop');
      letterEl.addEventListener('animationend',
        () => letterEl.classList.remove('cw-anim-pop'), { once: true });
    },

    /** Shake animation on wrong letter */
    shake(r, c) {
      const el = State.cell(r, c)?.el;
      if (!el) return;
      el.classList.remove('cw-anim-shake');
      void el.offsetWidth;
      el.classList.add('cw-anim-shake');
      el.addEventListener('animationend',
        () => el.classList.remove('cw-anim-shake'), { once: true });
    },

    /** Brief score popup */
    scoreFlash(points) {
      const el = document.getElementById('cw-score-flash');
      if (!el) return;
      el.textContent = `+${points}`;
      el.classList.remove('cw-anim-flash');
      void el.offsetWidth;
      el.classList.add('cw-anim-flash');
    },

    /** Confetti burst on game complete */
    confetti() {
      const canvas = document.getElementById('cw-confetti');
      if (!canvas) return;
      canvas.style.display = 'block';
      const ctx  = canvas.getContext('2d');
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;

      const COLORS  = ['#F57C00','#FFB74D','#FFE0B2','#4CAF50','#2196F3','#E91E63'];
      const pieces  = [];
      const COUNT   = 120;

      for (let i = 0; i < COUNT; i++) {
        pieces.push({
          x:   Math.random() * canvas.width,
          y:   Math.random() * -canvas.height,
          vx:  (Math.random() - 0.5) * 4,
          vy:  2 + Math.random() * 4,
          rot: Math.random() * 360,
          vr:  (Math.random() - 0.5) * 6,
          w:   6 + Math.random() * 8,
          h:   3 + Math.random() * 4,
          col: COLORS[Math.floor(Math.random() * COLORS.length)],
          alpha: 1,
        });
      }

      let frame = 0;
      const tick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
          p.x   += p.vx;
          p.y   += p.vy;
          p.rot += p.vr;
          if (frame > 90) p.alpha = Math.max(0, p.alpha - 0.012);

          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
          ctx.rotate(p.rot * Math.PI / 180);
          ctx.fillStyle = p.col;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        });
        frame++;
        if (frame < 160) requestAnimationFrame(tick);
        else canvas.style.display = 'none';
      };
      requestAnimationFrame(tick);
    },
  };


  /* ═══════════════════════════════════════════════════
     11 · STORAGE — LocalStorage save / restore
  ═══════════════════════════════════════════════════ */
  const Storage = {
    save() {
      try {
        const p    = Config.PUZZLE;
        const data = {
          id:      p.id,
          letters: [],
          elapsed: State.elapsed,
          score:   State.score,
          hints:   State.hints,
        };
        for (let r = 0; r < p.rows; r++) {
          data.letters[r] = [];
          for (let c = 0; c < p.cols; c++) {
            const cell = State.cells[r][c];
            if (cell.isBlack) { data.letters[r][c] = null; continue; }
            data.letters[r][c] = {
              l: cell.letter,
              v: cell.verified,
              rv: cell.revealed,
            };
          }
        }
        localStorage.setItem(Config.SETTINGS.STORAGE_KEY, JSON.stringify(data));
      } catch (_) { /* quota exceeded or private mode */ }
    },

    load() {
      try {
        const raw = localStorage.getItem(Config.SETTINGS.STORAGE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (data.id !== Config.PUZZLE.id) return false;

        const p = Config.PUZZLE;
        for (let r = 0; r < p.rows; r++) {
          for (let c = 0; c < p.cols; c++) {
            const cell = State.cells[r][c];
            if (cell.isBlack || !data.letters?.[r]?.[c]) continue;
            const d = data.letters[r][c];
            cell.letter   = d.l  || '';
            cell.verified = d.v  || false;
            cell.revealed = d.rv || false;
          }
        }
        State.elapsed = data.elapsed || 0;
        State.score   = data.score   || 0;
        State.hints   = data.hints   || 0;

        // Rebuild word complete flags
        State.words.forEach(w => State.updateWordStatus(w.id));
        return true;
      } catch (_) { return false; }
    },

    clear() {
      try { localStorage.removeItem(Config.SETTINGS.STORAGE_KEY); } catch (_) {}
    },

    saveHighscore(score, elapsed) {
      try {
        const key = Config.SETTINGS.SCORES_KEY;
        const raw = localStorage.getItem(key);
        const scores = raw ? JSON.parse(raw) : [];
        scores.push({ score, elapsed, date: new Date().toISOString() });
        scores.sort((a, b) => b.score - a.score);
        localStorage.setItem(key, JSON.stringify(scores.slice(0, 10)));
      } catch (_) {}
    },

    getHighscores() {
      try {
        const raw = localStorage.getItem(Config.SETTINGS.SCORES_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (_) { return []; }
    },

    saveDarkPref(isDark) {
      try { localStorage.setItem(Config.SETTINGS.DARK_KEY, isDark ? '1' : '0'); } catch (_) {}
    },

    getDarkPref() {
      try { return localStorage.getItem(Config.SETTINGS.DARK_KEY) === '1'; } catch (_) { return false; }
    },
  };

  /* ═══════════════════════════════════════════════════
     12 · UI — Controller, dialogs, mode switching
  ═══════════════════════════════════════════════════ */
  const UI = {
    _darkMode: false,

    init() {
      this._initDarkMode();
      this._bindToolbar();
      this._bindDialogActions();
      this._bindModeButtons();
      this._injectGameCSS();
    },

    // ── Dark mode ──────────────────────────────────────
    _initDarkMode() {
      this._darkMode = Storage.getDarkPref() ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      this._applyDark(this._darkMode);
    },

    _applyDark(on) {
      document.body.classList.toggle('dark-mode', on);
    },

    toggleDark() {
      this._darkMode = !this._darkMode;
      this._applyDark(this._darkMode);
      Storage.saveDarkPref(this._darkMode);
      const btn = document.getElementById('btn-dark');
      if (btn) btn.setAttribute('aria-label', this._darkMode ? 'Light Mode' : 'Dark Mode');
    },

    // ── Toolbar buttons ────────────────────────────────
    _bindToolbar() {
      this._on('btn-pause',    () => Timer.togglePause());
      this._on('btn-dark',     () => this.toggleDark());
      this._on('btn-check',    () => this._onCheckAll());
      this._on('btn-check-w',  () => this._onCheckWord());
      this._on('btn-hint',     () => Hint.revealLetter());
      this._on('btn-reveal-w', () => this._confirmRevealWord());
      this._on('btn-restart',  () => this._confirmRestart());
      this._on('btn-stats',    () => this._showStats());
      this._on('btn-browse',   () => this._openBrowser());
    },

    _on(id, fn) {
      document.getElementById(id)?.addEventListener('click', fn);
    },

    updatePauseBtn() {
      const btn = document.getElementById('btn-pause');
      if (!btn) return;
      btn.setAttribute('aria-label', State.paused ? 'Fortsetzen' : 'Pausieren');
      btn.querySelector('span')?.setAttribute('aria-hidden', 'true');
      // Swap icon text (▶ / ⏸)
      const icon = btn.querySelector('.btn-icon-glyph');
      if (icon) icon.textContent = State.paused ? '▶' : '⏸';
    },

    // ── Check ──────────────────────────────────────────
    _onCheckAll() {
      const errors = Validation.checkAllLetters();
      const msg = errors === 0
        ? 'Alle sichtbaren Buchstaben sind korrekt! ✓'
        : `${errors} Fehler gefunden. Falsche Buchstaben sind markiert.`;
      this._toast(msg, errors === 0 ? 'success' : 'error');
    },

    _onCheckWord() {
      if (State.selWordId === null) {
        this._toast('Wähle zuerst ein Wort aus.', 'info');
        return;
      }
      const errors = Validation.checkCurrentWord();
      const msg = errors === 0
        ? 'Dieses Wort ist korrekt! ✓'
        : `${errors} Fehler in diesem Wort gefunden.`;
      this._toast(msg, errors === 0 ? 'success' : 'error');
    },

    // ── Reveal word confirmation ───────────────────────
    _confirmRevealWord() {
      if (State.selWordId === null) {
        this._toast('Wähle zuerst ein Wort aus.', 'info');
        return;
      }
      const w = State.wordMap[State.selWordId];
      this._openDialog('dlg-confirm', {
        icon: '🔍',
        headline: 'Wort aufdecken?',
        body: `Wort "${w?.number} ${w?.dir === 'H' ? '→' : '↓'}" wird gelöst. Das kostet ${Config.SETTINGS.POINTS.REVEAL_PENALTY} Punkte.`,
        confirmLabel: 'Aufdecken',
        onConfirm: () => { Hint.revealWord(); this._closeDialog('dlg-confirm'); },
      });
    },

    // ── Restart confirmation ───────────────────────────
    _confirmRestart() {
      this._openDialog('dlg-confirm', {
        icon: '🔄',
        headline: 'Neu starten?',
        body: 'Dein Fortschritt geht verloren. Wirklich neu starten?',
        confirmLabel: 'Neu starten',
        onConfirm: () => { this._closeDialog('dlg-confirm'); this._restart(); },
      });
    },

    _restart(newPuzzle) {
      const puzzle = newPuzzle || Config.PUZZLE;
      if (newPuzzle) Config.PUZZLE = newPuzzle;
      Timer.reset();
      Storage.clear();
      Grid.build(puzzle);
      Render.buildGrid();
      Render.buildClues();
      Render.allCells();
      Render.activeClue();
      Render.timer();
      Render.score();
      Render.progress();
      State.selRow = -1; State.selCol = -1; State.selWordId = null;
      // Update page title chip
      const titleEl = document.querySelector('.top-bar__title');
      if (titleEl) titleEl.textContent = puzzle.title || 'Kreuzworträtsel';
    },

    // ── Game complete ──────────────────────────────────
    onGameComplete() {
      State.complete = true;
      Timer.stop();
      const bonus = Scoring.timeBonus();
      const final = Scoring.finalScore();
      State.score  = final;
      Render.score();
      Storage.saveHighscore(final, State.elapsed);
      Animation.confetti();

      const s = State.elapsed;
      const timeStr = `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

      this._openDialog('dlg-complete', {
        time: timeStr,
        score: final,
        bonus,
        hints: State.hints,
      });
      Storage.clear();
    },

    // ── Puzzle Browser ─────────────────────────────────
    _openBrowser() {
      PuzzleManager.refreshList('all');
      this._renderBrowser();
      const scrim = document.getElementById('dlg-browser');
      if (scrim) { scrim.classList.add('show'); scrim.setAttribute('aria-hidden','false'); }
    },

    _renderBrowser() {
      // Category pills
      const catWrap = document.getElementById('browser-cats');
      if (catWrap && catWrap.children.length <= 1) {
        // Build once
        const allBtn = document.createElement('button');
        allBtn.className = 'pill-btn rpl browser-cat-btn active';
        allBtn.dataset.cat = 'all';
        allBtn.textContent = '🎲 Alle';
        catWrap.appendChild(allBtn);

        PuzzleManager.categories.forEach(cat => {
          const btn = document.createElement('button');
          btn.className = 'pill-btn rpl browser-cat-btn';
          btn.dataset.cat = cat.key;
          btn.textContent = `${cat.icon} ${cat.label}`;
          catWrap.appendChild(btn);
        });

        catWrap.addEventListener('click', e => {
          const btn = e.target.closest('.browser-cat-btn');
          if (!btn) return;
          catWrap.querySelectorAll('.browser-cat-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          PuzzleManager.refreshList(btn.dataset.cat === 'all' ? null : btn.dataset.cat);
          this._renderBrowserList();
        });
      }

      this._renderBrowserList();

      // Pagination
      document.getElementById('browser-prev')?.addEventListener('click', () => {
        PuzzleManager.prevPage(); this._renderBrowserList();
      });
      document.getElementById('browser-next')?.addEventListener('click', () => {
        PuzzleManager.nextPage(); this._renderBrowserList();
      });
    },

    _renderBrowserList() {
      const grid = document.getElementById('browser-grid');
      if (!grid) return;

      grid.innerHTML = '';
      const entries = PuzzleManager.getPage();
      const currentId = PuzzleManager.currentPuzzleId;

      entries.forEach(entry => {
        const card = document.createElement('button');
        card.className = 'cw-puzzle-card rpl' + (entry.id === currentId ? ' active' : '');
        card.setAttribute('aria-label', `Rätsel laden: ${entry.title}`);

        const icon = entry.type === 'featured' ? '⭐' :
          PuzzleManager.categories.find(c => c.key === entry.catKey)?.icon ?? '📝';

        card.innerHTML =
          `<span class="cw-pc-icon">${icon}</span>` +
          `<span class="cw-pc-title">${entry.title}</span>` +
          `<span class="cw-pc-type">${entry.type === 'featured' ? 'Empfohlen' : 'Generiert'}</span>`;

        card.addEventListener('click', () => {
          const ok = PuzzleManager.loadEntry(entry);
          if (!ok) { this._toast('Rätsel konnte nicht geladen werden.', 'error'); return; }
          this._closeDialog('dlg-browser');
          this._restart(Config.PUZZLE);
        });
        grid.appendChild(card);
      });

      // Pagination info + buttons
      const info = document.getElementById('browser-page-info');
      if (info) info.textContent = PuzzleManager.pageInfo();
      const prev = document.getElementById('browser-prev');
      const next = document.getElementById('browser-next');
      if (prev) prev.disabled = !PuzzleManager.hasPrevPage();
      if (next) next.disabled = !PuzzleManager.hasNextPage();
    },

    // ── Stats dialog ───────────────────────────────────
    _showStats() {
      const scores = Storage.getHighscores();
      const el = document.getElementById('cw-stats-body');
      if (!el) return;
      if (!scores.length) {
        el.innerHTML = '<p>Noch keine Highscores vorhanden. Löse dein erstes Rätsel!</p>';
      } else {
        el.innerHTML = scores.map((s, i) => {
          const d = new Date(s.date).toLocaleDateString('de-DE');
          const mm = String(Math.floor(s.elapsed/60)).padStart(2,'0');
          const ss = String(s.elapsed%60).padStart(2,'0');
          return `<div class="cw-stat-row">
            <span class="cw-stat-rank">#${i+1}</span>
            <span class="cw-stat-score">${s.score} Punkte</span>
            <span class="cw-stat-time">${mm}:${ss}</span>
            <span class="cw-stat-date">${d}</span>
          </div>`;
        }).join('');
      }
      const scrim = document.getElementById('dlg-stats');
      if (scrim) { scrim.classList.add('show'); scrim.setAttribute('aria-hidden', 'false'); }
    },

    // ── Mode buttons ───────────────────────────────────
    _bindModeButtons() {
      document.querySelectorAll('.cw-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.cw-mode-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          State.mode = btn.dataset.mode || 'classic';
        });
      });
    },

    // ── Dialog helpers ─────────────────────────────────
    _openDialog(id, data) {
      const scrim = document.getElementById(id);
      if (!scrim) return;
      // Populate dynamic fields
      if (data) {
        if (data.icon)      this._setEl(`${id}-icon`,     data.icon);
        if (data.headline)  this._setEl(`${id}-headline`, data.headline);
        if (data.body)      this._setEl(`${id}-body`,     data.body);
        if (data.confirmLabel) {
          const btn = scrim.querySelector('.dlg-btn-confirm');
          if (btn) {
            btn.textContent = data.confirmLabel;
            // Rebind confirm action
            btn.onclick = data.onConfirm || null;
          }
        }
        // Complete dialog stats
        if (data.time  !== undefined) this._setEl(`${id}-time`,  data.time);
        if (data.score !== undefined) this._setEl(`${id}-score`, data.score);
        if (data.bonus !== undefined) this._setEl(`${id}-bonus`, `+${data.bonus}`);
        if (data.hints !== undefined) this._setEl(`${id}-hints`, data.hints);
      }
      scrim.classList.add('show');
      scrim.setAttribute('aria-hidden', 'false');
      scrim.querySelector('button')?.focus();
    },

    _closeDialog(id) {
      const scrim = document.getElementById(id);
      if (scrim) { scrim.classList.remove('show'); scrim.setAttribute('aria-hidden', 'true'); }
    },

    _setEl(id, val) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    },

    _bindDialogActions() {
      // Close any dialog on scrim click
      document.querySelectorAll('.dialog-scrim').forEach(scrim => {
        scrim.addEventListener('click', e => {
          if (e.target === scrim) { scrim.classList.remove('show'); }
        });
        scrim.addEventListener('keydown', e => {
          if (e.key === 'Escape') { scrim.classList.remove('show'); }
        });
      });

      // Cancel buttons
      document.querySelectorAll('.dlg-btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.closest('.dialog-scrim')?.classList.remove('show');
        });
      });

      // Complete dialog: restart
      document.getElementById('dlg-complete-restart')
        ?.addEventListener('click', () => {
          this._closeDialog('dlg-complete');
          this._restart();
        });

      // Stats close
      document.getElementById('dlg-stats-close')
        ?.addEventListener('click', () => this._closeDialog('dlg-stats'));

      // Browser close
      document.getElementById('dlg-browser-close')
        ?.addEventListener('click', () => this._closeDialog('dlg-browser'));

      // Daily puzzle button
      document.getElementById('btn-daily')
        ?.addEventListener('click', () => {
          if (typeof PuzzleDB === 'undefined') return;
          const p = PuzzleDB.daily();
          if (p) { this._closeDialog('dlg-browser'); this._restart(p); }
        });
    },

    // ── Toast notifications ────────────────────────────
    _toast(msg, type = 'info') {
      let el = document.getElementById('cw-toast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'cw-toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.className = `cw-toast cw-toast--${type} cw-toast--show`;
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove('cw-toast--show'), 3200);
    },

    // ── Game-specific CSS (injected once) ──────────────
    _injectGameCSS() {
      if (document.getElementById('cw-styles')) return;
      const style = document.createElement('style');
      style.id = 'cw-styles';
      style.textContent = `
        /* ── Grid layout ───────────────────────── */
        #cw-grid {
          display: grid;
          grid-template-rows: repeat(var(--cw-rows), 1fr);
          width: var(--grid-sz, min(96vw, 500px));
          aspect-ratio: var(--cw-cols) / var(--cw-rows);
          border: 2px solid var(--c-outline);
          border-radius: var(--r-md);
          overflow: hidden;
          box-shadow: var(--elev-2);
          background: var(--c-outline-var);
          gap: 1px;
          margin: 0 auto;
        }
        .cw-row {
          display: grid;
          grid-template-columns: repeat(var(--cw-cols), 1fr);
          gap: 1px;
        }

        /* ── Cell base ─────────────────────────── */
        .cw-cell {
          background: var(--c-surface);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; user-select: none;
          position: relative; overflow: hidden;
          transition: background var(--dur-fast) var(--ease);
          min-width: 0; min-height: 0;
        }
        .cw-cell--black { background: var(--c-on-bg, #111); cursor: default; }
        .cw-cell:focus-visible {
          outline: 2.5px solid var(--c-primary);
          outline-offset: -2px; z-index: 2;
        }

        /* ── Cell states ───────────────────────── */
        .cw-cell--active   { background: var(--c-cell-sel,   #FFE0B2); }
        .cw-cell--word     { background: var(--c-cell-rel,   #FFF8F0); }
        .cw-cell--correct  { background: #E8F5E9; }
        .cw-cell--revealed { background: #E3F2FD; }
        .cw-cell--error    { background: var(--c-error-container, #FFDAD6); }

        body.dark-mode .cw-cell--active   { background: #4A2800; }
        body.dark-mode .cw-cell--word     { background: #1F1507; }
        body.dark-mode .cw-cell--correct  { background: #1B3A1E; }
        body.dark-mode .cw-cell--revealed { background: #0D2A3A; }
        body.dark-mode .cw-cell--black    { background: #000; }

        /* ── Cell contents ─────────────────────── */
        .cw-cell__num {
          position: absolute; top: 1px; left: 2px;
          font-size: clamp(7px, 1.4vw, 11px);
          font-weight: 700; line-height: 1;
          color: var(--c-on-surf-var);
          pointer-events: none; z-index: 1;
        }
        .cw-cell__letter {
          font-family: var(--font-ui);
          font-size: clamp(12px, 3.2vw, 24px);
          font-weight: 700; line-height: 1;
          color: var(--c-primary);
          pointer-events: none; z-index: 1;
        }
        .cw-cell--revealed .cw-cell__letter { color: #1565C0; }
        .cw-cell--correct  .cw-cell__letter { color: #2E7D32; }

        /* ── Animations ────────────────────────── */
        @keyframes cw-pop {
          0%   { transform: scale(.5); }
          65%  { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        @keyframes cw-shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-4px); }
          40%     { transform: translateX(4px); }
          60%     { transform: translateX(-3px); }
          80%     { transform: translateX(3px); }
        }
        @keyframes cw-flash {
          0%   { opacity:1; transform: translateY(0) scale(1); }
          80%  { opacity:1; transform: translateY(-24px) scale(1.1); }
          100% { opacity:0; transform: translateY(-32px) scale(.9); }
        }
        @keyframes cw-toast-in {
          from { opacity:0; transform:translateY(20px) translateX(-50%); }
          to   { opacity:1; transform:translateY(0)    translateX(-50%); }
        }

        .cw-anim-pop   { animation: cw-pop   var(--dur-normal) var(--ease) both; }
        .cw-anim-shake { animation: cw-shake var(--dur-normal) var(--ease) both; }
        .cw-anim-flash { animation: cw-flash 800ms var(--ease) both; }

        /* ── Active clue bar ───────────────────── */
        #cw-clue-bar {
          max-width: var(--grid-sz, 500px);
          margin: 8px auto 0;
          background: var(--c-surf-mid);
          border-radius: var(--r-md);
          padding: 10px 14px;
          font-size: 15px; font-weight: 500; line-height: 22px;
          color: var(--c-on-surf-var);
          min-height: 46px;
          border: 1.5px solid var(--c-outline-var);
        }

        /* ── Score flash ───────────────────────── */
        #cw-score-flash {
          position: fixed; bottom: 220px; left: 50%;
          transform: translateX(-50%);
          font-size: 24px; font-weight: 800;
          color: var(--c-primary); pointer-events: none;
          opacity: 0; z-index: 400;
        }

        /* ── Confetti canvas ───────────────────── */
        #cw-confetti {
          position: fixed; inset: 0;
          pointer-events: none; z-index: 500; display: none;
        }

        /* ── Hidden input ──────────────────────── */
        #cw-hidden-input {
          position: fixed; top: -999px; left: -999px;
          width: 1px; height: 1px; opacity: 0;
          pointer-events: none;
        }

        /* ── Clue lists ────────────────────────── */
        .cw-clues-section {
          max-width: var(--content-max, 760px);
          margin: 20px auto 0; padding: 0 12px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 540px) { .cw-clues-section { grid-template-columns: 1fr; } }
        .cw-clues-title {
          font-size: 15px; font-weight: 700;
          letter-spacing: .4px; text-transform: uppercase;
          color: var(--c-on-surf-var);
          margin-bottom: 8px; padding-left: 4px;
        }
        #cw-list-h, #cw-list-v {
          list-style: none; padding: 0; margin: 0;
          max-height: 280px; overflow-y: auto;
          border: 1.5px solid var(--c-outline-var);
          border-radius: var(--r-md);
          background: var(--c-surf-low);
        }
        .cw-clue {
          display: flex; gap: 8px; align-items: flex-start;
          padding: 8px 12px;
          border-bottom: 1px solid var(--c-outline-var);
          cursor: pointer; font-size: 15px; line-height: 20px;
          transition: background var(--dur-fast);
        }
        .cw-clue:last-child { border-bottom: none; }
        .cw-clue:hover      { background: var(--c-surf-mid); }
        .cw-clue--active    { background: var(--c-primary-container); color: var(--c-on-primary-container); }
        .cw-clue--done      { opacity: .45; text-decoration: line-through; }
        .cw-clue__n {
          font-weight: 800; color: var(--c-primary);
          min-width: 20px; flex-shrink: 0;
        }
        .cw-clue--active .cw-clue__n { color: var(--c-on-primary-container); }
        .cw-clue__t  { color: var(--c-on-surf-var); }
        .cw-clue__len { color: var(--c-outline); font-style: normal; margin-left: 2px; }

        /* ── Progress bar ──────────────────────── */
        #cw-progress-wrap {
          max-width: var(--grid-sz, 500px);
          margin: 6px auto 0;
        }
        #cw-progress-track {
          height: 6px; border-radius: var(--r-full);
          background: var(--c-surf-high);
          overflow: hidden;
        }
        #cw-progress-bar {
          height: 100%; width: 0%;
          background: var(--c-primary);
          border-radius: var(--r-full);
          transition: width var(--dur-slow) var(--ease);
        }

        /* ── Stats dialog body ─────────────────── */
        .cw-stat-row {
          display: grid;
          grid-template-columns: 32px 1fr auto auto;
          gap: 8px; align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--c-outline-var);
          font-size: 15px;
        }
        .cw-stat-rank  { font-weight: 800; color: var(--c-primary); }
        .cw-stat-score { font-weight: 700; }
        .cw-stat-time  { font-family: var(--font-mono); font-size: 14px; }
        .cw-stat-date  { color: var(--c-outline); font-size: 13px; }

        /* ── Toast ─────────────────────────────── */
        .cw-toast {
          position: fixed; bottom: 80px; left: 50%;
          transform: translateX(-50%);
          background: var(--c-on-bg); color: var(--c-bg);
          padding: 10px 22px; border-radius: var(--r-full);
          font-size: 15px; font-weight: 600;
          pointer-events: none; opacity: 0;
          transition: opacity var(--dur-normal);
          z-index: 600; white-space: nowrap;
          box-shadow: var(--elev-2);
        }
        .cw-toast--show    { opacity: 1; }
        .cw-toast--success { background: #2E7D32; color: #fff; }
        .cw-toast--error   { background: var(--c-error); color: #fff; }
        .cw-toast--info    { background: var(--c-secondary); color: #fff; }

        /* ── Puzzle Browser ─────────────────────────── */
        #browser-cats {
          display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;
        }
        #browser-cats .pill-btn { height: 40px; padding: 0 16px; font-size: 14px; }
        #browser-cats .pill-btn.active {
          background: var(--c-primary); color: var(--c-on-primary);
          border-color: var(--c-primary);
        }
        #browser-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 10px; margin-bottom: 16px;
          max-height: 340px; overflow-y: auto; padding-right: 4px;
        }
        .cw-puzzle-card {
          display: flex; flex-direction: column; align-items: flex-start;
          gap: 4px; padding: 12px;
          background: var(--c-surf-mid);
          border: 1.5px solid var(--c-outline-var);
          border-radius: var(--r-md);
          cursor: pointer; text-align: left;
          transition: all var(--dur-fast) var(--ease);
          position: relative; overflow: hidden;
        }
        .cw-puzzle-card:hover { box-shadow: var(--elev-1); border-color: var(--c-primary); }
        .cw-puzzle-card.active {
          background: var(--c-primary-container); border-color: var(--c-primary);
        }
        .cw-pc-icon  { font-size: 22px; }
        .cw-pc-title { font-size: 13px; font-weight: 600; color: var(--c-on-surface); line-height: 1.3; }
        .cw-pc-type  { font-size: 11px; color: var(--c-outline); text-transform: uppercase; letter-spacing: .4px; }
        .browser-pagination {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        #browser-page-info { font-size: 14px; color: var(--c-on-surf-var); }
        .browser-pagination button {
          height: 40px; padding: 0 18px; border-radius: var(--r-full);
          background: var(--c-secondary-container); color: var(--c-on-secondary-container);
          font-size: 14px; font-weight: 600; border: 1.5px solid var(--c-outline-var);
          cursor: pointer; transition: opacity var(--dur-fast);
        }
        .browser-pagination button:disabled { opacity: .35; cursor: default; }
      `;
      document.head.appendChild(style);
    },
  };


  /* ═══════════════════════════════════════════════════
     13 · BOOTSTRAP — entry point
  ═══════════════════════════════════════════════════ */
  function init() {
    // 0. Load first puzzle (daily or featured)
    PuzzleManager.loadFirst();

    // 1. Build data model
    Grid.build();

    // 2. Build DOM (grid cells + clue lists)
    Render.buildGrid();
    Render.buildClues();

    // 3. Bootstrap UI (binds buttons, injects CSS, dark mode)
    UI.init();

    // 4. Try to restore saved progress
    const resumed = Storage.load();
    if (resumed) {
      State.words.forEach(w => {
        if (w.correct) Render.wordDone(w.id);
      });
    }

    // 5. Initial render pass
    Render.allCells();
    Render.activeClue();
    Render.timer();
    Render.score();
    Render.progress();

    // 6. Input system
    Input.init();

    // 7. Ripple handler (if not already in page)
    if (!window._cwRippleInit) {
      window._cwRippleInit = true;
      document.addEventListener('pointerdown', e => {
        const h = e.target.closest('.rpl');
        if (!h) return;
        const rect = h.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const sz = Math.max(rect.width, rect.height) * 2.4;
        const w = document.createElement('span');
        w.className = 'rpl-wave';
        w.style.cssText =
          `width:${sz}px;height:${sz}px;left:${x-sz/2}px;top:${y-sz/2}px`;
        h.appendChild(w);
        w.addEventListener('animationend', () => w.remove(), { once: true });
      }, { passive: true });
    }

    console.info('🔤 Kreuzworträtsel Engine ready — klickspiele.de');
  }

  // Auto-init on DOMContentLoaded or immediately if already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API (optional external access)
  return { State, Hint, Validation, Timer, Storage, Scoring, Render, PuzzleManager };

})(); // end CrosswordApp
