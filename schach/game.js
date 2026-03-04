'use strict';
/* ═══════════════════════════════════════════════════════════════
   klickspiele.de – Schach (Chess)
   Vollständige Schach-Engine in Vanilla JS
   Modularer Aufbau: Config → State → Pieces → MoveGen →
   Validation → SpecialRules → CheckMate → AI → Render →
   Animation → Storage → UIController
   ═══════════════════════════════════════════════════════════════ */
(function () {

/* ──────────────────────────────────────────────────────────────
   1. CONFIG MODULE
   ────────────────────────────────────────────────────────────── */
const Config = {
  aiDepths:        { easy: 0, medium: 1, hard: 3 },
  animDuration:    200,
  storageKey:      'klickspiele_chess_v2',
  defaultMode:     'pvc',
  defaultDiff:     'medium',
  defaultColor:    'white',
  blitzOptions:    [1, 3, 5, 10],
};

/* ──────────────────────────────────────────────────────────────
   2. PIECE CONSTANTS
   ────────────────────────────────────────────────────────────── */
const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;

const WHITE_SYM = { 6:'♔', 5:'♕', 4:'♖', 3:'♗', 2:'♘', 1:'♙' };
const BLACK_SYM = { 6:'♚', 5:'♛', 4:'♜', 3:'♝', 2:'♞', 1:'♟' };
const PIECE_NAME = { 1:'Bauer', 2:'Springer', 3:'Läufer', 4:'Turm', 5:'Dame', 6:'König' };
const PIECE_LETTER = { 2:'S', 3:'L', 4:'T', 5:'D', 6:'K' }; // German algebraic

function sym(piece) {
  if (piece > 0) return WHITE_SYM[piece];
  if (piece < 0) return BLACK_SYM[-piece];
  return '';
}
function colorOf(piece) { return piece > 0 ? 'white' : piece < 0 ? 'black' : null; }
function isWhite(piece)  { return piece > 0; }
function isBlack(piece)  { return piece < 0; }
function isEmpty(piece)  { return piece === 0; }
function sameColor(a, b) { return a !== 0 && b !== 0 && (a > 0) === (b > 0); }
function abs(piece)      { return piece < 0 ? -piece : piece; }

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1']; // row 0 = rank 8

/* ──────────────────────────────────────────────────────────────
   3. GAME STATE MODULE
   ────────────────────────────────────────────────────────────── */
function makeInitialBoard() {
  const back = [R, N, B, Q, K, B, N, R];
  return [
    back.map(p => -p),       // rank 8 (row 0) – black
    Array(8).fill(-P),       // rank 7 (row 1)
    Array(8).fill(0),
    Array(8).fill(0),
    Array(8).fill(0),
    Array(8).fill(0),
    Array(8).fill(P),        // rank 2 (row 6) – white
    back.slice(),            // rank 1 (row 7) – white
  ];
}

function newGameState() {
  return {
    board:        makeInitialBoard(),
    turn:         'white',
    castling:     { K: true, Q: true, k: true, q: true },
    enPassant:    null,          // {row, col} of capture square
    halfClock:    0,
    fullMove:     1,
    history:      [],            // [{move, notation, captured}]
    status:       'playing',     // playing|check|checkmate|stalemate|draw
    result:       null,          // white|black|draw|null
  };
}

function cloneState(s) {
  return {
    board:     s.board.map(r => r.slice()),
    turn:      s.turn,
    castling:  { ...s.castling },
    enPassant: s.enPassant ? { ...s.enPassant } : null,
    halfClock: s.halfClock,
    fullMove:  s.fullMove,
    history:   s.history,         // not deep-cloned – read-only after clone
    status:    s.status,
    result:    s.result,
  };
}

/* ──────────────────────────────────────────────────────────────
   4. BOARD HELPERS
   ────────────────────────────────────────────────────────────── */
function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

/* ──────────────────────────────────────────────────────────────
   5. MOVE GENERATOR MODULE
   Returns pseudo-legal moves (may leave king in check).
   Move shape: {fromRow, fromCol, toRow, toCol,
                promotion?, castling?, enPassant?, doublePush?}
   ────────────────────────────────────────────────────────────── */
function genPseudoLegal(state, color) {
  const moves = [];
  color = color || state.turn;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece || colorOf(piece) !== color) continue;
      switch (abs(piece)) {
        case P: genPawn(state, r, c, moves);   break;
        case N: genKnight(state, r, c, moves); break;
        case B: genSlide(state, r, c, moves, [[1,1],[1,-1],[-1,1],[-1,-1]]); break;
        case R: genSlide(state, r, c, moves, [[1,0],[-1,0],[0,1],[0,-1]]); break;
        case Q: genSlide(state, r, c, moves, [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]); break;
        case K: genKing(state, r, c, moves);   break;
      }
    }
  }
  genCastle(state, color, moves);
  return moves;
}

function genPawn(state, r, c, moves) {
  const piece = state.board[r][c];
  const dir   = isWhite(piece) ? -1 : 1;
  const start = isWhite(piece) ? 6 : 1;
  const prom  = isWhite(piece) ? 0 : 7;

  // Forward
  const nr = r + dir;
  if (inBounds(nr, c) && isEmpty(state.board[nr][c])) {
    if (nr === prom) {
      for (const pp of [Q, R, B, N])
        moves.push({ fromRow:r, fromCol:c, toRow:nr, toCol:c, promotion: isWhite(piece) ? pp : -pp });
    } else {
      moves.push({ fromRow:r, fromCol:c, toRow:nr, toCol:c });
      if (r === start && isEmpty(state.board[r + 2*dir][c]))
        moves.push({ fromRow:r, fromCol:c, toRow:r+2*dir, toCol:c, doublePush:true });
    }
  }

  // Captures + en passant
  for (const dc of [-1, 1]) {
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const target = state.board[nr][nc];
    const ep = state.enPassant && state.enPassant.row === nr && state.enPassant.col === nc;
    if (ep || (!isEmpty(target) && !sameColor(piece, target))) {
      if (nr === prom) {
        for (const pp of [Q, R, B, N])
          moves.push({ fromRow:r, fromCol:c, toRow:nr, toCol:nc, promotion: isWhite(piece) ? pp : -pp });
      } else {
        moves.push({ fromRow:r, fromCol:c, toRow:nr, toCol:nc, enPassant: ep || undefined });
      }
    }
  }
}

