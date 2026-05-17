import { type City } from "@/lib/cities";
import { type Move } from "@/lib/russianDraughtsEngine";

export type PlayerProfile = {
  nickname: string;
  city: City;
  wins: number;
  losses: number;
  totalGames: number;
  winStreak: number;
  bestStreak: number;
  profileId?: string;
};

export type LeaderboardEntry = PlayerProfile;

export type GameResult = "win" | "loss" | "draw";

export type GameOpponent = "ai_easy" | "ai_medium" | "ai_hard" | "pvp";

export type StoredGame = {
  id: string;
  opponent: GameOpponent;
  result: GameResult;
  totalMoves: number;
  durationSeconds: number;
  moveHistory: string[];
  createdAt: string;
};

export type GameEndPayload = {
  opponent: GameOpponent;
  result: GameResult;
  totalMoves: number;
  durationSeconds: number;
  moves: Move[];
};

export type CityBattle = {
  cityA: City;
  cityB: City;
  winsA: number;
  winsB: number;
};

export function winRate(entry: Pick<PlayerProfile, "wins" | "losses" | "totalGames">): number {
  if (entry.totalGames === 0) return 0;
  return Math.round((entry.wins / entry.totalGames) * 100);
}
