"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import AppHeader from "@/app/components/AppHeader";
import BackgroundPattern from "@/app/components/BackgroundPattern";
import CityBattleBanner from "@/app/components/CityBattleBanner";
import CityDot from "@/app/components/CityDot";
import { useAppPreferences } from "@/app/hooks/useAppPreferences";
import { CITIES, type City } from "@/lib/cities";
import { getPlayerProfile } from "@/lib/leaderboard/local";
import {
  fetchCityBattle,
  fetchLeaderboard,
  subscribeLeaderboard,
} from "@/lib/leaderboard/service";
import { type CityBattle, type LeaderboardEntry, winRate } from "@/lib/leaderboard/types";
import { type Language, t } from "@/lib/i18n";
import { classNames, pageClassName, panelClassName } from "@/lib/ui";

type CityFilter = City | "all";

export default function LeaderboardPage() {
  const { hasHydrated, isDark, language, theme, updateLanguage, updateTheme } = useAppPreferences();
  const [cityFilter, setCityFilter] = useState<CityFilter>("all");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [battle, setBattle] = useState<CityBattle | null>(null);
  const currentPlayer = getPlayerProfile();

  const load = useCallback(async () => {
    const [nextEntries, nextBattle] = await Promise.all([
      fetchLeaderboard(cityFilter),
      fetchCityBattle(),
    ]);
    setEntries(nextEntries);
    setBattle(nextBattle);
  }, [cityFilter]);

  useEffect(() => {
    if (!hasHydrated) return;
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [hasHydrated, load]);

  useEffect(() => {
    if (!hasHydrated) return;
    return subscribeLeaderboard(() => {
      void load();
    });
  }, [hasHydrated, load]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.wins - a.wins || winRate(b) - winRate(a)),
    [entries],
  );

  const currentNickname = currentPlayer?.nickname;
  const currentInTopTen = sorted.slice(0, 10).some((entry) => entry.nickname === currentNickname);
  const currentEntry = sorted.find((entry) => entry.nickname === currentNickname);
  const currentRank = currentEntry ? sorted.indexOf(currentEntry) + 1 : null;

  if (!hasHydrated) {
    return <div className="min-h-screen bg-[#0A0A0A]" />;
  }

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

      <section className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t("leaderboardTitle", language)}
          </h1>
          <p className={classNames("mt-2 text-sm", isDark ? "text-[#888]" : "text-stone-500")}>
            {t("leaderboardSubtitle", language)}
          </p>
        </div>

        <CityBattleBanner battle={battle} isDark={isDark} language={language} />

        <CityFilterTabs
          cityFilter={cityFilter}
          isDark={isDark}
          language={language}
          setCityFilter={setCityFilter}
        />

        <div className={classNames(panelClassName(isDark), "mt-4 overflow-hidden p-0")}>
          <LeaderboardTable
            currentNickname={currentNickname}
            entries={sorted.slice(0, 10)}
            isDark={isDark}
            language={language}
            startRank={1}
          />

          {currentEntry && !currentInTopTen && currentRank ? (
            <>
              <div className={classNames("px-4 py-2 text-center text-xs", isDark ? "text-[#555]" : "text-stone-400")}>
                ···
              </div>
              <LeaderboardTable
                currentNickname={currentNickname}
                entries={[currentEntry]}
                isDark={isDark}
                language={language}
                startRank={currentRank}
                pinned
              />
            </>
          ) : null}
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

function CityFilterTabs({
  cityFilter,
  isDark,
  language,
  setCityFilter,
}: {
  cityFilter: CityFilter;
  isDark: boolean;
  language: Language;
  setCityFilter: (filter: CityFilter) => void;
}) {
  const tabs: Array<{ id: CityFilter; label: string }> = [
    { id: "all", label: t("allCities", language) },
    ...CITIES.map((city) => ({ id: city, label: city })),
  ];

  return (
    <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setCityFilter(tab.id)}
          className={classNames(
            "shrink-0 rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wide transition duration-200 ease-in-out",
            cityFilter === tab.id
              ? "border-[#F59E0B40] bg-[#1C1500] text-amber-300"
              : isDark
                ? "border-[#2A2A2A] bg-[#141414] text-[#888] hover:border-[#F59E0B]/40"
                : "border-stone-200 bg-white text-stone-500",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function LeaderboardTable({
  currentNickname,
  entries,
  isDark,
  language,
  startRank,
  pinned = false,
}: {
  currentNickname?: string;
  entries: LeaderboardEntry[];
  isDark: boolean;
  language: Language;
  startRank: number;
  pinned?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className={classNames("text-xs uppercase tracking-wide", isDark ? "bg-[#0A0A0A] text-[#888]" : "bg-stone-50 text-stone-500")}>
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">{t("colNickname", language)}</th>
            <th className="px-4 py-3">{t("colCity", language)}</th>
            <th className="px-4 py-3">{t("colWins", language)}</th>
            <th className="px-4 py-3">{t("colLosses", language)}</th>
            <th className="px-4 py-3">{t("colWinRate", language)}</th>
            <th className="px-4 py-3">{t("colStreak", language)}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const rank = startRank + index;
            const isCurrent = entry.nickname === currentNickname;

            return (
              <tr
                key={`${entry.nickname}-${rank}`}
                className={classNames(
                  "border-t transition",
                  isDark ? "border-[#2A2A2A]" : "border-stone-100",
                  isCurrent
                    ? "bg-amber-500/10 ring-1 ring-inset ring-amber-500/30"
                    : pinned
                      ? "bg-amber-500/5"
                      : index % 2 === 0
                        ? isDark
                          ? "bg-white/[0.02]"
                          : "bg-stone-50/50"
                        : "",
                )}
              >
                <td className="px-4 py-3 font-bold text-amber-400">{rank}</td>
                <td className="px-4 py-3 font-semibold">{entry.nickname}</td>
                <td className="px-4 py-3">
                  <CityDot city={entry.city} />
                </td>
                <td className="px-4 py-3">{entry.wins}</td>
                <td className="px-4 py-3">{entry.losses}</td>
                <td className="px-4 py-3">{winRate(entry)}%</td>
                <td className="px-4 py-3">
                  {entry.winStreak > 0 ? (
                    <span>
                      {entry.winStreak} 🔥
                    </span>
                  ) : (
                    <span className={isDark ? "text-[#555]" : "text-stone-400"}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