function genKnight(state, r, c, moves) {
  const piece = state.board[r][c];
  for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const nr=r+dr, nc=c+dc;
    if (!inBounds(nr,nc)) continue;
    const t = state.board[nr][nc];
    if (!isEmpty(t) && sameColor(piece,t)) continue;
    moves.push({ fromRow:r, fromCol:c, toRow:nr, toCol:nc });
  }
}

function genSlide(state, r, c, moves, dirs) {
  const piece = state.board[r][c];
  for (const [dr,dc] of dirs) {
    let nr=r+dr, nc=c+dc;
    while (inBounds(nr,nc)) {
      const t = state.board[nr][nc];
      if (!isEmpty(t)) { if (!sameColor(piece,t)) moves.push({fromRow:r,fromCol:c,toRow:nr,toCol:nc}); break; }
      moves.push({ fromRow:r, fromCol:c, toRow:nr, toCol:nc });
      nr+=dr; nc+=dc;
    }
  }
}

function genKing(state, r, c, moves) {
  const piece = state.board[r][c];
  for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    const nr=r+dr, nc=c+dc;
    if (!inBounds(nr,nc)) continue;
    const t=state.board[nr][nc];
    if (!isEmpty(t) && sameColor(piece,t)) continue;
    moves.push({ fromRow:r, fromCol:c, toRow:nr, toCol:nc });
  }
}

function genCastle(state, color, moves) {
  const row = color === 'white' ? 7 : 0;
  const opp = color === 'white' ? 'black' : 'white';
  const kingPiece = color === 'white' ? K : -K;
  if (state.board[row][4] !== kingPiece) return;
  if (isSquareAttacked(state, row, 4, opp)) return;

  const ks = color === 'white' ? 'K' : 'k';
  const qs = color === 'white' ? 'Q' : 'q';

  // Kingside
  if (state.castling[ks] &&
      isEmpty(state.board[row][5]) && isEmpty(state.board[row][6]) &&
      !isSquareAttacked(state, row, 5, opp) && !isSquareAttacked(state, row, 6, opp)) {
    moves.push({ fromRow:row, fromCol:4, toRow:row, toCol:6, castling:'K' });
  }
  // Queenside
  if (state.castling[qs] &&
      isEmpty(state.board[row][3]) && isEmpty(state.board[row][2]) && isEmpty(state.board[row][1]) &&
      !isSquareAttacked(state, row, 3, opp) && !isSquareAttacked(state, row, 2, opp)) {
    moves.push({ fromRow:row, fromCol:4, toRow:row, toCol:2, castling:'Q' });
  }
}

/* ──────────────────────────────────────────────────────────────
   6. ATTACK DETECTION
   ────────────────────────────────────────────────────────────── */
function isSquareAttacked(state, row, col, byColor) {
  const bw = byColor === 'white';

  // Pawns
  const pd = bw ? 1 : -1; // white pawns attack downward from higher rows
  for (const dc of [-1,1]) {
    const pr=row+pd, pc=col+dc;
    if (inBounds(pr,pc)) {
      const pp = state.board[pr][pc];
      if (bw && pp === P) return true;
      if (!bw && pp === -P) return true;
    }
  }

  // Knights
  for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const nr=row+dr, nc=col+dc;
    if (inBounds(nr,nc)) {
      const pp = state.board[nr][nc];
      if (bw && pp===N) return true;
      if (!bw && pp===-N) return true;
    }
  }

  // Diagonal sliders (bishop / queen)
  for (const [dr,dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
    let nr=row+dr, nc=col+dc;
    while (inBounds(nr,nc)) {
      const pp=state.board[nr][nc];
      if (pp!==0) {
        if (bw  && (pp===B||pp===Q)) return true;
        if (!bw && (pp===-B||pp===-Q)) return true;
        break;
      }
      nr+=dr; nc+=dc;
    }
  }

  // Straight sliders (rook / queen)
  for (const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    let nr=row+dr, nc=col+dc;
    while (inBounds(nr,nc)) {
      const pp=state.board[nr][nc];
      if (pp!==0) {
        if (bw  && (pp===R||pp===Q)) return true;
        if (!bw && (pp===-R||pp===-Q)) return true;
        break;
      }
      nr+=dr; nc+=dc;
    }
  }

  // King
  for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    const nr=row+dr, nc=col+dc;
    if (inBounds(nr,nc)) {
      const pp=state.board[nr][nc];
      if (bw && pp===K)  return true;
      if (!bw && pp===-K) return true;
    }
  }

  return false;
}

/* ──────────────────────────────────────────────────────────────
   7. MOVE VALIDATION & EXECUTION
   ────────────────────────────────────────────────────────────── */
