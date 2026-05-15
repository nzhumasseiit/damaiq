import assert from "node:assert/strict";
import test from "node:test";

import {
  type Board,
  type Cell,
  applyMove,
  getLegalMoves,
  getMovesForPiece,
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

function notations(board: Board): string[] {
  return getLegalMoves(board)
    .map((move) => move.notation)
    .sort();
}

test("normal man movement", () => {
  const board = place(emptyBoard(), "c3", "whiteMan");

  assert.deepEqual(
    getMovesForPiece(board, "c3")
      .map((move) => move.notation)
      .sort(),
    ["c3-b4", "c3-d4"],
  );
});

test("backward capture by man", () => {
  const board = place(place(emptyBoard(), "c3", "whiteMan"), "d2", "blackMan");

  assert.deepEqual(notations(board), ["c3:e1"]);
});

test("mandatory capture", () => {
  const board = place(place(emptyBoard(), "c3", "whiteMan"), "d4", "blackMan");

  assert.deepEqual(notations(board), ["c3:e5"]);
});

test("multi-capture", () => {
  const board = place(
    place(place(emptyBoard(), "c3", "whiteMan"), "d4", "blackMan"),
    "f6",
    "blackMan",
  );

  assert.deepEqual(notations(board), ["c3:e5:g7"]);
});

test("king long-range movement", () => {
  const board = place(emptyBoard(), "d4", "whiteKing");

  assert.deepEqual(
    notations(board),
    [
      "d4-a1",
      "d4-a7",
      "d4-b2",
      "d4-b6",
      "d4-c3",
      "d4-c5",
      "d4-e3",
      "d4-e5",
      "d4-f2",
      "d4-f6",
      "d4-g1",
      "d4-g7",
      "d4-h8",
    ],
  );
});

test("king long-range capture", () => {
  const board = place(place(emptyBoard(), "a1", "whiteKing"), "d4", "blackMan");

  assert.deepEqual(notations(board), ["a1:e5", "a1:f6", "a1:g7", "a1:h8"]);
});

test("promotion", () => {
  const board = place(emptyBoard(), "c7", "whiteMan");
  const promoted = applyMove(board, "c7-b8");

  assert.equal(promoted.cells[notationToPosition("b8")], "whiteKing");
  assert.equal(promoted.turn, "black");
});

test("promotion during capture and continued capture as king", () => {
  const board = place(
    place(place(emptyBoard(), "b6", "whiteMan"), "c7", "blackMan"),
    "f6",
    "blackMan",
  );

  assert.deepEqual(notations(board), ["b6:d8:g5", "b6:d8:h4"]);

  const moved = applyMove(board, "b6:d8:h4");
  assert.equal(moved.cells[notationToPosition("h4")], "whiteKing");
  assert.equal(moved.cells[notationToPosition("c7")], null);
  assert.equal(moved.cells[notationToPosition("f6")], null);
});
