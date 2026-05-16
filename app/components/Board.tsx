"use client";

import confetti from "canvas-confetti";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { type AiDifficulty } from "@/lib/ai";
import CoachPanel from "@/app/components/CoachPanel";
import { useGame, type GameMode } from "@/app/hooks/useGame";
import { type Language, getStoredLanguage, saveLanguage, t } from "@/lib/i18n";
import {
  type Board as GameBoard,
  type Move,
  type Piece,
  getLegalMoves,
  getWinner,
  positionToNotation,
} from "@/lib/russianDraughtsEngine";

const BOARD_SIZE = 8;
const PLAYABLE_SQUARES = 32;
const ANIMATION_MS = 260;
const THEME_STORAGE_KEY = "damaiq-theme";

type AnimationPhase = "from" | "to" | "idle";
type Theme = "dark" | "light";

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
    resetGame,
  } = useGame();

  const winner = useMemo(() => getWinner(board), [board]);
  const legalMoves = useMemo(
    () => getLegalMoves(board, { casualMode: isCasualMode }),
    [board, isCasualMode],
  );
  const showHumanMoveHints = !(gameMode === "ai" && board.turn === "black");
  const selectableSquares = useMemo(
    () => new Set(showHumanMoveHints ? legalMoves.map((move) => move.from) : []),
    [legalMoves, showHumanMoveHints],
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

  const isDark = theme === "dark";
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
    setHasStarted(true);
  }

  function newGame() {
    resetGame();
    setHasStarted(false);
  }

  if (!hasStarted) {
    return (
      <main className={pageClassName(isDark, "min-h-screen overflow-hidden")}>
        <BackgroundPattern />
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
          startGame={startGame}
        />
      </main>
    );
  }

  return (
    <main className={pageClassName(isDark, "min-h-screen")}>
      <BackgroundPattern />
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
                      onClick={() => selectSquare(index)}
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
          {gameMode === "ai" && winner ? (
            <CoachPanel
              difficulty={aiDifficulty}
              isDark={isDark}
              language={language}
              moves={moveHistory}
              playerColor="white"
              winner={winner}
            />
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function AppHeader({
  isDark,
  language,
  setLanguage,
  setTheme,
  theme,
}: {
  isDark: boolean;
  language: Language;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  theme: Theme;
}) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Image
          src="/mascot.svg"
          alt=""
          width={24}
          height={24}
          className="h-6 w-6 rounded-full bg-amber-400/15 object-contain"
          priority
        />
        <span className={classNames("text-lg font-bold tracking-tight", isDark ? "text-[#F5F5F5]" : "text-stone-950")}>
          {t("appName", language)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <LanguageToggle isDark={isDark} language={language} setLanguage={setLanguage} />
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? t("lightTheme", language) : t("darkTheme", language)}
          className={classNames(
            "flex h-10 w-10 items-center justify-center rounded-full border text-base transition duration-200 ease-in-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]",
            isDark
              ? "border-[#2A2A2A] bg-[#1A1A1A] text-[#F5F5F5]"
              : "border-stone-200 bg-white text-stone-950 shadow-sm",
          )}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>
    </header>
  );
}

function LandingScreen({
  aiDifficulty,
  gameMode,
  isDark,
  language,
  setAiDifficulty,
  setGameMode,
  startGame,
}: {
  aiDifficulty: AiDifficulty;
  gameMode: GameMode;
  isDark: boolean;
  language: Language;
  setAiDifficulty: (difficulty: AiDifficulty) => void;
  setGameMode: (mode: GameMode) => void;
  startGame: () => void;
}) {
  return (
    <section className="relative z-10 flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-5xl flex-col items-center text-center">
        <Image
          src="/mascot.svg"
          alt=""
          width={112}
          height={112}
          className="mb-6 h-24 w-24 rounded-[2rem] bg-amber-400/10 p-3 shadow-2xl shadow-amber-950/40 sm:h-28 sm:w-28"
          priority
        />
        <h1 className={classNames("text-[clamp(3.5rem,12vw,8rem)] font-bold leading-none tracking-tight", isDark ? "text-[#F5F5F5]" : "text-stone-950")}>
          {t("appName", language)}
        </h1>
        <p className="mt-4 text-[clamp(1rem,2vw,1.35rem)] font-medium text-amber-300">
          {t("tagline", language)}
        </p>

        <div className="mt-10 grid w-full gap-4 md:grid-cols-2">
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
          <div className="mt-5 grid w-full gap-3 sm:grid-cols-3">
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
          className="mt-8 min-h-12 rounded-full bg-[#F59E0B] px-8 text-sm font-bold uppercase tracking-wide text-stone-950 shadow-xl shadow-amber-950/30 transition duration-200 ease-in-out hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-amber-200"
        >
          {t("startGame", language)}
        </button>
      </div>
    </section>
  );
}

function LanguageToggle({
  isDark,
  language,
  setLanguage,
}: {
  isDark: boolean;
  language: Language;
  setLanguage: (language: Language) => void;
}) {
  return (
    <div className={classNames("flex min-h-10 rounded-full border p-1 shadow-lg backdrop-blur", isDark ? "border-[#2A2A2A] bg-[#1A1A1A]" : "border-stone-200 bg-white")}>
      {(["ru", "kk"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
          className={classNames(
            "min-h-8 rounded-full px-3 text-xs font-bold uppercase tracking-wide transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#F59E0B]",
            language === option
              ? "bg-[#F59E0B] text-stone-950"
              : isDark
                ? "text-[#888] hover:bg-white/10 hover:text-[#F5F5F5]"
                : "text-stone-500 hover:bg-stone-100 hover:text-stone-950",
          )}
        >
          {t(option === "ru" ? "ruLanguage" : "kkLanguage", language)}
        </button>
      ))}
    </div>
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
      className={classNames(
        "min-h-36 rounded-2xl border p-6 text-left transition duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#F59E0B]",
        active
          ? "border-[#F59E0B] bg-[#F59E0B]/12 shadow-xl shadow-amber-950/20"
          : isDark
            ? "border-[#2A2A2A] bg-[#1A1A1A] hover:border-amber-500/50"
            : "border-stone-200 bg-white hover:border-amber-300",
      )}
    >
      <span className="mb-5 block text-3xl text-[#F59E0B]">{icon}</span>
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
      className={classNames(
        "min-h-20 rounded-2xl border px-5 py-4 text-left transition duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#F59E0B]",
        active
          ? "border-[#F59E0B] bg-[#F59E0B] text-stone-950"
          : isDark
            ? "border-[#2A2A2A] bg-[#1A1A1A] text-[#F5F5F5] hover:border-amber-500/50"
            : "border-stone-200 bg-white text-stone-900 hover:border-amber-300",
      )}
    >
      <span className="block text-xs font-bold uppercase tracking-wide">{label}</span>
      <span className={classNames("mt-2 block text-xs leading-5", active ? "text-stone-800" : isDark ? "text-[#888]" : "text-stone-500")}>
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

function pageClassName(isDark: boolean, extra: string) {
  return classNames(
    "relative font-sans transition-colors duration-300 ease-in-out",
    isDark ? "bg-[#0F0F0F] text-[#F5F5F5]" : "bg-[#F7F0E5] text-stone-950",
    extra,
  );
}

function panelClassName(isDark: boolean) {
  return classNames(
    "rounded-2xl border p-4 shadow-xl",
    isDark ? "border-[#2A2A2A] bg-[#1A1A1A] text-[#F5F5F5]" : "border-stone-200 bg-white text-stone-950",
  );
}

function eyebrowClassName(isDark: boolean) {
  return classNames("text-xs font-bold uppercase tracking-wide", isDark ? "text-[#888]" : "text-stone-500");
}

function secondaryTextClassName(isDark: boolean) {
  return classNames("text-sm", isDark ? "text-[#888]" : "text-stone-500");
}

function getStoredTheme(): Theme {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
}

function BackgroundPattern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-25"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(240,217,181,0.08) 25%, transparent 25%, transparent 50%, rgba(240,217,181,0.08) 50%, rgba(240,217,181,0.08) 75%, transparent 75%, transparent)",
        backgroundSize: "96px 96px",
      }}
    />
  );
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
