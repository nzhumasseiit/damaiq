"use client";

import { useState } from "react";

import {
  type Board,
  type Move,
  applyMove,
  createInitialBoard,
  getMovesForPiece,
} from "@/lib/russianDraughtsEngine";

export type UseGameState = {
  board: Board;
  selectedSquare: number | null;
  legalMovesForSelected: Move[];
  gameHistory: Board[];
  selectSquare: (index: number) => void;
  resetGame: () => void;
};

export function useGame(): UseGameState {
  const [board, setBoard] = useState<Board>(() => createInitialBoard());
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [legalMovesForSelected, setLegalMovesForSelected] = useState<Move[]>([]);
  const [gameHistory, setGameHistory] = useState<Board[]>(() => [createInitialBoard()]);

  function clearSelection() {
    setSelectedSquare(null);
    setLegalMovesForSelected([]);
  }

  function selectSquare(index: number) {
    const selectedMove = legalMovesForSelected.find((move) => move.to === index);
    if (selectedMove) {
      const nextBoard = applyMove(board, selectedMove);
      setBoard(nextBoard);
      setGameHistory((history) => [...history, nextBoard]);
      clearSelection();
      return;
    }

    if (selectedSquare === index) {
      clearSelection();
      return;
    }

    const moves = getMovesForPiece(board, index);
    if (moves.length === 0) {
      clearSelection();
      return;
    }

    setSelectedSquare(index);
    setLegalMovesForSelected(moves);
  }

  function resetGame() {
    const initialBoard = createInitialBoard();
    setBoard(initialBoard);
    setGameHistory([initialBoard]);
    clearSelection();
  }

  return {
    board,
    selectedSquare,
    legalMovesForSelected,
    gameHistory,
    selectSquare,
    resetGame,
  };
}
