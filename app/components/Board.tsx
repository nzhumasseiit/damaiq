"use client";

import confetti from "canvas-confetti";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { type AiDifficulty } from "@/lib/ai";
import AppHeader from "@/app/components/AppHeader";
import BackgroundPattern from "@/app/components/BackgroundPattern";
import CoachPanel from "@/app/components/CoachPanel";
import Mascot from "@/app/components/Mascot";
import PlayerSetupModal from "@/app/components/PlayerSetupModal";
import { useGame, type GameMode } from "@/app/hooks/useGame";
import { buildGameEndPayload } from "@/lib/leaderboard/gameResult";
import { getPlayerProfile } from "@/lib/leaderboard/local";
import { getCurrentProfileId, recordGameResult } from "@/lib/leaderboard/service";
import { type Language, getStoredLanguage, saveLanguage, t } from "@/lib/i18n";
import {
  type MultiplayerRole,
  type RoomRecord,
  broadcastRoomMessage,
  createRoom,
  isMultiplayerConfigured,
  joinRoom,
  persistRoomGameOver,
  persistRoomMove,
  subscribeToRoom,
} from "@/lib/multiplayer";
import {
  classNames,
  eyebrowClassName,
  getStoredTheme,
  pageClassName,
  panelClassName,
  secondaryTextClassName,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/ui";
import {
  type Board as GameBoard,
  type Move,
  type Piece,
  getLegalMoves,
  getWinner,
  applyMove,
  positionToNotation,
} from "@/lib/russianDraughtsEngine";

const BOARD_SIZE = 8;
const PLAYABLE_SQUARES = 32;
const ANIMATION_MS = 260;
type AnimationPhase = "from" | "to" | "idle";

function nowMs(): number {
  return globalThis.performance?.now() ?? new Date().getTime();
}

export default function Board() {
  const {
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
    applyRemoteMove,
    replaceBoard,
    resetGame,
  } = useGame();

  const winner = useMemo(() => getWinner(board), [board]);
  const legalMoves = useMemo(
    () => getLegalMoves(board, { casualMode: isCasualMode }),
    [board, isCasualMode],
  );
  const destinationMoves = useMemo(
    () => new Map(legalMovesForSelected.map((move) => [move.to, move])),
    [legalMovesForSelected],
  );
  const previousBoard = gameHistory.length > 1 ? gameHistory[gameHistory.length - 2] : null;
  const aiAnimationMove = lastMoveBy === "ai" ? lastMove : null;
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("idle");
  const [language, setLanguage] = useState<Language>("ru");
  const [theme, setTheme] = useState<Theme>("dark");
  const [hasStarted, setHasStarted] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [showPlayerSetup, setShowPlayerSetup] = useState(false);
  const [pendingOnlineAction, setPendingOnlineAction] = useState<"create" | "join" | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomRole, setRoomRole] = useState<MultiplayerRole | null>(null);
  const [roomStatus, setRoomStatus] = useState<RoomRecord["status"] | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [multiplayerMessage, setMultiplayerMessage] = useState<string | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const gameRecordedRef = useRef(false);
  const gameStartedAtRef = useRef<number | null>(null);
  const lastRoomActivityRef = useRef(0);

  const isDark = theme === "dark";
  const playerColor = roomRole === "guest" ? "black" : "white";
  const isOnlineGame = gameMode === "online" && roomCode !== null;
  const isOnlinePlayerTurn = !isOnlineGame || board.turn === playerColor;
  const showHumanMoveHints =
    !(gameMode === "ai" && board.turn === "black") &&
    isOnlinePlayerTurn &&
    roomStatus !== "waiting";
  const selectableSquares = useMemo(
    () => new Set(showHumanMoveHints ? legalMoves.map((move) => move.from) : []),
    [legalMoves, showHumanMoveHints],
  );
  const status = getStatusText({
    winner,
    gameMode,
    isAiThinking,
    aiDifficulty,
    turn: board.turn,
    legalMoveCount: legalMoves.length,
    language,
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setLanguage(getStoredLanguage());
      setTheme(getStoredTheme());
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!aiAnimationMove) return;

    let secondFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      setAnimationPhase("from");
      secondFrame = window.requestAnimationFrame(() => setAnimationPhase("to"));
    });
    const timeout = window.setTimeout(() => setAnimationPhase("idle"), ANIMATION_MS + 80);

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(timeout);
    };
  }, [aiAnimationMove]);

  useEffect(() => {
    if (winner !== "white" || gameMode !== "ai" || !hasStarted) return;

    confetti({
      particleCount: 120,
      spread: 72,
      origin: { y: 0.62 },
      colors: ["#F59E0B", "#F0D9B5", "#FAFAFA", "#3D2B1F"],
    });
  }, [gameMode, hasStarted, winner]);

  function updateLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    saveLanguage(nextLanguage);
  }

  function updateTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  function startGame() {
    resetGame();
    gameRecordedRef.current = false;
    gameStartedAtRef.current = nowMs();
    setHasStarted(true);
  }

  function tryStartGame() {
    if (!getPlayerProfile()) {
      setShowPlayerSetup(true);
      return;
    }
    startGame();
  }

  function newGame() {
    resetGame();
    setRoomCode(null);
    setRoomRole(null);
    setRoomStatus(null);
    setJoinCode("");
    setMultiplayerMessage(null);
    setOpponentDisconnected(false);
    setPendingOnlineAction(null);
    gameRecordedRef.current = false;
    gameStartedAtRef.current = null;
    setHasStarted(false);
  }

  async function ensureProfileForOnline(action?: "create" | "join"): Promise<string | null> {
    if (!getPlayerProfile()) {
      if (action) setPendingOnlineAction(action);
      setShowPlayerSetup(true);
      setMultiplayerMessage(t("createProfileFirst", language));
      return null;
    }

    if (!isMultiplayerConfigured()) {
      setMultiplayerMessage(t("supabaseRequired", language));
      return null;
    }

    try {
      const profileId = await getCurrentProfileId();

      if (!profileId) {
        console.error("[DamaIQ] No Supabase profile ID returned from getCurrentProfileId()");
        setMultiplayerMessage(t("supabaseRequired", language));
        return null;
      }

      return profileId;
    } catch (error) {
      console.error("[DamaIQ] Failed to get current Supabase profile:", error);
      setMultiplayerMessage(t("supabaseRequired", language));
      return null;
    }
  }

  async function startFriendRoom() {
    setMultiplayerMessage(null);
    const profileId = await ensureProfileForOnline("create");
    if (!profileId) return;

    try {
      const room = await createRoom(profileId);
      setGameMode("online");
      replaceBoard(room.board_state);
      setRoomCode(room.code);
      setRoomRole("host");
      setRoomStatus(room.status);
      setHasStarted(false);
      lastRoomActivityRef.current = nowMs();
    } catch (error) {
      console.error("[DamaIQ] Room create failed:", error);
      setMultiplayerMessage(t("roomCreateFailed", language));
    }
  }

  async function joinFriendRoom() {
    setMultiplayerMessage(null);
    const profileId = await ensureProfileForOnline("join");
    if (!profileId) return;

    try {
      const room = await joinRoom(joinCode, profileId);
      setGameMode("online");
      replaceBoard(room.board_state);
      setRoomCode(room.code);
      setRoomRole("guest");
      setRoomStatus(room.status);
      setHasStarted(true);
      gameRecordedRef.current = false;
      gameStartedAtRef.current = nowMs();
      lastRoomActivityRef.current = nowMs();
    } catch (error) {
      console.error("[DamaIQ] Room join failed:", error);
      setMultiplayerMessage(t("roomJoinFailed", language));
    }
  }

  async function copyRoomInvite() {
    if (!roomCode) return;
    await navigator.clipboard.writeText(
      `Сыграй со мной в DamaIQ! Код: ${roomCode} → damaiq.vercel.app`,
    );
    setMultiplayerMessage(t("shareCopied", language));
  }

  function handleSquareClick(index: number) {
    if (isOnlineGame && !isOnlinePlayerTurn) return;

    const move = selectSquare(index);
    if (!move || !roomCode || gameMode !== "online") return;

    lastRoomActivityRef.current = nowMs();
    setOpponentDisconnected(false);
    const nextBoard = applyMove(board, move);
    void persistRoomMove(roomCode, nextBoard);
    void broadcastRoomMessage(roomCode, { type: "move", move });

    const nextWinner = getWinner(nextBoard);
    if (nextWinner) {
      void persistRoomGameOver(roomCode, nextWinner);
      void broadcastRoomMessage(roomCode, { type: "game_over", winner: nextWinner });
    }
  }

  useEffect(() => {
    if (!roomCode) return;

    return subscribeToRoom(
      roomCode,
      (message) => {
        lastRoomActivityRef.current = nowMs();
        setOpponentDisconnected(false);

        if (message.type === "move") {
          const accepted = applyRemoteMove(message.move);
          if (!accepted) {
            setMultiplayerMessage(t("invalidRemoteMove", language));
          }
        }

        if (message.type === "game_over") {
          setRoomStatus("finished");
        }
      },
      (room) => {
        lastRoomActivityRef.current = nowMs();
        setOpponentDisconnected(false);
        setRoomStatus(room.status);

        if (room.status === "playing" && !hasStarted) {
          replaceBoard(room.board_state);
          setHasStarted(true);
          gameRecordedRef.current = false;
          gameStartedAtRef.current = nowMs();
        }
      },
    );
  }, [applyRemoteMove, hasStarted, language, replaceBoard, roomCode]);

  useEffect(() => {
    if (!isOnlineGame || roomStatus !== "playing") return;

    const interval = window.setInterval(() => {
      if (nowMs() - lastRoomActivityRef.current > 60_000) {
        setOpponentDisconnected(true);
      }
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [isOnlineGame, roomStatus]);

  useEffect(() => {
    if (!hasStarted || !hasHydrated) return;

    const gameOver = winner !== null || legalMoves.length === 0;
    if (!gameOver || gameRecordedRef.current) return;

    gameRecordedRef.current = true;
    const durationSeconds = gameStartedAtRef.current
      ? Math.max(1, Math.round((nowMs() - gameStartedAtRef.current) / 1000))
      : 0;

    void recordGameResult(
      buildGameEndPayload({
        aiDifficulty,
        durationSeconds,
        gameMode,
        legalMoveCount: legalMoves.length,
        moves: moveHistory,
        playerColor,
        winner,
      }),
    );
  }, [
    aiDifficulty,
    gameMode,
    hasHydrated,
    hasStarted,
    legalMoves.length,
    moveHistory,
    playerColor,
    winner,
  ]);

  if (!hasStarted) {
    if (roomCode && roomStatus === "waiting") {
      return (
        <main className={pageClassName(isDark, "min-h-screen overflow-hidden")}>
          <BackgroundPattern isDark={isDark} />
          <AppHeader
            isDark={isDark}
            language={language}
            setLanguage={updateLanguage}
            setTheme={updateTheme}
            theme={theme}
          />
          <WaitingRoomScreen
            code={roomCode}
            isDark={isDark}
            language={language}
            message={multiplayerMessage}
            onCopy={copyRoomInvite}
            onCancel={newGame}
          />
        </main>
      );
    }

    return (
      <main className={pageClassName(isDark, "min-h-screen overflow-hidden")}>
        <BackgroundPattern isDark={isDark} />
        <AppHeader
          isDark={isDark}
          language={language}
          setLanguage={updateLanguage}
          setTheme={updateTheme}
          theme={theme}
        />
        <LandingScreen
          aiDifficulty={aiDifficulty}
          gameMode={gameMode}
          isDark={isDark}
          language={language}
          setAiDifficulty={setAiDifficulty}
          setGameMode={setGameMode}
          joinCode={joinCode}
          multiplayerMessage={multiplayerMessage}
          setJoinCode={setJoinCode}
          startFriendRoom={startFriendRoom}
          joinFriendRoom={joinFriendRoom}
          startGame={tryStartGame}
        />
        {showPlayerSetup ? (
          <PlayerSetupModal
            isDark={isDark}
            language={language}
            onComplete={() => {
              setShowPlayerSetup(false);

              if (pendingOnlineAction === "create") {
                setPendingOnlineAction(null);
                void startFriendRoom();
                return;
              }

              if (pendingOnlineAction === "join") {
                setPendingOnlineAction(null);
                void joinFriendRoom();
                return;
              }

              startGame();
            }}
          />
        ) : null}
      </main>
    );
  }

  return (
    <main className={pageClassName(isDark, "min-h-screen")}>
      <BackgroundPattern isDark={isDark} />
      <AppHeader
        isDark={isDark}
        language={language}
        setLanguage={updateLanguage}
        setTheme={updateTheme}
        theme={theme}
      />

      <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-6 px-4 pb-8 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <div className="flex min-w-0 flex-col gap-4">
          <StatusBar status={status} />
          {isOnlineGame ? (
            <div className={classNames(
              "mx-auto flex w-full max-w-[min(86vh,720px)] items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold",
              isDark ? "border-[#2A2A2A] bg-[#141414] text-[#F5F5F5]" : "border-stone-200 bg-white text-stone-800",
            )}>
              <span>{t("opponent", language)}: {roomRole === "host" ? t("guestPlayer", language) : t("hostPlayer", language)}</span>
              {!isOnlinePlayerTurn && !winner ? (
                <span className="animate-pulse text-[#F59E0B]">{t("opponentTurn", language)}</span>
              ) : null}
            </div>
          ) : null}
          {opponentDisconnected ? (
            <div className="mx-auto w-full max-w-[min(86vh,720px)] rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
              {t("opponentDisconnected", language)}
            </div>
          ) : null}
          {showHumanMoveHints && legalMovesForSelected.length === 0 && !winner ? (
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-amber-200/80">
              {t("selectPiece", language)}
            </p>
          ) : null}

          <div className="relative mx-auto w-full max-w-[min(86vh,720px)] overflow-hidden rounded-xl shadow-2xl">
            {!hasHydrated ? (
              <SkeletonBoard />
            ) : (
              <div
                className={classNames(
                  "grid aspect-square w-full grid-cols-8 overflow-hidden rounded-xl border-4 border-[#2A1A12] bg-[#3D2B1F] transition duration-300 ease-in-out",
                  isAiThinking && "opacity-70",
                )}
              >
                {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, square) => {
                  const row = Math.floor(square / BOARD_SIZE);
                  const column = square % BOARD_SIZE;
                  const playable = isPlayableCell(row, column);
                  const index = playable ? playableIndex(row, column) : null;
                  const piece = index === null ? null : board.cells[index];
                  const move = index === null ? undefined : destinationMoves.get(index);
                  const selected = index !== null && selectedSquare === index;
                  const selectable = index !== null && selectableSquares.has(index);
                  const hideAnimatingDestination =
                    animationPhase !== "idle" && aiAnimationMove?.to === index;
                  const latestDestination = lastMove?.to === index;

                  if (!playable || index === null) {
                    return (
                      <div
                        key={square}
                        className="aspect-square min-h-11 bg-[#F0D9B5]"
                        aria-hidden="true"
                      />
                    );
                  }

                  return (
                    <button
                      key={square}
                      type="button"
                      onClick={() => handleSquareClick(index)}
                      aria-label={ariaLabel(index, piece, move, language)}
                      className={squareClassName({ latestDestination, selected, selectable, move })}
                    >
                      {piece && !hideAnimatingDestination ? (
                        <PieceView piece={piece} selected={selected} selectable={selectable} />
                      ) : null}
                      {!piece && move ? <MoveDot move={move} /> : null}
                    </button>
                  );
                })}
              </div>
            )}

            <AiMoveAnimation
              move={aiAnimationMove}
              phase={animationPhase}
              board={board}
              previousBoard={previousBoard}
            />

            {isAiThinking ? (
              <AiThinkingIndicator difficulty={aiDifficulty} language={language} />
            ) : null}

            {winner === "black" && gameMode === "ai" ? (
              <GameOverOverlay language={language} message={t("aiWins", language)} />
            ) : null}
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <InfoPanel
            aiDifficulty={aiDifficulty}
            gameMode={gameMode}
            isCasualMode={isCasualMode}
            isDark={isDark}
            language={language}
            moveCount={gameHistory.length - 1}
            newGame={newGame}
            setIsCasualMode={setIsCasualMode}
            status={status.text}
          />
          <MoveHistory isDark={isDark} language={language} moves={moveHistory} />
          {winner ? <ViewLeaderboardLink isDark={isDark} language={language} /> : null}
          {gameMode === "ai" && winner ? (
            <>
              {winner === "white" ? (
                <ShareResultButton
                  aiDifficulty={aiDifficulty}
                  isDark={isDark}
                  language={language}
                  moveCount={moveHistory.length}
                />
              ) : null}
              <CoachPanel
                difficulty={aiDifficulty}
                isDark={isDark}
                language={language}
                moves={moveHistory}
                playerColor="white"
                winner={winner}
              />
            </>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function ViewLeaderboardLink({ isDark, language }: { isDark: boolean; language: Language }) {
  return (
    <Link
      href="/leaderboard"
      className={classNames(
        "flex min-h-11 w-full items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition duration-200 ease-in-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]",
        isDark
          ? "border-[#2A2A2A] bg-[#141414] text-amber-300 hover:border-[#F59E0B]/40"
          : "border-stone-200 bg-white text-amber-700 hover:border-amber-300",
      )}
    >
      {t("viewLeaderboard", language)} →
    </Link>
  );
}

function LandingScreen({
  aiDifficulty,
  gameMode,
  isDark,
  joinCode,
  joinFriendRoom,
  language,
  multiplayerMessage,
  setAiDifficulty,
  setGameMode,
  setJoinCode,
  startFriendRoom,
  startGame,
}: {
  aiDifficulty: AiDifficulty;
  gameMode: GameMode;
  isDark: boolean;
  joinCode: string;
  joinFriendRoom: () => void;
  language: Language;
  multiplayerMessage: string | null;
  setAiDifficulty: (difficulty: AiDifficulty) => void;
  setGameMode: (mode: GameMode) => void;
  setJoinCode: (code: string) => void;
  startFriendRoom: () => void;
  startGame: () => void;
}) {
  return (
    <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-4 pb-12 pt-2 text-center sm:pt-4">
      <Mascot size="lg" className="mb-3" />
      <h1
        className={classNames(
          "text-[clamp(2.25rem,7vw,3.75rem)] font-extrabold leading-none tracking-tight",
          isDark ? "text-[#F5F5F5]" : "text-stone-950",
        )}
      >
        {t("appName", language)}
      </h1>
      <p className="mt-2 text-base font-medium text-amber-400 sm:text-lg">{t("tagline", language)}</p>

      <div
        className={classNames(
          "mt-6 w-full rounded-2xl border p-5 text-left sm:p-6",
          isDark ? "border-[#2A2A2A] bg-[#141414]/90" : "border-stone-200 bg-white/90",
        )}
      >
        <p className={eyebrowClassName(isDark)}>{t("gameSetup", language)}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ModeCard
            active={gameMode === "pvp"}
            description={t("localPlayDesc", language)}
            icon="♟"
            isDark={isDark}
            onClick={() => setGameMode("pvp")}
            title={t("vsPlayer", language)}
          />
          <ModeCard
            active={gameMode === "ai"}
            description={t("playAiDesc", language)}
            icon="◆"
            isDark={isDark}
            onClick={() => setGameMode("ai")}
            title={t("vsAI", language)}
          />
        </div>

        {gameMode === "ai" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <DifficultyPill
              active={aiDifficulty === "easy"}
              description={t("easyDesc", language)}
              isDark={isDark}
              label={t("easy", language)}
              onClick={() => setAiDifficulty("easy")}
            />
            <DifficultyPill
              active={aiDifficulty === "medium"}
              description={t("mediumDesc", language)}
              isDark={isDark}
              label={t("medium", language)}
              onClick={() => setAiDifficulty("medium")}
            />
            <DifficultyPill
              active={aiDifficulty === "hard"}
              description={t("hardDesc", language)}
              isDark={isDark}
              label={t("hard", language)}
              onClick={() => setAiDifficulty("hard")}
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={startGame}
          className="mt-5 flex h-14 w-full min-w-[240px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] px-8 text-sm font-bold uppercase tracking-widest text-stone-950 shadow-lg shadow-amber-950/35 transition duration-200 ease-in-out hover:-translate-y-0.5 hover:brightness-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-200 sm:mx-auto sm:w-auto"
        >
          <span aria-hidden="true">♟</span>
          {t("startGame", language)}
        </button>

        <div className="mt-4 grid gap-3 rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            onClick={startFriendRoom}
            className={classNames(
              "min-h-12 rounded-2xl border px-5 text-sm font-bold uppercase tracking-wide transition duration-200 ease-in-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]",
              isDark
                ? "border-[#F59E0B]/50 text-[#F59E0B] hover:bg-[#F59E0B]/10"
                : "border-[#D97706] bg-[#F59E0B] text-stone-950 shadow-sm hover:brightness-105",
            )}
          >
            {t("playWithFriend", language)}
          </button>
          <div className="flex min-w-0 gap-2">
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="DAMA-4829"
              className={classNames(
                "min-h-12 min-w-0 flex-1 rounded-2xl border px-4 text-sm font-bold uppercase tracking-widest outline-none transition focus:ring-2 focus:ring-[#F59E0B]",
                isDark
                  ? "border-[#2A2A2A] bg-[#0F0F0F] text-[#F5F5F5] placeholder:text-[#555]"
                  : "border-stone-200 bg-white text-stone-950 placeholder:text-stone-400",
              )}
            />
            <button
              type="button"
              onClick={joinFriendRoom}
              className="min-h-12 rounded-2xl bg-[#F59E0B] px-4 text-xs font-black uppercase tracking-wide text-stone-950 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              {t("joinRoom", language)}
            </button>
          </div>
        </div>

        {multiplayerMessage ? (
          <p className="mt-3 text-center text-xs font-semibold text-amber-300">
            {multiplayerMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function WaitingRoomScreen({
  code,
  isDark,
  language,
  message,
  onCancel,
  onCopy,
}: {
  code: string;
  isDark: boolean;
  language: Language;
  message: string | null;
  onCancel: () => void;
  onCopy: () => void;
}) {
  return (
    <section className="relative z-10 mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className={classNames(panelClassName(isDark), "w-full")}>
        <p className={eyebrowClassName(isDark)}>{t("waitingForFriend", language)}</p>
        <div className="mt-5 rounded-3xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-6 py-8">
          <p className="text-[clamp(2.25rem,10vw,4.5rem)] font-black tracking-widest text-[#F59E0B]">
            {code}
          </p>
          <div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-2 border-[#F59E0B]/20 border-t-[#F59E0B]" />
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCopy}
            className="min-h-12 flex-1 rounded-2xl bg-[#F59E0B] px-5 text-sm font-black uppercase tracking-wide text-stone-950 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-amber-200"
          >
            {t("copyInvite", language)}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={classNames(
              "min-h-12 flex-1 rounded-2xl border px-5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#F59E0B]",
              isDark ? "border-[#2A2A2A] text-[#888]" : "border-stone-200 text-stone-600",
            )}
          >
            {t("backToGame", language)}
          </button>
        </div>
        {message ? <p className="mt-4 text-sm font-semibold text-amber-300">{message}</p> : null}
      </div>
    </section>
  );
}

function ModeCard({
  active,
  description,
  icon,
  isDark,
  onClick,
  title,
}: {
  active: boolean;
  description: string;
  icon: string;
  isDark: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={selectionCardClassName({ active, isDark, spacious: true })}
    >
      <span className="mb-4 block text-[32px] leading-none text-[#F59E0B]">{icon}</span>
      <span className={classNames("block text-lg font-bold tracking-tight", isDark ? "text-[#F5F5F5]" : "text-stone-950")}>
        {title}
      </span>
      <span className={classNames("mt-2 block text-sm leading-6", isDark ? "text-[#888]" : "text-stone-500")}>
        {description}
      </span>
    </button>
  );
}

function DifficultyPill({
  active,
  description,
  isDark,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  isDark: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={selectionCardClassName({ active, isDark })}
    >
      <span className="block text-xs font-bold uppercase tracking-wide">{label}</span>
      <span className={classNames("mt-2 block text-xs leading-5", isDark ? "text-[#888]" : "text-stone-500")}>
        {description}
      </span>
    </button>
  );
}

function InfoPanel({
  aiDifficulty,
  gameMode,
  isCasualMode,
  isDark,
  language,
  moveCount,
  newGame,
  setIsCasualMode,
  status,
}: {
  aiDifficulty: AiDifficulty;
  gameMode: GameMode;
  isCasualMode: boolean;
  isDark: boolean;
  language: Language;
  moveCount: number;
  newGame: () => void;
  setIsCasualMode: (enabled: boolean) => void;
  status: string;
}) {
  return (
    <div className={panelClassName(isDark)}>
      <p className={eyebrowClassName(isDark)}>{t("playerInfo", language)}</p>
      <div className="mt-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className={secondaryTextClassName(isDark)}>{status}</span>
          <span className="rounded-full bg-[#F59E0B]/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#F59E0B]">
            {gameMode === "ai" ? t(aiDifficulty, language) : t("vsPlayer", language)}
          </span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={eyebrowClassName(isDark)}>{t("moveCount", language)}</p>
            <p className={classNames("text-[clamp(2rem,6vw,3rem)] font-bold leading-none tracking-tight", isDark ? "text-[#F5F5F5]" : "text-stone-950")}>
              {moveCount}
            </p>
          </div>
          <button
            type="button"
            onClick={newGame}
            className={classNames(
              "min-h-11 rounded-full px-5 text-sm font-bold transition duration-200 ease-in-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]",
              isDark ? "bg-[#F5F5F5] text-[#0F0F0F]" : "bg-stone-950 text-white",
            )}
          >
            {t("newGame", language)}
          </button>
        </div>
        <div
          className={classNames(
            "flex items-center justify-between gap-4 rounded-2xl border px-4 py-3",
            isDark ? "border-[#2A2A2A] bg-white/[0.03]" : "border-stone-200 bg-stone-50",
          )}
        >
          <div>
            <p className={eyebrowClassName(isDark)}>{t("settings", language)}</p>
            <p className={classNames("mt-1 text-sm font-bold", isDark ? "text-[#F5F5F5]" : "text-stone-950")}>
              {t("casualMode", language)}
            </p>
            <p className={classNames("mt-1 text-xs leading-5", isDark ? "text-[#888]" : "text-stone-500")}>
              {t("casualModeDesc", language)}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isCasualMode}
            aria-label={t("casualMode", language)}
            onClick={() => setIsCasualMode(!isCasualMode)}
            className={classNames(
              "relative h-7 w-12 shrink-0 rounded-full transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#F59E0B]",
              isCasualMode ? "bg-[#F59E0B]" : isDark ? "bg-[#2A2A2A]" : "bg-stone-300",
            )}
          >
            <span
              className={classNames(
                "absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition duration-200 ease-in-out",
                isCasualMode && "translate-x-5",
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

function MoveHistory({
  isDark,
  language,
  moves,
}: {
  isDark: boolean;
  language: Language;
  moves: Move[];
}) {
  const pairs = Array.from({ length: Math.ceil(moves.length / 2) }, (_, index) => ({
    black: moves[index * 2 + 1],
    moveNumber: index + 1,
    white: moves[index * 2],
  }));

  return (
    <div className={panelClassName(isDark)}>
      <p className={eyebrowClassName(isDark)}>{t("moveHistory", language)}</p>
      <div className="mt-3 max-h-72 overflow-y-auto pr-1 font-mono text-sm">
        {pairs.length === 0 ? (
          <p className={secondaryTextClassName(isDark)}>{t("noMoves", language)}</p>
        ) : (
          <ol className="space-y-1">
            {pairs.map((pair, pairIndex) => (
              <li
                key={pair.moveNumber}
                className={classNames(
                  "grid grid-cols-[2.5rem_1fr_1fr] gap-2 rounded-lg px-2 py-2",
                  pairIndex % 2 === 0
                    ? isDark
                      ? "bg-white/[0.03]"
                      : "bg-stone-50"
                    : "bg-transparent",
                )}
              >
                <span className={secondaryTextClassName(isDark)}>{pair.moveNumber}.</span>
                <HistoryMove move={pair.white} latest={moves.length - 1 === pairIndex * 2} />
                <HistoryMove move={pair.black} latest={moves.length - 1 === pairIndex * 2 + 1} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function HistoryMove({ latest, move }: { latest: boolean; move?: Move }) {
  if (!move) return <span />;

  return (
    <span
      className={classNames(
        "rounded px-2 py-1 transition duration-200 ease-in-out",
        move.isCapture ? "text-[#EF4444]" : "text-[#F59E0B]",
        latest && "bg-[#F59E0B]/20 ring-1 ring-[#F59E0B]/40",
      )}
    >
      {move.notation}
    </span>
  );
}

function StatusBar({ status }: { status: { text: string; tone: string } }) {
  return (
    <div
      className={classNames(
        "rounded-xl px-4 py-3 text-center text-xs font-bold uppercase tracking-wide shadow-lg transition duration-300 ease-in-out",
        status.tone,
      )}
    >
      {status.text}
    </div>
  );
}

function SkeletonBoard() {
  return (
    <div className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-xl border-4 border-[#2A1A12] bg-[#2A2A2A]">
      {Array.from({ length: 64 }, (_, square) => (
        <div
          key={square}
          className={classNames(
            "aspect-square animate-[boardSkeleton_1.2s_ease-in-out_infinite]",
            isPlayableCell(Math.floor(square / BOARD_SIZE), square % BOARD_SIZE)
              ? "bg-[#333]"
              : "bg-[#555]",
          )}
        />
      ))}
    </div>
  );
}

function AiThinkingIndicator({
  difficulty,
  language,
}: {
  difficulty: AiDifficulty;
  language: Language;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-4 top-4 flex items-center justify-center">
      <div className="flex items-center gap-3 rounded-full bg-stone-950/85 px-4 py-2 text-xs font-bold uppercase tracking-wide text-amber-300 shadow-lg backdrop-blur">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" />
        {t(difficulty, language)} {t("aiThinking", language)}
        <span className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300 [animation-delay:120ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300 [animation-delay:240ms]" />
        </span>
      </div>
    </div>
  );
}

function GameOverOverlay({ language, message }: { language: Language; message: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/65 p-6 backdrop-blur-[2px]">
      <div className="rounded-2xl border border-red-400/30 bg-[#111]/90 p-6 text-center shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-wide text-red-300">{t("aiWins", language)}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-white">{message}</p>
      </div>
    </div>
  );
}

function AiMoveAnimation({
  move,
  phase,
  board,
  previousBoard,
}: {
  move: Move | null;
  phase: AnimationPhase;
  board: GameBoard;
  previousBoard: GameBoard | null;
}) {
  if (!move || phase === "idle" || !previousBoard) return null;

  const animatedPiece = board.cells[move.to] ?? previousBoard.cells[move.from];
  if (!animatedPiece) return null;

  const from = squarePosition(move.from);
  const to = squarePosition(move.to);
  const deltaX = to.column - from.column;
  const deltaY = to.row - from.row;

  return (
    <>
      <div
        className="pointer-events-none absolute flex items-center justify-center transition-transform duration-[250ms] ease-in-out"
        style={{
          height: "12.5%",
          left: `${from.column * 12.5}%`,
          top: `${from.row * 12.5}%`,
          transform:
            phase === "to" ? `translate(${deltaX * 100}%, ${deltaY * 100}%)` : "translate(0, 0)",
          width: "12.5%",
        }}
      >
        <PieceView piece={animatedPiece} selected={false} selectable={false} />
      </div>

      {move.captures.map((capture) => {
        const capturedPiece = previousBoard.cells[capture];
        if (!capturedPiece) return null;

        const position = squarePosition(capture);
        return (
          <div
            key={capture}
            className="pointer-events-none absolute flex items-center justify-center transition duration-200 ease-in-out"
            style={{
              height: "12.5%",
              left: `${position.column * 12.5}%`,
              opacity: phase === "to" ? 0 : 1,
              top: `${position.row * 12.5}%`,
              transform: phase === "to" ? "scale(0.5)" : "scale(1)",
              width: "12.5%",
            }}
          >
            <PieceView piece={capturedPiece} selected={false} selectable={false} />
          </div>
        );
      })}
    </>
  );
}

function PieceView({
  piece,
  selected,
  selectable,
}: {
  piece: Piece;
  selected: boolean;
  selectable: boolean;
}) {
  const white = piece.startsWith("white");
  const king = piece.endsWith("King");

  return (
    <span
      className={classNames(
        "flex h-[76%] w-[76%] items-center justify-center rounded-full border shadow-lg transition duration-200 ease-in-out",
        white
          ? "border-white bg-[radial-gradient(circle_at_30%_25%,#FFFFFF_0%,#FAFAFA_45%,#D7D7D7_100%)] text-stone-800 drop-shadow-md"
          : "border-[#31314D] bg-[radial-gradient(circle_at_30%_25%,#343456_0%,#1A1A2E_55%,#0E0E1C_100%)] text-amber-100 drop-shadow-md",
        selectable && "group-hover:scale-[1.05]",
        selected && "scale-[1.12] ring-4 ring-[#F59E0B] shadow-[0_0_28px_rgba(245,158,11,0.72)]",
      )}
    >
      <span
        className={classNames(
          "flex h-[68%] w-[68%] items-center justify-center rounded-full border",
          white ? "border-stone-200/80" : "border-white/10",
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
        "animate-[moveDotPulse_1.2s_ease-in-out_infinite] rounded-full transition duration-200 ease-in-out",
        move.isCapture ? "h-4 w-4 bg-[#EF4444]/50" : "h-3 w-3 bg-[#F59E0B]/40",
      )}
    />
  );
}

function squareClassName({
  latestDestination,
  selected,
  selectable,
  move,
}: {
  latestDestination: boolean;
  selected: boolean;
  selectable: boolean;
  move?: Move;
}) {
  return classNames(
    "group relative flex aspect-square min-h-11 items-center justify-center bg-[#3D2B1F] transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#F59E0B]",
    selectable && "cursor-pointer hover:bg-[#4A3426]",
    selected && "ring-4 ring-inset ring-[#F59E0B]",
    move && "bg-[#4D3627]",
    latestDestination && "animate-[destinationFlash_300ms_ease-in-out]",
  );
}

function getStatusText({
  winner,
  gameMode,
  isAiThinking,
  aiDifficulty,
  turn,
  legalMoveCount,
  language,
}: {
  winner: "white" | "black" | null;
  gameMode: GameMode;
  isAiThinking: boolean;
  aiDifficulty: AiDifficulty;
  turn: "white" | "black";
  legalMoveCount: number;
  language: Language;
}) {
  if (!winner && legalMoveCount === 0) {
    return { text: t("draw", language), tone: "bg-stone-200 text-stone-700" };
  }
  if (winner === "white") {
    return gameMode === "ai"
      ? { text: t("youWin", language), tone: "bg-emerald-600 text-white" }
      : { text: t("whiteWins", language), tone: "bg-emerald-600 text-white" };
  }
  if (winner === "black") {
    return gameMode === "ai"
      ? { text: t("aiWins", language), tone: "bg-red-900/80 text-red-50" }
      : { text: t("blackWins", language), tone: "bg-red-900/80 text-red-50" };
  }
  if (isAiThinking) {
    return {
      text: `${t(aiDifficulty, language)} ${t("aiThinking", language)}`,
      tone: "animate-pulse bg-amber-500 text-stone-950",
    };
  }
  if (gameMode === "ai") {
    return turn === "white"
      ? { text: t("yourTurn", language), tone: "bg-stone-950 text-white" }
      : { text: t("aiThinking", language), tone: "animate-pulse bg-amber-500 text-stone-950" };
  }
  return {
    text: turn === "white" ? t("whiteTurn", language) : t("blackTurn", language),
    tone: "bg-stone-950 text-white",
  };
}

function ariaLabel(index: number, piece: Piece | null, move: Move | undefined, language: Language) {
  const square = positionToNotation(index);
  if (move) return `${square}, ${t("legalMove", language)} ${move.notation}`;
  if (!piece) return `${square}, ${t("emptySquare", language)}`;
  return `${square}, ${pieceLabel(piece, language)}`;
}

function pieceLabel(piece: Piece, language: Language) {
  const colorKey = piece.startsWith("white") ? "whitePiece" : "blackPiece";
  const kingLabel = piece.endsWith("King") ? ` ${t("king", language)}` : "";
  return `${t(colorKey, language)}${kingLabel}`;
}

function squarePosition(index: number) {
  const row = Math.floor(index / 4);
  const column = 2 * (index % 4) + (row % 2 === 0 ? 1 : 0);
  return { row, column };
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

function ShareResultButton({
  aiDifficulty,
  isDark,
  language,
  moveCount,
}: {
  aiDifficulty: AiDifficulty;
  isDark: boolean;
  language: Language;
  moveCount: number;
}) {
  const [copied, setCopied] = useState(false);

  async function shareResult() {
    const url = window.location.origin;
    const difficultyLabel = t(aiDifficulty, language);
    const text = `Я победил ЖИ на уровне ${difficultyLabel} за ${moveCount} ходов в DamaIQ! ${url}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch (error) {
      console.error("[DamaIQ] Share result failed:", error);
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={shareResult}
      className={classNames(
        "min-h-11 w-full rounded-2xl border px-4 py-2 text-sm font-semibold transition duration-200 ease-in-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]",
        isDark
          ? "border-[#2A2A2A] bg-[#141414] text-[#F5F5F5] hover:border-[#F59E0B]/40"
          : "border-stone-200 bg-white text-stone-950 hover:border-amber-300",
      )}
    >
      {copied ? t("shareCopied", language) : t("shareResult", language)}
    </button>
  );
}

function selectionCardClassName({
  active,
  isDark,
  spacious = false,
}: {
  active: boolean;
  isDark: boolean;
  spacious?: boolean;
}) {
  return classNames(
    "rounded-2xl border p-4 text-left transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#F59E0B] sm:p-5",
    spacious && "min-h-32 sm:min-h-36",
    active
      ? classNames(
          "border-[#F59E0B40] bg-[#1C1500] shadow-[inset_0_0_20px_rgba(245,158,11,0.08)]",
          !isDark && "text-white [&_*]:!text-white",
        )
      : isDark
        ? "border-[#2A2A2A] bg-[#141414] hover:border-[#F59E0B]/40"
        : "border-stone-200 bg-white hover:border-amber-300/60",
  );
}