function applyMove(state, move) {
  const ns = cloneState(state);
  const { fromRow:fr, fromCol:fc, toRow:tr, toCol:tc } = move;
  const piece = ns.board[fr][fc];

  // Move piece (apply promotion if any)
  ns.board[tr][tc] = move.promotion || piece;
  ns.board[fr][fc] = 0;

  // En passant capture
  if (move.enPassant) ns.board[fr][tc] = 0;

  // Castling – move rook
  if (move.castling) {
    const row = fr;
    if (move.castling === 'K') { ns.board[row][5] = ns.board[row][7]; ns.board[row][7] = 0; }
    else                       { ns.board[row][3] = ns.board[row][0]; ns.board[row][0] = 0; }
  }

  // En passant target for next move
  ns.enPassant = move.doublePush ? { row:(fr+tr)/2, col:tc } : null;

  // Castling rights
  const ap = abs(piece);
  if (ap === K) {
    if (isWhite(piece)) { ns.castling.K=false; ns.castling.Q=false; }
    else                { ns.castling.k=false; ns.castling.q=false; }
  }
  if (ap === R || true) { // also handle rook captured
    if (fr===7&&fc===7) ns.castling.K=false;
    if (fr===7&&fc===0) ns.castling.Q=false;
    if (fr===0&&fc===7) ns.castling.k=false;
    if (fr===0&&fc===0) ns.castling.q=false;
    if (tr===7&&tc===7) ns.castling.K=false;
    if (tr===7&&tc===0) ns.castling.Q=false;
    if (tr===0&&tc===7) ns.castling.k=false;
    if (tr===0&&tc===0) ns.castling.q=false;
  }

  // Half-move clock (50-move rule)
  ns.halfClock = (ap===P || state.board[tr][tc]!==0) ? 0 : state.halfClock+1;

  // Switch turn
  ns.turn = state.turn === 'white' ? 'black' : 'white';
  if (ns.turn === 'white') ns.fullMove++;

  return ns;
}

function isKingInCheck(state, color) {
  const kp = color === 'white' ? K : -K;
  const opp = color === 'white' ? 'black' : 'white';
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    if (state.board[r][c]===kp) return isSquareAttacked(state,r,c,opp);
  }
  return false;
}

function getLegalMoves(state, color) {
  color = color || state.turn;
  return genPseudoLegal(state, color).filter(mv => {
    const ns = applyMove(state, mv);
    return !isKingInCheck(ns, color);
  });
}

/* ──────────────────────────────────────────────────────────────
   8. CHECK / CHECKMATE / STALEMATE / DRAW
   ────────────────────────────────────────────────────────────── */
function gameStatus(state) {
  const color = state.turn;
  const moves = getLegalMoves(state, color);
  const inCheck = isKingInCheck(state, color);

  if (moves.length === 0) {
    return inCheck
      ? { status:'checkmate', result: color==='white'?'black':'white' }
      : { status:'stalemate', result:'draw' };
  }
  if (state.halfClock >= 100) return { status:'draw', result:'draw' };
  if (insufficientMaterial(state)) return { status:'draw', result:'draw' };
  if (inCheck) return { status:'check', result:null };
  return { status:'playing', result:null };
}

function insufficientMaterial(state) {
  const pieces = [];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const pp=state.board[r][c];
    if (pp) pieces.push({p:pp,r,c});
  }
  if (pieces.length===2) return true; // K vs K
  if (pieces.length===3) {
    const minor = pieces.filter(x => abs(x.p)===B || abs(x.p)===N);
    if (minor.length===1) return true; // K+B/N vs K
  }
  if (pieces.length===4) {
    const bishops = pieces.filter(x => abs(x.p)===B);
    if (bishops.length===2 && bishops[0].p!==bishops[1].p) { // opposite colors
      // same square color?
      if ((bishops[0].r+bishops[0].c)%2 === (bishops[1].r+bishops[1].c)%2) return true;
    }
  }
  return false;
}

/* ──────────────────────────────────────────────────────────────
   9. ALGEBRAIC NOTATION
   ────────────────────────────────────────────────────────────── */
function toAlgebraic(state, move, allLegal) {
  if (move.castling === 'K') return 'O-O';
  if (move.castling === 'Q') return 'O-O-O';

  const piece  = state.board[move.fromRow][move.fromCol];
  const ap     = abs(piece);
  const cap    = state.board[move.toRow][move.toCol]!==0 || move.enPassant;
  let note = '';

  if (ap !== P) {
    note += PIECE_LETTER[ap] || '';
    // Disambiguation
    const amb = allLegal.filter(m =>
      m !== move && state.board[m.fromRow][m.fromCol]===piece &&
      m.toRow===move.toRow && m.toCol===move.toCol
    );
    if (amb.length > 0) {
      const sameFile = amb.some(m=>m.fromCol===move.fromCol);
      const sameRank = amb.some(m=>m.fromRow===move.fromRow);
      if (!sameFile) note += FILES[move.fromCol];
      else if (!sameRank) note += RANKS[move.fromRow];
      else note += FILES[move.fromCol]+RANKS[move.fromRow];
    }
  } else {
    if (cap) note += FILES[move.fromCol];
  }

  if (cap) note += 'x';
  note += FILES[move.toCol] + RANKS[move.toRow];

  if (move.promotion) {
    note += '=' + (PIECE_LETTER[abs(move.promotion)] || '');
  }

  return note;
}

/* ──────────────────────────────────────────────────────────────
   10. AI ENGINE MODULE
   ────────────────────────────────────────────────────────────── */
const MAT = { 1:100, 2:320, 3:330, 4:500, 5:900, 6:20000 };

