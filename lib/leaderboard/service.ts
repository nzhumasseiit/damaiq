import { type City } from "@/lib/cities";
import { ensureAnonymousSession } from "@/lib/auth";
import {
  getLeaderboardEntries,
  getLocalGames,
  getPlayerProfile,
  recordGameLocally,
  savePlayerProfile,
  seedLeaderboardIfEmpty,
} from "@/lib/leaderboard/local";
import {
  type CityBattle,
  type GameEndPayload,
  type LeaderboardEntry,
  type PlayerProfile,
  type StoredGame,
  winRate,
} from "@/lib/leaderboard/types";
import {
  getSupabase,
  isSupabaseConfigured,
  type SupabaseGame,
  type SupabaseProfile,
} from "@/lib/supabase";

function mapProfile(row: SupabaseProfile): LeaderboardEntry {
  return {
    nickname: row.nickname,
    city: row.city as City,
    wins: row.wins,
    losses: row.losses,
    totalGames: row.total_games,
    winStreak: row.win_streak,
    bestStreak: row.best_streak,
    isPro: row.is_pro,
    stripeCustomerId: row.stripe_customer_id ?? undefined,
    profileId: row.id,
  };
}

export async function fetchLeaderboard(cityFilter: City | "all"): Promise<LeaderboardEntry[]> {
  seedLeaderboardIfEmpty();

  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from("profiles").select("*").order("wins", { ascending: false }).limit(200);

      if (cityFilter !== "all") {
        query = query.eq("city", cityFilter);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return (data as SupabaseProfile[]).map(mapProfile);
      }
    } catch (error) {
      console.warn("[DamaIQ] Leaderboard fetch failed, using localStorage:", error);
    }
  }

  const entries = getLeaderboardEntries().sort((a, b) => b.wins - a.wins);
  if (cityFilter === "all") return entries;
  return entries.filter((entry) => entry.city === cityFilter);
}

export async function fetchCityBattle(): Promise<CityBattle | null> {
  const entries = await fetchLeaderboard("all");
  const totals = new Map<City, number>();

  for (const entry of entries) {
    totals.set(entry.city, (totals.get(entry.city) ?? 0) + entry.wins);
  }

  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length < 2) return null;

  const [first, second] = ranked;
  return {
    cityA: first[0],
    cityB: second[0],
    winsA: first[1],
    winsB: second[1],
  };
}

export async function fetchPlayerGames(): Promise<StoredGame[]> {
  const profile = getPlayerProfile();
  const supabase = getSupabase();

  if (supabase && profile?.profileId) {
    try {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("player_id", profile.profileId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        return (data as SupabaseGame[]).map((row) => ({
          id: row.id,
          opponent: row.opponent as StoredGame["opponent"],
          result: row.result as StoredGame["result"],
          totalMoves: row.total_moves,
          durationSeconds: row.duration_seconds,
          moveHistory: row.move_history ?? [],
          createdAt: row.created_at,
        }));
      }
    } catch (error) {
      console.warn("[DamaIQ] Game history fetch failed, using localStorage:", error);
    }
  }

  return getLocalGames();
}

export async function ensureSupabaseProfile(
  userId: string,
  profile: PlayerProfile,
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  if (profile.profileId) return profile.profileId;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existing?.id) {
    const withId = { ...profile, profileId: existing.id };
    savePlayerProfile(withId);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      nickname: profile.nickname,
      city: profile.city,
      wins: profile.wins,
      losses: profile.losses,
      total_games: profile.totalGames,
      win_streak: profile.winStreak,
      best_streak: profile.bestStreak,
      is_pro: profile.isPro ?? false,
      stripe_customer_id: profile.stripeCustomerId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.warn("[DamaIQ] Profile create failed:", error?.message);
    return null;
  }

  const withId = { ...profile, profileId: data.id };
  savePlayerProfile(withId);
  return data.id;
}

async function recordGameSupabase(
  profileId: string,
  payload: GameEndPayload,
  updated: PlayerProfile,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from("games").insert({
    player_id: profileId,
    opponent: payload.opponent,
    result: payload.result,
    total_moves: payload.totalMoves,
    duration_seconds: payload.durationSeconds,
    move_history: payload.moves.map((move) => move.notation),
  });

  await supabase
    .from("profiles")
    .update({
      wins: updated.wins,
      losses: updated.losses,
      total_games: updated.totalGames,
      win_streak: updated.winStreak,
      best_streak: updated.bestStreak,
      is_pro: updated.isPro ?? false,
      stripe_customer_id: updated.stripeCustomerId ?? null,
    })
    .eq("id", profileId);
}

export async function getCurrentProfileId(): Promise<string | null> {
  const profile = getPlayerProfile();
  if (!profile) return null;

  if (!isSupabaseConfigured()) return profile.profileId ?? null;

  const userId = await ensureAnonymousSession();
  if (!userId) return profile.profileId ?? null;

  return ensureSupabaseProfile(userId, profile);
}

export async function refreshCurrentProfile(): Promise<PlayerProfile | null> {
  const profile = getPlayerProfile();
  if (!profile || !isSupabaseConfigured()) return profile;

  const profileId = await getCurrentProfileId();
  const supabase = getSupabase();
  if (!profileId || !supabase) return profile;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", profileId).maybeSingle();
  if (error || !data) return profile;

  const fresh = mapProfile(data as SupabaseProfile);
  savePlayerProfile(fresh);
  return fresh;
}

export async function recordGameResult(payload: GameEndPayload): Promise<PlayerProfile | null> {
  const updated = recordGameLocally(payload);
  if (!updated) return null;

  if (!isSupabaseConfigured()) return updated;

  try {
    const userId = await ensureAnonymousSession();
    if (!userId) return updated;

    const profileId = await ensureSupabaseProfile(userId, updated);
    if (profileId) {
      await recordGameSupabase(profileId, payload, updated);
    }
  } catch (error) {
    console.warn("[DamaIQ] Supabase game record failed:", error);
  }

  return updated;
}

export function subscribeLeaderboard(onUpdate: () => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel("damaiq-leaderboard")
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
      onUpdate();
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function getPlayerStatsSummary(profile: PlayerProfile) {
  return {
    totalGames: profile.totalGames,
    winRate: winRate(profile),
    bestStreak: profile.bestStreak,
    wins: profile.wins,
    losses: profile.losses,
  };
}

export function createInitialProfile(nickname: string, city: City): PlayerProfile {
  return {
    nickname,
    city,
    wins: 0,
    losses: 0,
    totalGames: 0,
    winStreak: 0,
    bestStreak: 0,
    isPro: false,
  };
}

export async function registerPlayer(nickname: string, city: City): Promise<PlayerProfile> {
  const profile = createInitialProfile(nickname, city);
  savePlayerProfile(profile);

  if (isSupabaseConfigured()) {
    try {
      const userId = await ensureAnonymousSession();
      if (userId) await ensureSupabaseProfile(userId, profile);
    } catch (error) {
      console.warn("[DamaIQ] Supabase profile registration failed:", error);
    }
  }

  return getPlayerProfile() ?? profile;
}
