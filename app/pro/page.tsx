"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

import AppHeader from "@/app/components/AppHeader";
import BackgroundPattern from "@/app/components/BackgroundPattern";
import { useAppPreferences } from "@/app/hooks/useAppPreferences";
import { t, type TranslationKey } from "@/lib/i18n";
import { getCurrentProfileId } from "@/lib/leaderboard/service";
import { classNames, pageClassName, panelClassName } from "@/lib/ui";

const freeFeatures = [
  "proFeatureAi",
  "proFeatureTwoPlayer",
  "proFeatureBasicCoach",
  "proFeatureLeaderboard",
  "proFeatureLanguages",
] as const satisfies readonly TranslationKey[];

const proFeatures = [
  "proFeatureAllFree",
  "proFeatureAdvancedCoach",
  "proFeatureReplay",
  "proFeatureBoardSkins",
  "proFeaturePriority",
  "proFeatureNoAds",
  "proFeatureEarlyAccess",
] as const satisfies readonly TranslationKey[];

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
      setError(t("proUnavailable", language));
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

      <section
        className={classNames(
          "relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-10 text-center sm:px-6 lg:px-8",
          isDark ? "text-[#F5F5F5]" : "text-zinc-900",
        )}
      >
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#F59E0B]">DamaIQ Pro</p>
        <h1
          className={classNames(
            "mx-auto mt-4 max-w-3xl text-[clamp(2.5rem,7vw,5.5rem)] font-black leading-none tracking-tight",
            isDark ? "text-[#F5F5F5]" : "text-zinc-950",
          )}
        >
          {t("proHeroTitle", language)}
        </h1>
        <p
          className={classNames(
            "mx-auto mt-5 max-w-2xl text-base leading-7 sm:text-lg",
            isDark ? "text-[#A3A3A3]" : "text-zinc-700",
          )}
        >
          {t("proHeroSubtitle", language)}
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
              {t("proFreeCta", language)}
            </Link>
          }
          features={freeFeatures}
          isDark={isDark}
          language={language}
          price={t("proFreePrice", language)}
          title={t("proFreeTitle", language)}
        />
        <PricingCard
          badge={t("proBadgePopular", language)}
          cta={
            <button
              type="button"
              onClick={startCheckout}
              disabled={isLoading}
              className="mt-6 flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#F59E0B] px-5 text-sm font-black uppercase tracking-wide text-stone-950 shadow-lg shadow-amber-950/30 transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-60"
            >
              {isLoading ? t("proLoading", language) : t("proCheckoutCta", language)}
            </button>
          }
          featured
          features={proFeatures}
          isDark={isDark}
          language={language}
          price={t("proPrice", language)}
          title="Pro"
        />
      </section>

      {error ? <p className="relative z-10 mt-5 text-center text-sm text-red-300">{error}</p> : null}
      {showDemoModal ? (
        <DemoModal isDark={isDark} language={language} onClose={() => setShowDemoModal(false)} />
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
  language,
  price,
  title,
}: {
  badge?: string;
  cta: ReactNode;
  featured?: boolean;
  features: readonly TranslationKey[];
  isDark: boolean;
  language: Parameters<typeof t>[1];
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
            <span>{t(feature, language)}</span>
          </li>
        ))}
      </ul>
      {cta}
    </div>
  );
}

function DemoModal({
  isDark,
  language,
  onClose,
}: {
  isDark: boolean;
  language: Parameters<typeof t>[1];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
      <div className={classNames(panelClassName(isDark), "max-w-md text-center")}>
        <p className={classNames("text-lg font-black", isDark ? "text-[#F5F5F5]" : "text-zinc-900")}>
          {t("proDemoTitle", language)}
        </p>
        <p className={classNames("mt-3 text-sm leading-6", isDark ? "text-[#A3A3A3]" : "text-zinc-700")}>
          {t("proDemoDesc", language)}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-11 rounded-2xl bg-[#F59E0B] px-5 text-sm font-black uppercase tracking-wide text-stone-950"
        >
          {t("proDemoButton", language)}
        </button>
      </div>
    </div>
  );
}
