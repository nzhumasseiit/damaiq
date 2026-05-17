"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Mascot from "@/app/components/Mascot";
import { type Language, t } from "@/lib/i18n";
import { getPlayerProfile } from "@/lib/leaderboard/local";
import { refreshCurrentProfile } from "@/lib/leaderboard/service";
import { classNames, type Theme } from "@/lib/ui";

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
    <div
      className={classNames(
        "flex min-h-10 rounded-full border p-1 shadow-lg backdrop-blur",
        isDark ? "border-[#2A2A2A] bg-[#1A1A1A]" : "border-stone-200 bg-white",
      )}
    >
      {(["ru", "kk"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
          className={classNames(
            "min-h-8 rounded-full px-3 text-xs font-bold uppercase tracking-wide transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#F59E0B]",
            language === option
              ? isDark
                ? "border-b-2 border-[#F59E0B] text-[#F5F5F5]"
                : "border-b-2 border-[#F59E0B] text-stone-950"
              : isDark
                ? "text-[#555] hover:text-[#888]"
                : "text-stone-400 hover:text-stone-600",
          )}
        >
          {t(option === "ru" ? "ruLanguage" : "kkLanguage", language)}
        </button>
      ))}
    </div>
  );
}

export default function AppHeader({
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
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const profile = getPlayerProfile();
      setIsPro(Boolean(profile?.isPro));
    }, 0);
    void refreshCurrentProfile().then((fresh) => setIsPro(Boolean(fresh?.isPro)));
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
      <Link href="/" className="flex min-w-0 items-center gap-3">
        <Mascot size="sm" />
        <span
          className={classNames(
            "truncate text-lg font-extrabold tracking-tight",
            isDark ? "text-[#F5F5F5]" : "text-stone-950",
          )}
        >
          {t("appName", language)}
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        {!isPro ? (
          <Link
            href="/pro"
            className="inline-flex min-h-10 items-center rounded-full bg-[#F59E0B] px-3 py-2 text-xs font-black uppercase tracking-wide text-stone-950 shadow-lg shadow-amber-950/20 transition duration-200 ease-in-out hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-amber-200"
          >
            <span className="hidden sm:inline">{t("upgradeToPro", language)}</span>
            <span className="sm:hidden">{t("proShort", language)}</span>
          </Link>
        ) : null}
        <Link
          href="/leaderboard"
          className={classNames(
            "inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wide transition duration-200 ease-in-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]",
            isDark
              ? "border-[#2A2A2A] bg-[#141414] text-amber-400 hover:border-[#F59E0B]/40"
              : "border-stone-200 bg-white text-amber-700 hover:border-amber-300",
          )}
        >
          <span aria-hidden="true">🏆</span>
          {t("leaderboardNav", language)}
        </Link>
        <Link
          href="/history"
          className={classNames(
            "hidden rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wide transition duration-200 ease-in-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] md:inline-flex",
            isDark
              ? "border-[#2A2A2A] bg-[#141414] text-[#888] hover:border-[#F59E0B]/40 hover:text-[#F5F5F5]"
              : "border-stone-200 bg-white text-stone-500 hover:border-amber-300 hover:text-stone-950",
          )}
        >
          {t("historyNav", language)}
        </Link>
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
