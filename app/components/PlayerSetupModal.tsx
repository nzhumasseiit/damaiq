"use client";

import { useState } from "react";

import { CITIES, type City } from "@/lib/cities";
import { type Language, t } from "@/lib/i18n";
import { registerPlayer } from "@/lib/leaderboard/service";
import { classNames } from "@/lib/ui";

export default function PlayerSetupModal({
  isDark,
  language,
  onComplete,
}: {
  isDark: boolean;
  language: Language;
  onComplete: () => void;
}) {
  const [nickname, setNickname] = useState("");
  const [city, setCity] = useState<City>("Алматы");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) return;

    await registerPlayer(trimmed.slice(0, 20), city);
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className={classNames(
          "w-full max-w-md rounded-2xl border p-6 shadow-2xl",
          isDark ? "border-[#2A2A2A] bg-[#141414]" : "border-stone-200 bg-white",
        )}
      >
        <h2 className={classNames("text-xl font-extrabold", isDark ? "text-[#F5F5F5]" : "text-stone-950")}>
          {t("playerSetupTitle", language)}
        </h2>
        <p className={classNames("mt-2 text-sm", isDark ? "text-[#888]" : "text-stone-500")}>
          {t("playerSetupDesc", language)}
        </p>

        <label className="mt-5 block">
          <span className={classNames("text-xs font-bold uppercase tracking-wide", isDark ? "text-[#888]" : "text-stone-500")}>
            {t("nicknameLabel", language)}
          </span>
          <input
            required
            maxLength={20}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder={t("nicknamePlaceholder", language)}
            className={classNames(
              "mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#F59E0B]",
              isDark
                ? "border-[#2A2A2A] bg-[#0A0A0A] text-[#F5F5F5] placeholder:text-[#555]"
                : "border-stone-200 bg-stone-50 text-stone-950",
            )}
          />
        </label>

        <label className="mt-4 block">
          <span className={classNames("text-xs font-bold uppercase tracking-wide", isDark ? "text-[#888]" : "text-stone-500")}>
            {t("cityLabel", language)}
          </span>
          <select
            value={city}
            onChange={(event) => setCity(event.target.value as City)}
            className={classNames(
              "mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#F59E0B]",
              isDark
                ? "border-[#2A2A2A] bg-[#0A0A0A] text-[#F5F5F5]"
                : "border-stone-200 bg-stone-50 text-stone-950",
            )}
          >
            {CITIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={!nickname.trim()}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-sm font-bold uppercase tracking-widest text-stone-950 shadow-lg transition duration-200 ease-in-out hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden="true">♟</span>
          {t("playButton", language)}
        </button>
      </form>
    </div>
  );
}
