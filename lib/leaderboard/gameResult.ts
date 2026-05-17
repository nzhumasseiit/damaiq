import { type AiDifficulty } from "@/lib/ai";
import { type GameMode } from "@/app/hooks/useGame";
import { type GameEndPayload, type GameOpponent, type GameResult } from "@/lib/leaderboard/types";
import { type Move } from "@/lib/russianDraughtsEngine";

export function opponentFromMode(gameMode: GameMode, aiDifficulty: AiDifficulty): GameOpponent {
  if (gameMode === "pvp") return "pvp";
  if (gameMode === "online") return "online";
  if (aiDifficulty === "easy") return "ai_easy";
  if (aiDifficulty === "medium") return "ai_medium";
  return "ai_hard";
}

export function resultForPlayer(
  winner: "white" | "black" | null,
  legalMoveCount: number,
  playerColor: "white" | "black" = "white",
): GameResult {
  if (!winner && legalMoveCount === 0) return "draw";
  if (winner === playerColor) return "win";
  if (winner) return "loss";
  return "draw";
}

export function buildGameEndPayload({
  gameMode,
  aiDifficulty,
  winner,
  legalMoveCount,
  moves,
  durationSeconds,
  playerColor = "white",
}: {
  gameMode: GameMode;
  aiDifficulty: AiDifficulty;
  winner: "white" | "black" | null;
  legalMoveCount: number;
  moves: Move[];
  durationSeconds: number;
  playerColor?: "white" | "black";
}): GameEndPayload {
  return {
    opponent: opponentFromMode(gameMode, aiDifficulty),
    result: resultForPlayer(winner, legalMoveCount, playerColor),
    totalMoves: moves.length,
    durationSeconds,
    moves,
  };
}
