"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

import AppHeader from "@/app/components/AppHeader";
import BackgroundPattern from "@/app/components/BackgroundPattern";
import { useAppPreferences } from "@/app/hooks/useAppPreferences";
import { getCurrentProfileId } from "@/lib/leaderboard/service";
import { classNames, pageClassName, panelClassName } from "@/lib/ui";

const freeFeatures = [
  "Игра против ИИ (3 уровня)",
  "Режим 2 игрока",
  "Базовый AI Coach (3 совета)",
  "Городской рейтинг",
  "Русский + казахский язык",
];

const proFeatures = [
  "Всё из Free",
  "Расширенный AI Coach (детальный разбор каждого хода)",
  "История всех партий + реплей",
  "Кастомные скины доски (5 тем)",
  "Приоритетный анализ без очереди",
  "Без рекламы",
  "Ранний доступ к новым фичам",
];

export default function ProPage() {
  const { hasHydrated, isDark, language, theme, updateLanguage, updateTheme } = useAppPreferences();
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setIsLoading(true);
    setError(null);

    try {
      const userId = await getCurrentProfileId();
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const payload = (await response.json()) as { url?: string; demo?: boolean; error?: string };

      if (payload.demo) {
        setShowDemoModal(true);
        return;
      }

      if (!payload.url) throw new Error(payload.error ?? "Checkout unavailable.");
      window.location.href = payload.url;
    } catch {
      setError("Checkout временно недоступен");
    } finally {
      setIsLoading(false);
    }
  }

  if (!hasHydrated) return <div className="min-h-screen bg-[#0F0F0F]" />;

  return (
    <main className={pageClassName(isDark, "min-h-screen overflow-hidden pb-12")}>
      <BackgroundPattern isDark={isDark} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.28),transparent_58%)]" />
      <AppHeader
        isDark={isDark}
        language={language}
        setLanguage={updateLanguage}
        setTheme={updateTheme}
        theme={theme}
      />

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-10 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#F59E0B]">DamaIQ Pro</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-[clamp(2.5rem,7vw,5.5rem)] font-black leading-none tracking-tight text-[#F5F5F5]">
          Играй умнее. Стань сильнее.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#A3A3A3] sm:text-lg">
          DamaIQ Pro открывает полный потенциал AI-наставника
        </p>
      </section>

      <section className="relative z-10 mx-auto grid max-w-5xl gap-5 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <PricingCard
          cta={
            <Link
              href="/"
              className={classNames(
                "mt-6 flex min-h-12 items-center justify-center rounded-2xl border px-5 text-sm font-black uppercase tracking-wide transition hover:-translate-y-0.5",
                isDark
                  ? "border-stone-600 text-[#F5F5F5] hover:border-[#F59E0B]"
                  : "border-zinc-900 text-zinc-900 hover:border-[#D97706] hover:bg-amber-50",
              )}
            >
              Играть бесплатно
            </Link>
          }
          features={freeFeatures}
          isDark={isDark}
          price="0 ₸ / навсегда"
          title="Старт"
        />
        <PricingCard
          badge="Популярно"
          cta={
            <button
              type="button"
              onClick={startCheckout}
              disabled={isLoading}
              className="mt-6 flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#F59E0B] px-5 text-sm font-black uppercase tracking-wide text-stone-950 shadow-lg shadow-amber-950/30 transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-60"
            >
              {isLoading ? "Загрузка..." : "Начать Pro — $4.99"}
            </button>
          }
          featured
          features={proFeatures}
          isDark={isDark}
          price="$4.99 / месяц"
          title="Pro"
        />
      </section>

      {error ? <p className="relative z-10 mt-5 text-center text-sm text-red-300">{error}</p> : null}
      {showDemoModal ? (
        <DemoModal isDark={isDark} onClose={() => setShowDemoModal(false)} />
      ) : null}
    </main>
  );
}

function PricingCard({
  badge,
  cta,
  featured = false,
  features,
  isDark,
  price,
  title,
}: {
  badge?: string;
  cta: ReactNode;
  featured?: boolean;
  features: string[];
  isDark: boolean;
  price: string;
  title: string;
}) {
  return (
    <div
      className={classNames(
        panelClassName(isDark),
        "relative text-left",
        !isDark && "text-zinc-900",
        featured && "border-[#F59E0B]/70 shadow-2xl shadow-amber-950/30",
      )}
    >
      {badge ? (
        <span className="absolute right-5 top-5 rounded-full bg-[#F59E0B] px-3 py-1 text-xs font-black uppercase tracking-wide text-stone-950">
          {badge}
        </span>
      ) : null}
      <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      <p className="mt-2 text-3xl font-black text-[#F59E0B]">{price}</p>
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li
            key={feature}
            className={classNames(
              "flex gap-3 text-sm leading-6",
              isDark ? "text-[#D4D4D4]" : "text-zinc-900",
            )}
          >
            <span className="text-[#F59E0B]">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {cta}
    </div>
  );
}

function DemoModal({ isDark, onClose }: { isDark: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
      <div className={classNames(panelClassName(isDark), "max-w-md text-center")}>
        <p className="text-lg font-black">Stripe не настроен в этом демо.</p>
        <p className="mt-3 text-sm leading-6 text-[#A3A3A3]">
          В продакшне здесь будет оплата подписки.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-11 rounded-2xl bg-[#F59E0B] px-5 text-sm font-black uppercase tracking-wide text-stone-950"
        >
          Понятно
        </button>
      </div>
    </div>
  );
}
