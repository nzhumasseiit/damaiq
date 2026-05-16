import assert from "node:assert/strict";
import test from "node:test";

import { getBestMove } from "../lib/ai.js";
import {
  type Board,
  type Cell,
  createInitialBoard,
  getLegalMoves,
  notationToPosition,
} from "../lib/russianDraughtsEngine.js";

function emptyBoard(turn: Board["turn"] = "white"): Board {
  return {
    turn,
    cells: Array<Cell>(32).fill(null),
  };
}

function place(board: Board, square: Parameters<typeof notationToPosition>[0], piece: Cell): Board {
  board.cells[notationToPosition(square)] = piece;
  return board;
}

test("easy AI always returns a legal move", () => {
  const board = createInitialBoard();
  const move = getBestMove(board, "easy");
  const legalMoves = getLegalMoves(board).map((candidate) => candidate.notation);

  assert.ok(legalMoves.includes(move.notation));
});

test("medium AI prefers the longest capture chain", () => {
  const board = place(
    place(place(emptyBoard(), "c3", "whiteMan"), "d4", "blackMan"),
    "f6",
    "blackMan",
  );

  assert.equal(getBestMove(board, "medium").notation, "c3:e5:g7");
});

test("hard AI returns a legal move", () => {
  const board = place(place(emptyBoard("black"), "d6", "blackMan"), "c5", "whiteMan");
  const move = getBestMove(board, "hard");
  const legalMoves = getLegalMoves(board).map((candidate) => candidate.notation);

  assert.ok(legalMoves.includes(move.notation));
});