const PST = {
  1: [// Pawn
    [ 0, 0, 0, 0, 0, 0, 0, 0],
    [50,50,50,50,50,50,50,50],
    [10,10,20,30,30,20,10,10],
    [ 5, 5,10,25,25,10, 5, 5],
    [ 0, 0, 0,20,20, 0, 0, 0],
    [ 5,-5,-10, 0, 0,-10,-5, 5],
    [ 5,10,10,-20,-20,10,10, 5],
    [ 0, 0, 0, 0, 0, 0, 0, 0]],
  2: [// Knight
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]],
  3: [// Bishop
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]],
  4: [// Rook
    [ 0, 0, 0, 0, 0, 0, 0, 0],
    [ 5,10,10,10,10,10,10, 5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [ 0, 0, 0, 5, 5, 0, 0, 0]],
  5: [// Queen
    [-20,-10,-10,-5,-5,-10,-10,-20],
    [-10,  0,  0, 0, 0,  0,  0,-10],
    [-10,  0,  5, 5, 5,  5,  0,-10],
    [ -5,  0,  5, 5, 5,  5,  0, -5],
    [  0,  0,  5, 5, 5,  5,  0, -5],
    [-10,  5,  5, 5, 5,  5,  0,-10],
    [-10,  0,  5, 0, 0,  0,  0,-10],
    [-20,-10,-10,-5,-5,-10,-10,-20]],
  6: [// King (middlegame)
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20]]
};

function evalBoard(state) {
  let score = 0;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const piece = state.board[r][c];
    if (!piece) continue;
    const ap = abs(piece);
    const matv = MAT[ap];
    const pstRow = isWhite(piece) ? r : 7-r;
    const pstv = PST[ap] ? PST[ap][pstRow][c] : 0;
    score += isWhite(piece) ? (matv+pstv) : -(matv+pstv);
  }
  return score;
}

function sortMoves(state, moves) {
  return moves.slice().sort((a,b) => {
    const ca = state.board[a.toRow][a.toCol]!==0 ? MAT[abs(state.board[a.toRow][a.toCol])] : 0;
    const cb = state.board[b.toRow][b.toCol]!==0 ? MAT[abs(state.board[b.toRow][b.toCol])] : 0;
    return cb - ca;
  });
}

const AI = {
  _nodes: 0,

  random(moves) {
    return moves[Math.floor(Math.random()*moves.length)];
  },

  greedy(state, moves) {
    const max = state.turn === 'white';
    let best = null, bestScore = max ? -Infinity : Infinity;
    for (const mv of moves) {
      const s = evalBoard(applyMove(state, mv));
      if (max ? s>bestScore : s<bestScore) { bestScore=s; best=mv; }
    }
    return best;
  },

  minimax(state, depth, moves) {
    this._nodes = 0;
    const max = state.turn === 'white';
    let best = null, bestScore = max ? -Infinity : Infinity;
    const sorted = sortMoves(state, moves);
    for (const mv of sorted) {
      const ns = applyMove(state, mv);
      const s = this._search(ns, depth-1, -Infinity, Infinity, !max);
      if (max ? s>bestScore : s<bestScore) { bestScore=s; best=mv; }
    }
    return best;
  },

  _search(state, depth, alpha, beta, maximize) {
    this._nodes++;
    if (depth === 0) return evalBoard(state);
    const moves = getLegalMoves(state, state.turn);
    if (moves.length === 0) {
      return isKingInCheck(state, state.turn)
        ? (maximize ? -99000-depth : 99000+depth)
        : 0;
    }
    const sorted = sortMoves(state, moves);
    if (maximize) {
      let v = -Infinity;
      for (const mv of sorted) {
        v = Math.max(v, this._search(applyMove(state,mv), depth-1, alpha, beta, false));
        alpha = Math.max(alpha, v);
        if (beta<=alpha) break;
      }
      return v;
    } else {
      let v = Infinity;
      for (const mv of sorted) {
        v = Math.min(v, this._search(applyMove(state,mv), depth-1, alpha, beta, true));
        beta = Math.min(beta, v);
        if (beta<=alpha) break;
      }
      return v;
    }
  },

  getBestMove(state, diff) {
    const moves = getLegalMoves(state, state.turn);
    if (!moves.length) return null;
    switch(diff) {
      case 'easy':   return this.random(moves);
      case 'medium': return this.greedy(state, moves);
      case 'hard':   return this.minimax(state, Config.aiDepths.hard, moves);
      default:       return this.random(moves);
    }
  }
};

/* ──────────────────────────────────────────────────────────────
   11. STORAGE MODULE
   ────────────────────────────────────────────────────────────── */
