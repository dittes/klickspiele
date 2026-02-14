import { initSudoku } from "./sudoku.js";
import { initCrossword } from "./crossword.js";
import { initSolitaire } from "./solitaire.js";
import { initMahjong } from "./mahjong.js";
import { initWordsearch } from "./wordsearch.js";
import { initChess, initCheckers, initReversi, initConnect4 } from "./board-games.js";
import { initMinesweeper } from "./minesweeper.js";
import { initLogicBank } from "./logicbank.js";
import { initCasual } from "./casual.js";

const engines = {
  sudoku: initSudoku,
  crossword: initCrossword,
  solitaire: initSolitaire,
  mahjong: initMahjong,
  wordsearch: initWordsearch,
  chess: initChess,
  checkers: initCheckers,
  reversi: initReversi,
  connect4: initConnect4,
  minesweeper: initMinesweeper,
  logicbank: initLogicBank,
  casual: initCasual,
};

export function initEngine(engine, context) {
  const handler = engines[engine];
  if (!handler) {
    context.mount.innerHTML = "<p class='alert alert-warning'>Dieses Spiel wird gerade vorbereitet.</p>";
    return;
  }
  handler(context);
}
