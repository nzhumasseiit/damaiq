"use client";

import { useEffect, useState } from "react";

import { type Language, getStoredLanguage, saveLanguage } from "@/lib/i18n";
import { getStoredTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/ui";

export function useAppPreferences() {
  const [language, setLanguage] = useState<Language>("ru");
  const [theme, setTheme] = useState<Theme>("dark");
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setLanguage(getStoredLanguage());
      setTheme(getStoredTheme());
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  function updateLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    saveLanguage(nextLanguage);
  }

  function updateTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  return {
    hasHydrated,
    isDark: theme === "dark",
    language,
    theme,
    updateLanguage,
    updateTheme,
  };
}
