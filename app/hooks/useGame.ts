"use client";

import { useEffect, useState } from "react";

import { type AiDifficulty, getBestMove } from "@/lib/ai";
import {
  type Board,
  type Move,
  type Player,
  applyMove,
  createInitialBoard,
  getWinner,
  getMovesForPiece,
} from "@/lib/russianDraughtsEngine";

export type GameMode = "pvp" | "ai";

export type UseGameState = {
  board: Board;
  selectedSquare: number | null;
  legalMovesForSelected: Move[];
  gameHistory: Board[];
  moveHistory: Move[];
  gameMode: GameMode;
  aiDifficulty: AiDifficulty;
  isCasualMode: boolean;
  isAiThinking: boolean;
  lastMove: Move | null;
  lastMoveBy: Player | "ai" | null;
  setGameMode: (mode: GameMode) => void;
  setAiDifficulty: (difficulty: AiDifficulty) => void;
  setIsCasualMode: (enabled: boolean) => void;
  selectSquare: (index: number) => void;
  resetGame: () => void;
};

export function useGame(): UseGameState {
  const [board, setBoard] = useState<Board>(() => createInitialBoard());
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [legalMovesForSelected, setLegalMovesForSelected] = useState<Move[]>([]);
  const [gameHistory, setGameHistory] = useState<Board[]>(() => [createInitialBoard()]);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [gameMode, setGameModeState] = useState<GameMode>("pvp");
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>("medium");
  const [isCasualMode, setIsCasualModeState] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [lastMoveBy, setLastMoveBy] = useState<Player | "ai" | null>(null);

  useEffect(() => {
    if (gameMode !== "ai" || board.turn !== "black" || getWinner(board)) {
      return;
    }

    const delay = 600 + Math.random() * 300;
    const timeout = window.setTimeout(() => {
      const aiMove = getBestMove(board, aiDifficulty, { casualMode: isCasualMode });
      const nextBoard = applyMove(board, aiMove);
      setBoard(nextBoard);
      setGameHistory((history) => [...history, nextBoard]);
      setMoveHistory((history) => [...history, aiMove]);
      setLastMove(aiMove);
      setLastMoveBy("ai");
      setIsAiThinking(false);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [aiDifficulty, board, gameMode, isCasualMode]);

  function clearSelection() {
    setSelectedSquare(null);
    setLegalMovesForSelected([]);
  }

  function selectSquare(index: number) {
    if (isAiThinking || (gameMode === "ai" && board.turn === "black")) return;

    const selectedMove = legalMovesForSelected.find((move) => move.to === index);
    if (selectedMove) {
      const nextBoard = applyMove(board, selectedMove);
      const movingPlayer = board.turn;
      setBoard(nextBoard);
      setGameHistory((history) => [...history, nextBoard]);
      setMoveHistory((history) => [...history, selectedMove]);
      setLastMove(selectedMove);
      setLastMoveBy(movingPlayer);
      if (gameMode === "ai" && nextBoard.turn === "black" && !getWinner(nextBoard)) {
        setIsAiThinking(true);
      }
      clearSelection();
      return;
    }

    if (selectedSquare === index) {
      clearSelection();
      return;
    }

    const moves = getMovesForPiece(board, index, { casualMode: isCasualMode });
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
    setMoveHistory([]);
    setLastMove(null);
    setLastMoveBy(null);
    setIsAiThinking(false);
    clearSelection();
  }

  function setGameMode(mode: GameMode) {
    setGameModeState(mode);
    resetGame();
  }

  function setIsCasualMode(enabled: boolean) {
    setIsCasualModeState(enabled);
    clearSelection();
  }

  return {
    board,
    selectedSquare,
    legalMovesForSelected,
    gameHistory,
    moveHistory,
    gameMode,
    aiDifficulty,
    isCasualMode,
    isAiThinking,
    lastMove,
    lastMoveBy,
    setGameMode,
    setAiDifficulty,
    setIsCasualMode,
    selectSquare,
    resetGame,
  };
}
