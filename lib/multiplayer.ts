import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  type Board,
  type Move,
  applyMove,
  createInitialBoard,
  getLegalMoves,
} from "@/lib/russianDraughtsEngine";

export type MultiplayerRole = "host" | "guest";
export type RoomStatus = "waiting" | "playing" | "finished";

export type RoomRecord = {
  id: string;
  code: string;
  host_id: string | null;
  guest_id: string | null;
  board_state: Board;
  current_turn: Board["turn"];
  status: RoomStatus;
  winner: Board["turn"] | "draw" | null;
  created_at: string;
};

export type RoomMessage =
  | { type: "move"; move: Move }
  | { type: "game_over"; winner: Board["turn"] | "draw" | null }
  | { type: "presence"; role: MultiplayerRole };

export function generateRoomCode(): string {
  return `DAMA-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function isMultiplayerConfigured(): boolean {
  return isSupabaseConfigured();
}

export async function createRoom(profileId: string): Promise<RoomRecord> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const board = createInitialBoard();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        code,
        host_id: profileId,
        board_state: board,
        current_turn: board.turn,
        status: "waiting",
      })
      .select("*")
      .single();

    if (!error && data) return data as RoomRecord;
    if (!String(error?.message ?? "").includes("duplicate")) {
      throw new Error(error?.message ?? "Could not create room.");
    }
  }

  throw new Error("Could not create unique room code.");
}

export async function joinRoom(code: string, profileId: string): Promise<RoomRecord> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const normalized = normalizeRoomCode(code);
  const { data, error } = await supabase
    .from("rooms")
    .update({ guest_id: profileId, status: "playing" })
    .eq("code", normalized)
    .in("status", ["waiting", "playing"])
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Room not found.");
  return data as RoomRecord;
}

export async function fetchRoom(code: string): Promise<RoomRecord | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", normalizeRoomCode(code))
    .maybeSingle();
  return data ? (data as RoomRecord) : null;
}

export async function persistRoomMove(code: string, board: Board): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase
    .from("rooms")
    .update({ board_state: board, current_turn: board.turn })
    .eq("code", normalizeRoomCode(code));
}

export async function persistRoomGameOver(
  code: string,
  winner: Board["turn"] | "draw" | null,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase
    .from("rooms")
    .update({ status: "finished", winner })
    .eq("code", normalizeRoomCode(code));
}

export async function broadcastRoomMessage(code: string, message: RoomMessage): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const channel = supabase.channel(`room:${normalizeRoomCode(code)}`);
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
  });
  await channel.send({
    type: "broadcast",
    event: "room_message",
    payload: message,
  });
  await supabase.removeChannel(channel);
}

export function subscribeToRoom(
  code: string,
  onMessage: (message: RoomMessage) => void,
  onDatabaseUpdate: (room: RoomRecord) => void,
): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => undefined;

  const normalized = normalizeRoomCode(code);
  const channel = supabase
    .channel(`room:${normalized}`)
    .on("broadcast", { event: "room_message" }, ({ payload }) => {
      onMessage(payload as RoomMessage);
    })
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rooms", filter: `code=eq.${normalized}` },
      ({ new: next }) => {
        if (next) onDatabaseUpdate(next as RoomRecord);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function validateIncomingMove(board: Board, move: Move): Move | null {
  return (
    getLegalMoves(board).find(
      (candidate) =>
        candidate.notation === move.notation &&
        candidate.from === move.from &&
        candidate.to === move.to,
    ) ?? null
  );
}

export function boardAfterValidatedMove(board: Board, move: Move): Board | null {
  const validated = validateIncomingMove(board, move);
  return validated ? applyMove(board, validated) : null;
}

export function normalizeRoomCode(code: string): string {
  const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.startsWith("DAMA")) {
    const suffix = cleaned.slice(4, 8);
    return `DAMA-${suffix}`;
  }
  return cleaned;
}
