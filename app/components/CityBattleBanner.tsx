"use client";

import { CITY_EMOJI } from "@/lib/cities";
import { type CityBattle } from "@/lib/leaderboard/types";
import { type Language, t } from "@/lib/i18n";
import { classNames, panelClassName } from "@/lib/ui";

export default function CityBattleBanner({
  battle,
  isDark,
  language,
}: {
  battle: CityBattle | null;
  isDark: boolean;
  language: Language;
}) {
  if (!battle) return null;

  const total = battle.winsA + battle.winsB;
  const shareA = total > 0 ? (battle.winsA / total) * 100 : 50;

  return (
    <div className={classNames(panelClassName(isDark), "overflow-hidden")}>
      <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wide">
        <span className="text-amber-400">
          {CITY_EMOJI[battle.cityA]} {battle.cityA.toUpperCase()}
        </span>
        <span className={isDark ? "text-[#888]" : "text-stone-500"}>VS</span>
        <span className="text-emerald-400">
          {battle.cityB.toUpperCase()} {CITY_EMOJI[battle.cityB]}
        </span>
      </div>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[#2A2A2A]">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500"
          style={{ width: `${shareA}%` }}
        />
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all duration-500"
          style={{ width: `${100 - shareA}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className={isDark ? "text-[#F5F5F5]" : "text-stone-900"}>
          {battle.winsA} {t("cityWins", language)}
        </span>
        <span className={isDark ? "text-[#F5F5F5]" : "text-stone-900"}>
          {battle.winsB} {t("cityWins", language)}
        </span>
      </div>
    </div>
  );
}
