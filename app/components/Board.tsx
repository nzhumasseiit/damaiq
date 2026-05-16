"use client";

import { useMemo } from "react";

import { useGame } from "@/app/hooks/useGame";
import {
  type Move,
  type Piece,
  getLegalMoves,
  getWinner,
  positionToNotation,
} from "@/lib/russianDraughtsEngine";

const BOARD_SIZE = 8;
const PLAYABLE_SQUARES = 32;

export default function Board() {
  const {
    board,
    selectedSquare,
    legalMovesForSelected,
    gameHistory,
    selectSquare,
    resetGame,
  } = useGame();

  const legalMoves = useMemo(() => getLegalMoves(board), [board]);
  const winner = useMemo(() => getWinner(board), [board]);
  const selectableSquares = useMemo(
    () => new Set(legalMoves.map((move) => move.from)),
    [legalMoves],
  );
  const destinationMoves = useMemo(
    () => new Map(legalMovesForSelected.map((move) => [move.to, move])),
    [legalMovesForSelected],
  );

  return (
    <section className="flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
            {winner ? `${labelForPlayer(winner)} wins` : `${labelForPlayer(board.turn)} to move`}
          </p>
          <p className="text-xs text-stone-400">{gameHistory.length - 1} moves</p>
        </div>
        <button
          type="button"
          onClick={resetGame}
          className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          Reset
        </button>
      </div>

      <div className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-lg border-4 border-stone-800 bg-stone-800 shadow-xl">
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, square) => {
          const row = Math.floor(square / BOARD_SIZE);
          const column = square % BOARD_SIZE;
          const playable = isPlayableCell(row, column);
          const index = playable ? playableIndex(row, column) : null;
          const piece = index === null ? null : board.cells[index];
          const move = index === null ? undefined : destinationMoves.get(index);
          const selected = index !== null && selectedSquare === index;
          const selectable = index !== null && selectableSquares.has(index);

          if (!playable || index === null) {
            return (
              <div
                key={square}
                className="aspect-square bg-[#f1ddbd]"
                aria-hidden="true"
              />
            );
          }

          return (
            <button
              key={square}
              type="button"
              onClick={() => selectSquare(index)}
              aria-label={ariaLabel(index, piece, move)}
              className={squareClassName({ selected, selectable, move })}
            >
              {piece ? <PieceView piece={piece} /> : null}
              {!piece && move ? <MoveDot move={move} /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PieceView({ piece }: { piece: Piece }) {
  const white = piece.startsWith("white");
  const king = piece.endsWith("King");

  return (
    <span
      className={classNames(
        "flex h-[72%] w-[72%] items-center justify-center rounded-full border-2 shadow-md transition-transform",
        white
          ? "border-stone-200 bg-stone-50 text-stone-800"
          : "border-stone-950 bg-stone-900 text-amber-100",
      )}
    >
      <span
        className={classNames(
          "flex h-[68%] w-[68%] items-center justify-center rounded-full border",
          white ? "border-stone-300" : "border-stone-700",
        )}
      >
        {king ? (
          <span className="translate-y-px text-[clamp(1rem,4vw,1.75rem)] leading-none">
            {white ? "♔" : "♚"}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function MoveDot({ move }: { move: Move }) {
  return (
    <span
      className={classNames(
        "h-3 w-3 rounded-full",
        move.isCapture ? "bg-red-300 ring-4 ring-red-200/40" : "bg-amber-100/80",
      )}
    />
  );
}

function squareClassName({
  selected,
  selectable,
  move,
}: {
  selected: boolean;
  selectable: boolean;
  move?: Move;
}) {
  return classNames(
    "relative flex aspect-square items-center justify-center bg-[#7a4f2a] transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-300",
    "hover:bg-[#8b5c31]",
    selected && "bg-[#a3652f] ring-4 ring-inset ring-amber-300",
    selectable && "after:absolute after:right-1 after:top-1 after:h-2 after:w-2 after:rounded-full after:bg-amber-200",
    move && "bg-[#966133]",
  );
}

function ariaLabel(index: number, piece: Piece | null, move?: Move) {
  const square = positionToNotation(index);
  if (move) return `${square}, legal move ${move.notation}`;
  if (!piece) return `${square}, empty`;
  return `${square}, ${piece}`;
}

function isPlayableCell(row: number, column: number) {
  return (row + column) % 2 === 1;
}

function playableIndex(row: number, column: number) {
  const index = Math.floor((column + row * BOARD_SIZE) / 2);
  if (index < 0 || index >= PLAYABLE_SQUARES) {
    throw new Error(`Invalid playable square: ${row}, ${column}`);
  }
  return index;
}

function labelForPlayer(player: "white" | "black") {
  return player === "white" ? "White" : "Black";
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