const Storage = {
  save(app) {
    try {
      localStorage.setItem(Config.storageKey, JSON.stringify({
        gameState: {
          board:     app.gs.board,
          turn:      app.gs.turn,
          castling:  app.gs.castling,
          enPassant: app.gs.enPassant,
          halfClock: app.gs.halfClock,
          fullMove:  app.gs.fullMove,
          history:   app.gs.history,
          status:    app.gs.status,
          result:    app.gs.result,
        },
        mode:        app.mode,
        diff:        app.diff,
        playerColor: app.playerColor,
        flipped:     app.flipped,
        timerW:      app.timerW,
        timerB:      app.timerB,
        blitzMin:    app.blitzMin,
        blitzOn:     app.blitzOn,
      }));
    } catch(e) {}
  },

  load() {
    try {
      const raw = localStorage.getItem(Config.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  },

  clear() { try { localStorage.removeItem(Config.storageKey); } catch(e) {} },

  saveDark(val) { try { localStorage.setItem('klickspiele_dark',''+val); } catch(e) {} },
  loadDark()    { try { return localStorage.getItem('klickspiele_dark')==='true'; } catch(e) { return false; } },
};

/* ──────────────────────────────────────────────────────────────
   12. RENDER MODULE
   ────────────────────────────────────────────────────────────── */
const Render = {
  boardEl: null,

  init(el) {
    this.boardEl = el;
    this._build();
  },

  _build() {
    this.boardEl.innerHTML = '';
    for (let r=0;r<8;r++) {
      for (let c=0;c<8;c++) {
        const sq = document.createElement('div');
        sq.className = 'csq ' + ((r+c)%2===0 ? 'sq-l' : 'sq-d');
        sq.dataset.r = r; sq.dataset.c = c;
        sq.setAttribute('role','gridcell');
        sq.setAttribute('tabindex','0');

        const piece = document.createElement('span');
        piece.className = 'cpc';
        piece.setAttribute('aria-hidden','true');
        sq.appendChild(piece);

        if (c===0) {
          const rl = document.createElement('span');
          rl.className='sq-lbl sq-r'; rl.textContent=RANKS[r];
          sq.appendChild(rl);
        }
        if (r===7) {
          const fl = document.createElement('span');
          fl.className='sq-lbl sq-f'; fl.textContent=FILES[c];
          sq.appendChild(fl);
        }
        this.boardEl.appendChild(sq);
      }
    }
  },

  fullUpdate(app) {
    this._updateSquares(app);
    this._updateStatus(app.gs, app.mode, app.playerColor);
    this._updateMoveList(app.gs.history);
    this._updateCaptured(app.gs.history);
    this._updateTimers(app.timerW, app.timerB, app.gs.turn, app.blitzOn);
  },

  _updateSquares(app) {
    const { gs, flipped, selectedSq, legalHints } = app;
    const lastMove = gs.history.length ? gs.history[gs.history.length-1].move : null;

    this.boardEl.querySelectorAll('.csq').forEach(sq => {
      const dr = parseInt(sq.dataset.r);
      const dc = parseInt(sq.dataset.c);
      const br = flipped ? 7-dr : dr;
      const bc = flipped ? 7-dc : dc;

      sq.dataset.br = br; sq.dataset.bc = bc;

      const piece = gs.board[br][bc];
      const pEl = sq.querySelector('.cpc');
      pEl.textContent = sym(piece);
      pEl.className = 'cpc' + (piece>0?' wp':piece<0?' bp':'');

      sq.className = 'csq ' + ((dr+dc)%2===0?'sq-l':'sq-d');

      if (selectedSq && selectedSq.r===br && selectedSq.c===bc) sq.classList.add('sq-sel');
      if (legalHints) {
        const mv = legalHints.find(m=>m.toRow===br&&m.toCol===bc);
        if (mv) sq.classList.add(piece!==0?'sq-cap':'sq-dot');
      }
      if (lastMove) {
        if (lastMove.fromRow===br && lastMove.fromCol===bc) sq.classList.add('sq-lf');
        if (lastMove.toRow===br   && lastMove.toCol===bc)   sq.classList.add('sq-lt');
      }
      if ((gs.status==='check'||gs.status==='checkmate') && piece===(gs.turn==='white'?K:-K))
        sq.classList.add('sq-chk');

      // Accessibility label
      const label = piece
        ? `${piece>0?'Weiß':'Schwarz'} ${PIECE_NAME[abs(piece)]} ${FILES[bc]}${RANKS[br]}`
        : `${FILES[bc]}${RANKS[br]}`;
      sq.setAttribute('aria-label', label);

      // Labels (flip-aware)
      const rl = sq.querySelector('.sq-r');
      if (rl) rl.textContent = RANKS[br];
      const fl = sq.querySelector('.sq-f');
      if (fl) fl.textContent = FILES[bc];
    });
  },

  _updateStatus(gs, mode, pc) {
    const el = document.getElementById('game-status');
    if (!el) return;
    const who = gs.turn==='white' ? 'Weiß' : 'Schwarz';
    const msgs = {
      playing:   `${who} ist am Zug`,
      check:     `⚠️ ${who} steht im Schach!`,
      checkmate: `🏆 Schachmatt! ${gs.result==='white'?'Weiß':'Schwarz'} gewinnt!`,
      stalemate: `🤝 Patt! Remis.`,
      draw:      `🤝 Remis!`,
    };
    el.textContent = msgs[gs.status] || '';
    el.className = 'game-status' +
      (gs.status==='check'?             ' st-check' :
       gs.status==='checkmate'||gs.status==='stalemate'||gs.status==='draw' ? ' st-end' : '');
  },

  _updateMoveList(history) {
    const el = document.getElementById('move-list');
    if (!el) return;
    el.innerHTML = '';
    for (let i=0;i<history.length;i+=2) {
      const row = document.createElement('div');
      row.className = 'mv-row';
      const num = document.createElement('span');
      num.className='mv-num'; num.textContent=(i/2+1)+'.';
      row.appendChild(num);
      const w = document.createElement('span');
      w.className='mv-n'+(i===history.length-1?' mv-last':'');
      w.textContent=history[i].notation;
      row.appendChild(w);
      if (history[i+1]) {
        const b = document.createElement('span');
        b.className='mv-n'+(i+1===history.length-1?' mv-last':'');
        b.textContent=history[i+1].notation;
        row.appendChild(b);
      }
      el.appendChild(row);
    }
    el.scrollTop=el.scrollHeight;
  },

  _updateCaptured(history) {
    const wCap=[], bCap=[];
    for (const h of history) {
      if (h.captured > 0) bCap.push(h.captured);
      else if (h.captured < 0) wCap.push(-h.captured);
    }
    wCap.sort((a,b)=>b-a); bCap.sort((a,b)=>b-a);
    const ew = document.getElementById('cap-white');
    const eb = document.getElementById('cap-black');
    if (ew) ew.textContent = wCap.map(p=>BLACK_SYM[p]).join('');
    if (eb) eb.textContent = bCap.map(p=>WHITE_SYM[p]).join('');
  },

  _updateTimers(tw, tb, turn, blitzOn) {
    const ew = document.getElementById('timer-w');
    const eb = document.getElementById('timer-b');
    const sec = document.getElementById('timer-section');
    if (sec) sec.style.display = blitzOn ? 'flex' : 'none';
    if (ew) { ew.textContent=fmtTime(tw); ew.closest('.timer-chip')?.classList.toggle('timer-active',turn==='white'&&blitzOn); }
    if (eb) { eb.textContent=fmtTime(tb); eb.closest('.timer-chip')?.classList.toggle('timer-active',turn==='black'&&blitzOn); }
  },

  getBoardSq(br, bc) {
    return this.boardEl.querySelector(`[data-br="${br}"][data-bc="${bc}"]`);
  }
};

function fmtTime(s) {
  if (isNaN(s)||s<0) s=0;
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}

/* ──────────────────────────────────────────────────────────────
   13. ANIMATION MODULE
   ────────────────────────────────────────────────────────────── */
const Anim = {
  busy: false,

  move(fromEl, toEl, pieceSym, done) {
    if (!fromEl||!toEl||!pieceSym) { done&&done(); return; }
    const fr = fromEl.getBoundingClientRect();
    const tr = toEl.getBoundingClientRect();

    const ghost = document.createElement('span');
    ghost.className = 'piece-ghost';
    ghost.textContent = pieceSym;
    ghost.style.cssText = `
      position:fixed;left:${fr.left}px;top:${fr.top}px;
      width:${fr.width}px;height:${fr.height}px;
      font-size:${fr.width*0.74}px;line-height:${fr.height}px;
      text-align:center;pointer-events:none;z-index:1000;
      transition:left ${Config.animDuration}ms var(--ease),top ${Config.animDuration}ms var(--ease);
      will-change:left,top;`;
    document.body.appendChild(ghost);
    this.busy = true;

    const pc = fromEl.querySelector('.cpc');
    if (pc) pc.style.opacity='0';

    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      ghost.style.left=tr.left+'px';
      ghost.style.top=tr.top+'px';
    }));

    setTimeout(()=>{
      ghost.remove();
      if (pc) pc.style.opacity='';
      this.busy=false;
      done&&done();
    }, Config.animDuration+30);
  }
};

