"use client";

import confetti from "canvas-confetti";
import Link from "next/link";
import { useEffect } from "react";

import AppHeader from "@/app/components/AppHeader";
import BackgroundPattern from "@/app/components/BackgroundPattern";
import { useAppPreferences } from "@/app/hooks/useAppPreferences";
import { pageClassName } from "@/lib/ui";

export default function ProSuccessPage() {
  const { hasHydrated, isDark, language, theme, updateLanguage, updateTheme } = useAppPreferences();

  useEffect(() => {
    confetti({
      particleCount: 140,
      spread: 80,
      origin: { y: 0.62 },
      colors: ["#F59E0B", "#FAFAFA", "#22C55E"],
    });
  }, []);

  if (!hasHydrated) return <div className="min-h-screen bg-[#0F0F0F]" />;

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
      <section className="relative z-10 mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <p className="text-[clamp(2.25rem,7vw,4.5rem)] font-black tracking-tight text-[#F5F5F5]">
          Добро пожаловать в Pro! 🎉
        </p>
        <p className="mt-4 text-base leading-7 text-[#A3A3A3]">
          AI-наставник готов разбирать партии глубже.
        </p>
        <Link
          href="/"
          className="mt-8 min-h-12 rounded-2xl bg-[#F59E0B] px-6 py-3 text-sm font-black uppercase tracking-wide text-stone-950 transition hover:-translate-y-0.5 hover:brightness-110"
        >
          Начать играть
        </Link>
      </section>
    </main>
  );
}
