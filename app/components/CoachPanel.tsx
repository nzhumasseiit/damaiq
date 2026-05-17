"use client";

import { useState } from "react";
import Link from "next/link";

import { type AiDifficulty } from "@/lib/ai";
import { type Language, t } from "@/lib/i18n";
import { getPlayerProfile } from "@/lib/leaderboard/local";
import { type Move, type Player } from "@/lib/russianDraughtsEngine";

type CoachAnalysis = {
  summary: string;
  tips: string[];
  bestMoment: string;
  worstMoment: string;
  rating: number;
};

type CoachPanelProps = {
  difficulty: AiDifficulty;
  isDark: boolean;
  language: Language;
  moves: Move[];
  playerColor: Player;
  winner: Player | null;
};

export default function CoachPanel({
  difficulty,
  isDark,
  language,
  moves,
  playerColor,
  winner,
}: CoachPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isPro = Boolean(getPlayerProfile()?.isPro);

  if (!winner) return null;

  async function analyzeGame() {
    if (!winner) return;

    setIsOpen(true);
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          moves,
          winner,
          playerColor,
          difficulty,
          isPro,
        }),
      });

      if (!response.ok) {
        throw new Error("Analysis unavailable.");
      }

      setAnalysis((await response.json()) as CoachAnalysis);
    } catch {
      setError(t("analysisUnavailable", language));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={analyzeGame}
          className="min-h-11 w-full rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition duration-200 ease-in-out hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
        >
          {t("analyzeGame", language)}
        </button>
        {!isPro ? (
          <Link
            href="/pro"
            className="text-center text-xs font-black uppercase tracking-wide text-[#F59E0B] transition hover:text-amber-300"
          >
            Pro
          </Link>
        ) : null}
      </div>

      {isOpen ? (
        <div
          className={
            isDark
              ? "fixed inset-x-0 bottom-0 z-20 rounded-t-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 text-[#F5F5F5] shadow-2xl transition duration-300 ease-in-out lg:static lg:rounded-xl"
              : "fixed inset-x-0 bottom-0 z-20 rounded-t-2xl border border-stone-200 bg-white p-5 text-stone-950 shadow-2xl transition duration-300 ease-in-out lg:static lg:rounded-xl"
          }
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
                {t("analyzeGame", language)}
              </p>
              <p className={isDark ? "mt-1 text-sm text-[#888]" : "mt-1 text-sm text-stone-500"}>
                {moves.length} {t("movesPlayed", language)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={t("closeAnalysis", language)}
              className={
                isDark
                  ? "flex h-9 w-9 items-center justify-center rounded-full text-xl text-[#888] transition hover:bg-white/10 hover:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                  : "flex h-9 w-9 items-center justify-center rounded-full text-xl text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
              }
            >
              ×
            </button>
          </div>

          {isLoading ? <LoadingState isDark={isDark} language={language} /> : null}
          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
          {analysis ? <AnalysisView analysis={analysis} isDark={isDark} language={language} /> : null}
        </div>
      ) : null}
    </>
  );
}

function LoadingState({ isDark, language }: { isDark: boolean; language: Language }) {
  return (
    <div
      className={
        isDark
          ? "flex items-center gap-3 rounded-lg bg-amber-400/10 p-4 text-sm font-semibold text-amber-300"
          : "flex items-center gap-3 rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-800"
      }
    >
      <span>{t("analysisLoading", language)}</span>
      <span className="flex gap-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500 [animation-delay:120ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500 [animation-delay:240ms]" />
      </span>
    </div>
  );
}

function AnalysisView({
  analysis,
  isDark,
  language,
}: {
  analysis: CoachAnalysis;
  isDark: boolean;
  language: Language;
}) {
  const rating = Math.max(1, Math.min(10, Math.round(analysis.rating)));

  return (
    <div className="animate-[fadeIn_260ms_ease-in-out] space-y-4">
      <p
        className={
          isDark
            ? "rounded-lg bg-white/[0.04] p-3 text-sm leading-6 text-[#F5F5F5]"
            : "rounded-lg bg-stone-50 p-3 text-sm leading-6 text-stone-700"
        }
      >
        {analysis.summary}
      </p>

      <div>
        <div
          className={
            isDark
              ? "mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-[#888]"
              : "mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-stone-500"
          }
        >
          <span>{t("rating", language)}</span>
          <span>{rating}/10</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-[#F59E0B] transition-all duration-300 ease-in-out"
            style={{ width: `${rating * 10}%` }}
          />
        </div>
      </div>

      <div>
        <p className={isDark ? "mb-2 text-xs font-bold uppercase tracking-wide text-[#888]" : "mb-2 text-xs font-bold uppercase tracking-wide text-stone-500"}>
          {t("tips", language)}
        </p>
        <ul className="space-y-2">
          {analysis.tips.map((tip) => (
            <li
              key={tip}
              className={isDark ? "flex gap-2 text-sm leading-6 text-[#F5F5F5]" : "flex gap-2 text-sm leading-6 text-stone-700"}
            >
              <span aria-hidden="true">♟️</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3">
        <MomentCard
          isDark={isDark}
          tone="good"
          title={t("bestMoment", language)}
          text={analysis.bestMoment}
        />
        <MomentCard
          isDark={isDark}
          tone="risk"
          title={t("worstMoment", language)}
          text={analysis.worstMoment}
        />
      </div>
    </div>
  );
}

function MomentCard({
  isDark,
  tone,
  title,
  text,
}: {
  isDark: boolean;
  tone: "good" | "risk";
  title: string;
  text: string;
}) {
  return (
    <div
      className={
        tone === "good"
          ? isDark
            ? "rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3"
            : "rounded-lg border border-emerald-200 bg-emerald-50 p-3"
          : isDark
            ? "rounded-lg border border-red-400/30 bg-red-400/10 p-3"
            : "rounded-lg border border-red-200 bg-red-50 p-3"
      }
    >
      <p
        className={
          tone === "good"
            ? "text-xs font-bold uppercase tracking-wide text-emerald-700"
            : "text-xs font-bold uppercase tracking-wide text-red-700"
        }
      >
        {title}
      </p>
      <p className={isDark ? "mt-1 text-sm leading-6 text-[#F5F5F5]" : "mt-1 text-sm leading-6 text-stone-700"}>{text}</p>
    </div>
  );
}
