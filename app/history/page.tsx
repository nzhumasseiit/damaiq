"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AppHeader from "@/app/components/AppHeader";
import BackgroundPattern from "@/app/components/BackgroundPattern";
import { useAppPreferences } from "@/app/hooks/useAppPreferences";
import { getPlayerProfile } from "@/lib/leaderboard/local";
import { fetchPlayerGames, getPlayerStatsSummary } from "@/lib/leaderboard/service";
import { type StoredGame } from "@/lib/leaderboard/types";
import { type Language, t } from "@/lib/i18n";
import { classNames, eyebrowClassName, pageClassName, panelClassName } from "@/lib/ui";

export default function HistoryPage() {
  const { hasHydrated, isDark, language, theme, updateLanguage, updateTheme } = useAppPreferences();
  const [games, setGames] = useState<StoredGame[]>([]);
  const profile = getPlayerProfile();

  useEffect(() => {
    if (!hasHydrated) return;
    void fetchPlayerGames().then(setGames);
  }, [hasHydrated]);

  if (!hasHydrated) {
    return <div className="min-h-screen bg-[#0A0A0A]" />;
  }

  const stats = profile ? getPlayerStatsSummary(profile) : null;

  return (
    <main className={pageClassName(isDark, "min-h-screen pb-10")}>
      <BackgroundPattern isDark={isDark} />
      <AppHeader
        isDark={isDark}
        language={language}
        setLanguage={updateLanguage}
        setTheme={updateTheme}
        theme={theme}
      />

      <section className="relative z-10 mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t("historyTitle", language)}</h1>
          <p className={classNames("mt-2 text-sm", isDark ? "text-[#888]" : "text-stone-500")}>
            {profile ? `${profile.nickname} · ${profile.city}` : t("historyEmptyProfile", language)}
          </p>
        </div>

        {stats ? (
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <StatCard isDark={isDark} label={t("statTotalGames", language)} value={String(stats.totalGames)} />
            <StatCard isDark={isDark} label={t("statWinRate", language)} value={`${stats.winRate}%`} />
            <StatCard isDark={isDark} label={t("statBestStreak", language)} value={String(stats.bestStreak)} />
          </div>
        ) : null}

        <div className={panelClassName(isDark)}>
          {games.length === 0 ? (
            <p className={classNames("text-sm", isDark ? "text-[#888]" : "text-stone-500")}>
              {t("historyNoGames", language)}
            </p>
          ) : (
            <ul className="space-y-3">
              {games.map((game) => (
                <GameRow key={game.id} game={game} isDark={isDark} language={language} />
              ))}
            </ul>
          )}
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex text-sm font-semibold text-amber-400 transition hover:text-amber-300"
        >
          ← {t("backToGame", language)}
        </Link>
      </section>
    </main>
  );
}

function StatCard({ isDark, label, value }: { isDark: boolean; label: string; value: string }) {
  return (
    <div className={classNames(panelClassName(isDark), "text-center")}>
      <p className={eyebrowClassName(isDark)}>{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function GameRow({ game, isDark, language }: { game: StoredGame; isDark: boolean; language: Language }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(game.createdAt).toLocaleString(language === "kk" ? "kk-KZ" : "ru-RU");

  return (
    <li className={classNames("rounded-xl border", isDark ? "border-[#2A2A2A] bg-[#141414]" : "border-stone-200 bg-stone-50")}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="font-semibold">{formatOpponent(game.opponent, language)}</p>
          <p className={classNames("mt-1 text-xs", isDark ? "text-[#888]" : "text-stone-500")}>
            {date} · {game.totalMoves} {t("movesPlayed", language)}
          </p>
        </div>
        <ResultBadge isDark={isDark} language={language} result={game.result} />
      </button>
      {expanded ? (
        <div className={classNames("border-t px-4 py-3 font-mono text-xs leading-6", isDark ? "border-[#2A2A2A] text-[#888]" : "border-stone-200 text-stone-600")}>
          {game.moveHistory.length > 0 ? game.moveHistory.join(" ") : t("noMoves", language)}
        </div>
      ) : null}
    </li>
  );
}

function ResultBadge({
  isDark,
  language,
  result,
}: {
  isDark: boolean;
  language: Language;
  result: StoredGame["result"];
}) {
  const label =
    result === "win" ? t("resultWin", language) : result === "loss" ? t("resultLoss", language) : t("draw", language);

  return (
    <span
      className={classNames(
        "rounded-full px-3 py-1 text-xs font-bold uppercase",
        result === "win"
          ? "bg-emerald-500/15 text-emerald-400"
          : result === "loss"
            ? "bg-red-500/15 text-red-400"
            : isDark
              ? "bg-white/10 text-[#888]"
              : "bg-stone-200 text-stone-600",
      )}
    >
      {label}
    </span>
  );
}

function formatOpponent(opponent: StoredGame["opponent"], language: Language) {
  if (opponent === "pvp") return t("vsPlayer", language);
  if (opponent === "ai_easy") return `${t("vsAI", language)} · ${t("easy", language)}`;
  if (opponent === "ai_medium") return `${t("vsAI", language)} · ${t("medium", language)}`;
  return `${t("vsAI", language)} · ${t("hard", language)}`;
}
