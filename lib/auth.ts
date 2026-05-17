import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

const SESSION_STORAGE_KEY = "damaiq_session";

type StoredSession = {
  userId: string;
  accessToken: string;
  refreshToken: string;
};

export async function ensureAnonymousSession(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const stored = readStoredSession();
    if (stored) {
      const { error } = await supabase.auth.setSession({
        access_token: stored.accessToken,
        refresh_token: stored.refreshToken,
      });
      if (!error) return stored.userId;
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.session || !data.user) {
      console.warn("[DamaIQ] Anonymous auth failed:", error?.message);
      return null;
    }

    writeStoredSession({
      userId: data.user.id,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });

    return data.user.id;
  } catch (error) {
    console.warn("[DamaIQ] Auth unavailable:", error);
    return null;
  }
}

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredSession): void {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}