/* ──────────────────────────────────────────────────────────────
   14. PROMOTION DIALOG
   ────────────────────────────────────────────────────────────── */
function showPromo(color, cb) {
  const scrim = document.getElementById('promo-scrim');
  if (!scrim) { cb(isWhite(color)?Q:-Q); return; }
  const pieces = [Q,R,B,N];
  const syms = color==='white' ? WHITE_SYM : BLACK_SYM;
  scrim.querySelectorAll('.promo-btn').forEach((btn,i)=>{
    btn.textContent=syms[pieces[i]];
    btn.dataset.p=color==='white'?pieces[i]:-pieces[i];
    btn.onclick=()=>{
      scrim.classList.remove('show');
      cb(parseInt(btn.dataset.p));
    };
  });
  scrim.classList.add('show');
  scrim.querySelector('.promo-btn').focus();
}

/* ──────────────────────────────────────────────────────────────
   15. GAME OVER DIALOG
   ────────────────────────────────────────────────────────────── */
function showGameOver(gs) {
  const scrim = document.getElementById('go-scrim');
  if (!scrim) return;
  const title=document.getElementById('go-title'), msg=document.getElementById('go-msg');
  const map = {
    checkmate: { t:'🏆 Schachmatt!', m:`${gs.result==='white'?'Weiß':'Schwarz'} gewinnt!` },
    stalemate: { t:'🤝 Patt!', m:'Remis durch Patt' },
    draw:      { t:'🤝 Remis!', m:'Unentschieden' },
  };
  const info = map[gs.status];
  if (!info) return;
  if (title) title.textContent=info.t;
  if (msg)   msg.textContent=info.m;
  scrim.classList.add('show');
  document.getElementById('go-new')?.focus();
}

/* ──────────────────────────────────────────────────────────────
   16. UI CONTROLLER (APP)
   ────────────────────────────────────────────────────────────── */
