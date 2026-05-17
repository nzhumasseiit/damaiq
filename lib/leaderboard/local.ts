import { MOCK_PLAYERS } from "@/lib/leaderboard/mock";
import {
  type GameEndPayload,
  type GameResult,
  type LeaderboardEntry,
  type PlayerProfile,
  type StoredGame,
} from "@/lib/leaderboard/types";

export const PLAYER_STORAGE_KEY = "damaiq_player";
export const LEADERBOARD_STORAGE_KEY = "damaiq_leaderboard";
export const GAMES_STORAGE_KEY = "damaiq_games";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getPlayerProfile(): PlayerProfile | null {
  return readJson<PlayerProfile>(PLAYER_STORAGE_KEY);
}

export function savePlayerProfile(profile: PlayerProfile): void {
  writeJson(PLAYER_STORAGE_KEY, profile);
  upsertLeaderboardEntry(profile);
}

export function getLeaderboardEntries(): LeaderboardEntry[] {
  seedLeaderboardIfEmpty();
  return readJson<LeaderboardEntry[]>(LEADERBOARD_STORAGE_KEY) ?? [];
}

export function getLocalGames(): StoredGame[] {
  return readJson<StoredGame[]>(GAMES_STORAGE_KEY) ?? [];
}

export function seedLeaderboardIfEmpty(): void {
  const existing = readJson<LeaderboardEntry[]>(LEADERBOARD_STORAGE_KEY);
  if (existing && existing.length > 0) return;

  writeJson(LEADERBOARD_STORAGE_KEY, MOCK_PLAYERS);
}

function upsertLeaderboardEntry(profile: PlayerProfile): void {
  const entries = getLeaderboardEntries();
  const index = entries.findIndex((entry) => entry.nickname === profile.nickname);
  const nextEntry: LeaderboardEntry = { ...profile };

  if (index >= 0) {
    entries[index] = nextEntry;
  } else {
    entries.push(nextEntry);
  }

  writeJson(LEADERBOARD_STORAGE_KEY, entries);
}

function applyResult(profile: PlayerProfile, result: GameResult): PlayerProfile {
  const next: PlayerProfile = {
    ...profile,
    totalGames: profile.totalGames + 1,
  };

  if (result === "win") {
    const streak = profile.winStreak + 1;
    return {
      ...next,
      wins: profile.wins + 1,
      winStreak: streak,
      bestStreak: Math.max(profile.bestStreak, streak),
    };
  }

  if (result === "loss") {
    return {
      ...next,
      losses: profile.losses + 1,
      winStreak: 0,
    };
  }

  return next;
}

export function recordGameLocally(payload: GameEndPayload): PlayerProfile | null {
  const profile = getPlayerProfile();
  if (!profile) return null;

  const updated = applyResult(profile, payload.result);
  savePlayerProfile(updated);

  const games = getLocalGames();
  games.unshift({
    id: crypto.randomUUID(),
    opponent: payload.opponent,
    result: payload.result,
    totalMoves: payload.totalMoves,
    durationSeconds: payload.durationSeconds,
    moveHistory: payload.moves.map((move) => move.notation),
    createdAt: new Date().toISOString(),
  });
  writeJson(GAMES_STORAGE_KEY, games.slice(0, 100));

  return updated;
}
