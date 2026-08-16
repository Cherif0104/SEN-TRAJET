"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  isLocale,
  type Locale,
  translate,
  type TranslationKey,
} from "@/i18n";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const LOCALE_KEY = "sentrajet-locale";
const THEME_KEY = "sentrajet-theme";

type PreferencesContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  resolvedTheme: ResolvedTheme;
  ready: boolean;
  direction: "ltr" | "rtl";
  t: (key: TranslationKey) => string;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function browserLocale(): Locale {
  if (typeof navigator === "undefined") return "fr";
  const candidate = navigator.language.toLowerCase().split("-")[0];
  return isLocale(candidate) ? candidate : "fr";
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedLocale = localStorage.getItem(LOCALE_KEY);
    const savedTheme = localStorage.getItem(THEME_KEY);
    const nextLocale = isLocale(savedLocale) ? savedLocale : browserLocale();
    const nextTheme = isThemePreference(savedTheme) ? savedTheme : "system";

    setLocaleState(nextLocale);
    setThemeState(nextTheme);
    setResolvedTheme(nextTheme === "system" ? systemTheme() : nextTheme);
    setReady(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      if (theme === "system") setResolvedTheme(media.matches ? "dark" : "light");
    };
    syncSystemTheme();
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
    root.dataset.theme = resolvedTheme;
    root.dataset.themePreference = theme;
    root.style.colorScheme = resolvedTheme;

    const themeMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    themeMeta?.setAttribute(
      "content",
      resolvedTheme === "dark" ? "#07111f" : "#f7f8fa"
    );
  }, [locale, resolvedTheme, theme]);

  const setLocale = useCallback((nextLocale: Locale) => {
    localStorage.setItem(LOCALE_KEY, nextLocale);
    setLocaleState(nextLocale);
  }, []);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    localStorage.setItem(THEME_KEY, nextTheme);
    setThemeState(nextTheme);
    setResolvedTheme(nextTheme === "system" ? systemTheme() : nextTheme);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translate(locale, key),
    [locale]
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      locale,
      setLocale,
      theme,
      setTheme,
      resolvedTheme,
      ready,
      direction: locale === "ar" ? "rtl" : "ltr",
      t,
    }),
    [locale, ready, resolvedTheme, setLocale, setTheme, t, theme]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return context;
}