const App = {
  gs:          null,   // GameState
  mode:        Config.defaultMode,
  diff:        Config.defaultDiff,
  playerColor: Config.defaultColor,
  flipped:     false,
  selectedSq:  null,   // {r, c}
  legalHints:  null,   // legal moves from selected square
  aiThinking:  false,
  timerW:      0,
  timerB:      0,
  blitzMin:    5,
  blitzOn:     false,
  _timerID:    null,
  _aiTID:      null,

  init() {
    Render.init(document.getElementById('chess-board'));
    this._bindAll();
    document.body.classList.toggle('dark-mode', Storage.loadDark());

    const saved = Storage.load();
    if (saved?.gameState &&
        (saved.gameState.status==='playing'||saved.gameState.status==='check')) {
      this._loadSave(saved);
    } else {
      this.newGame();
    }
  },

  _loadSave(s) {
    this.gs=s.gameState; this.mode=s.mode||Config.defaultMode;
    this.diff=s.diff||Config.defaultDiff; this.playerColor=s.playerColor||Config.defaultColor;
    this.flipped=s.flipped||false; this.timerW=s.timerW||0; this.timerB=s.timerB||0;
    this.blitzMin=s.blitzMin||5; this.blitzOn=s.blitzOn||false;
    this._syncUI(); Render.fullUpdate(this);
    if (this.blitzOn) this._startTimer();
  },

  newGame(opts={}) {
    clearInterval(this._timerID); clearTimeout(this._aiTID);
    if (opts.mode)        this.mode=opts.mode;
    if (opts.diff)        this.diff=opts.diff;
    if (opts.playerColor) this.playerColor=opts.playerColor;

    this.flipped = (this.mode!=='pvp' && this.playerColor==='black');
    this.gs = newGameState();
    this.selectedSq=null; this.legalHints=null; this.aiThinking=false;

    if (this.blitzOn) {
      this.timerW=this.blitzMin*60; this.timerB=this.blitzMin*60;
      this._startTimer();
    } else { this.timerW=0; this.timerB=0; }

    this._syncUI(); Render.fullUpdate(this); Storage.save(this);

    if (this.mode==='pvc' && this.playerColor==='black') {
      setTimeout(()=>this._triggerAI(), 600);
    }
  },

  _startTimer() {
    clearInterval(this._timerID);
    this._timerID = setInterval(()=>{
      if (this.gs.status!=='playing'&&this.gs.status!=='check') {
        clearInterval(this._timerID); return;
      }
      if (this.gs.turn==='white') this.timerW--; else this.timerB--;
      if (this.timerW<=0||this.timerB<=0) {
        clearInterval(this._timerID);
        const loser=this.timerW<=0?'white':'black';
        this.gs.status='checkmate';
        this.gs.result=loser==='white'?'black':'white';
        Render.fullUpdate(this);
        setTimeout(()=>showGameOver(this.gs),400);
        return;
      }
      Render._updateTimers(this.timerW,this.timerB,this.gs.turn,this.blitzOn);
    },1000);
  },

  _syncUI() {
    document.querySelectorAll('.diff-btn').forEach(b=>b.classList.toggle('active',b.dataset.diff===this.diff));
    document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===this.mode));
    document.querySelectorAll('.col-btn').forEach(b=>b.classList.toggle('active',b.dataset.col===this.playerColor));
    const ds=document.getElementById('diff-section');
    if (ds) ds.style.display=this.mode==='pvc'?'':'none';
    const btz=document.getElementById('btn-blitz');
    if (btz) btz.classList.toggle('active',this.blitzOn);
    const bls=document.getElementById('blitz-select');
    if (bls) bls.value=this.blitzMin;
  },

  _bindAll() {
    const board=document.getElementById('chess-board');

    // Click
    board.addEventListener('click',e=>this._onSqClick(e));
    board.addEventListener('keydown',e=>{
      if (e.key==='Enter'||e.key===' '){e.preventDefault();this._onSqClick(e);}
    });

    // Drag & drop
    let dragSrc=null;
    board.addEventListener('dragstart',e=>{
      const sq=e.target.closest('.csq'); if(!sq) return;
      const br=parseInt(sq.dataset.br),bc=parseInt(sq.dataset.bc);
      if (!this._canTouch(this.gs.board[br][bc])){e.preventDefault();return;}
      dragSrc={r:br,c:bc};
      e.dataTransfer.effectAllowed='move';
      sq.classList.add('dragging');
      this._select(br,bc);
    });
    board.addEventListener('dragover',e=>{e.preventDefault();e.target.closest('.csq')?.classList.add('drag-over');});
    board.addEventListener('dragleave',e=>{e.target.closest('.csq')?.classList.remove('drag-over');});
    board.addEventListener('drop',e=>{
      e.preventDefault();
      board.querySelectorAll('.drag-over,.dragging').forEach(el=>{
        el.classList.remove('drag-over','dragging');
      });
      const sq=e.target.closest('.csq'); if(!sq||!dragSrc) return;
      this._tryMove(dragSrc.r,dragSrc.c,parseInt(sq.dataset.br),parseInt(sq.dataset.bc));
      dragSrc=null;
    });

    // Touch drag
    let touchSrc=null,ghostEl=null;
    board.addEventListener('touchstart',e=>{
      const sq=e.target.closest('.csq'); if(!sq) return;
      touchSrc=sq;
    },{passive:true});
    board.addEventListener('touchend',e=>{
      if (!touchSrc) return;
      const t=e.changedTouches[0];
      const target=document.elementFromPoint(t.clientX,t.clientY);
      const toSq=target?.closest('.csq');
      const fr=parseInt(touchSrc.dataset.br),fc=parseInt(touchSrc.dataset.bc);
      if (toSq && toSq!==touchSrc) {
        this._tryMove(fr,fc,parseInt(toSq.dataset.br),parseInt(toSq.dataset.bc));
      } else {
        this._onSqClick({target:touchSrc});
      }
      touchSrc=null;
    },{passive:true});

    // Buttons
    document.getElementById('btn-undo')?.addEventListener('click',()=>this.undo());
    document.getElementById('btn-restart')?.addEventListener('click',()=>{
      if (confirm('Neues Spiel starten?')) this.newGame();
    });
    document.getElementById('btn-flip')?.addEventListener('click',()=>{
      this.flipped=!this.flipped; Render.fullUpdate(this);
    });
    document.getElementById('btn-dark')?.addEventListener('click',()=>{
      const d=document.body.classList.toggle('dark-mode');
      Storage.saveDark(d);
    });
    document.getElementById('btn-blitz')?.addEventListener('click',()=>{
      this.blitzOn=!this.blitzOn;
      if (!this.blitzOn) clearInterval(this._timerID);
      this._syncUI();
      Render._updateTimers(this.timerW,this.timerB,this.gs.turn,this.blitzOn);
    });
    document.getElementById('blitz-select')?.addEventListener('change',e=>{
      this.blitzMin=parseInt(e.target.value);
    });

    // Setup dialog
    document.getElementById('btn-settings')?.addEventListener('click',()=>{
      document.getElementById('setup-scrim').classList.add('show');
    });
    document.getElementById('btn-setup-close')?.addEventListener('click',()=>{
      document.getElementById('setup-scrim').classList.remove('show');
    });
    document.getElementById('btn-new-game')?.addEventListener('click',()=>{
      document.getElementById('setup-scrim').classList.remove('show');
      this.newGame();
    });

    // Mode/Diff/Color buttons in setup
    document.querySelectorAll('.mode-btn').forEach(b=>b.addEventListener('click',()=>{
      this.mode=b.dataset.mode;
      this._syncUI();
    }));
    document.querySelectorAll('.diff-btn').forEach(b=>b.addEventListener('click',()=>{
      this.diff=b.dataset.diff;
      this._syncUI();
    }));
    document.querySelectorAll('.col-btn').forEach(b=>b.addEventListener('click',()=>{
      this.playerColor=b.dataset.col;
      this._syncUI();
    }));

    // Game over dialog
    document.getElementById('go-new')?.addEventListener('click',()=>{
      document.getElementById('go-scrim').classList.remove('show');
      this.newGame();
    });
    document.getElementById('go-settings')?.addEventListener('click',()=>{
      document.getElementById('go-scrim').classList.remove('show');
      document.getElementById('setup-scrim').classList.add('show');
    });

    // Ripple
    document.addEventListener('pointerdown',e=>{
      const h=e.target.closest('.rpl'); if(!h) return;
      const rect=h.getBoundingClientRect();
      const x=e.clientX-rect.left,y=e.clientY-rect.top;
      const sz=Math.max(rect.width,rect.height)*2.4;
      const w=document.createElement('span');
      w.className='rpl-wave';
      w.style.cssText=`width:${sz}px;height:${sz}px;left:${x-sz/2}px;top:${y-sz/2}px`;
      h.appendChild(w);
      w.addEventListener('animationend',()=>w.remove());
    },{passive:true});
  },

  _onSqClick(e) {
    if (this.aiThinking||Anim.busy) return;
    const term = ['checkmate','stalemate','draw'];
    if (term.includes(this.gs.status)) return;

    const sq=e.target.closest('.csq'); if(!sq) return;
    const br=parseInt(sq.dataset.br),bc=parseInt(sq.dataset.bc);
    if (isNaN(br)||isNaN(bc)) return;

    if (this.selectedSq) {
      if (this.selectedSq.r===br && this.selectedSq.c===bc) {
        this.selectedSq=null; this.legalHints=null; Render.fullUpdate(this); return;
      }
      const moved=this._tryMove(this.selectedSq.r,this.selectedSq.c,br,bc);
      if (!moved) {
        const p=this.gs.board[br][bc];
        if (p && this._canTouch(p)) this._select(br,bc);
        else { this.selectedSq=null; this.legalHints=null; Render.fullUpdate(this); }
      }
    } else {
      const p=this.gs.board[br][bc];
      if (p && this._canTouch(p)) this._select(br,bc);
    }
  },

  _canTouch(piece) {
    if (!piece) return false;
    const c=colorOf(piece);
    if (this.mode==='pvp') return c===this.gs.turn;
    return c===this.playerColor && c===this.gs.turn;
  },

  _select(r,c) {
    this.selectedSq={r,c};
    const all=getLegalMoves(this.gs,this.gs.turn);
    this.legalHints=all.filter(m=>m.fromRow===r&&m.fromCol===c);
    Render.fullUpdate(this);
  },

  _tryMove(fr,fc,tr,tc) {
    const all=getLegalMoves(this.gs,this.gs.turn);
    const cands=all.filter(m=>m.fromRow===fr&&m.fromCol===fc&&m.toRow===tr&&m.toCol===tc);
    if (!cands.length) return false;

    const piece=this.gs.board[fr][fc];
    const promRow=isWhite(piece)?0:7;
    if (abs(piece)===P && tr===promRow) {
      showPromo(colorOf(piece),chosen=>{
        const mv=cands.find(m=>m.promotion===chosen)||cands[0];
        this._exec(mv,all);
      });
      return true;
    }
    this._exec(cands[0],all);
    return true;
  },

  _exec(move, allLegal) {
    const notation=toAlgebraic(this.gs,move,allLegal);
    const captured=this.gs.board[move.toRow][move.toCol]||(move.enPassant?this.gs.board[move.fromRow][move.toCol]:0);
    const fromEl=Render.getBoardSq(move.fromRow,move.fromCol);
    const toEl=Render.getBoardSq(move.toRow,move.toCol);
    const pSym=sym(this.gs.board[move.fromRow][move.fromCol]);

    const ns=applyMove(this.gs,move);
    const si=gameStatus(ns);
    ns.status=si.status; ns.result=si.result;

    let fullNote=notation;
    if (si.status==='checkmate') fullNote+='#';
    else if (si.status==='check') fullNote+='+';

    ns.history=[...this.gs.history,{move,notation:fullNote,captured}];
    this.gs=ns;
    this.selectedSq=null; this.legalHints=null;

    Anim.move(fromEl,toEl,pSym,()=>{
      Render.fullUpdate(this);
      Storage.save(this);

      const term=['checkmate','stalemate','draw'];
      if (term.includes(ns.status)) {
        setTimeout(()=>showGameOver(ns),500); return;
      }
      if (this.mode==='pvc' && this.gs.turn!==this.playerColor) {
        this._triggerAI();
      }
    });
  },

  _triggerAI() {
    this.aiThinking=true;
    document.getElementById('ai-indicator')?.classList.add('vis');
    const snap=this.gs, d=this.diff;
    this._aiTID=setTimeout(()=>{
      const mv=AI.getBestMove(snap,d);
      this.aiThinking=false;
      document.getElementById('ai-indicator')?.classList.remove('vis');
      if (mv) {
        const all=getLegalMoves(snap,snap.turn);
        this._exec(mv,all);
      }
    },d==='hard'?80:30);
  },

  undo() {
    if (this.aiThinking||!this.gs.history.length) return;
    clearTimeout(this._aiTID); this.aiThinking=false;
    document.getElementById('ai-indicator')?.classList.remove('vis');

    const steps=this.mode==='pvc'&&this.gs.history.length>=2?2:1;
    let ns=newGameState();
    const hist=this.gs.history.slice(0,-steps);
    for (const h of hist) ns=applyMove(ns,h.move);
    const si=gameStatus(ns); ns.status=si.status; ns.result=si.result;
    ns.history=hist;

    this.gs=ns; this.selectedSq=null; this.legalHints=null;
    Render.fullUpdate(this); Storage.save(this);
  }
};

/* ──────────────────────────────────────────────────────────────
   BOOTSTRAP
   ────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded',()=>App.init());

})();
