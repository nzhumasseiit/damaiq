export function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const THEME_STORAGE_KEY = "damaiq-theme";

export type Theme = "dark" | "light";

export function pageClassName(isDark: boolean, extra: string) {
  return classNames(
    "relative font-sans transition-colors duration-300 ease-in-out",
    isDark ? "bg-[#0A0A0A] text-[#F5F5F5]" : "bg-[#F7F0E5] text-stone-950",
    extra,
  );
}

export function panelClassName(isDark: boolean) {
  return classNames(
    "rounded-2xl border p-4 shadow-xl",
    isDark ? "border-[#2A2A2A] bg-[#1A1A1A] text-[#F5F5F5]" : "border-stone-200 bg-white text-stone-950",
  );
}

export function eyebrowClassName(isDark: boolean) {
  return classNames("text-xs font-bold uppercase tracking-wide", isDark ? "text-[#888]" : "text-stone-500");
}

export function secondaryTextClassName(isDark: boolean) {
  return classNames("text-sm", isDark ? "text-[#888]" : "text-stone-500");
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
}
