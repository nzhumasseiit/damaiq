import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url !== "your_url" && key !== "your_anon_key");
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  return client;
}

export type SupabaseProfile = {
  id: string;
  nickname: string;
  city: string;
  wins: number;
  losses: number;
  total_games: number;
  win_streak: number;
  best_streak: number;
  is_pro: boolean;
  stripe_customer_id: string | null;
  created_at: string;
};

export type SupabaseGame = {
  id: string;
  player_id: string;
  opponent: string;
  result: string;
  total_moves: number;
  duration_seconds: number;
  move_history: string[] | null;
  created_at: string;
};
