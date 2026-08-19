"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe2, Moon, Sun } from "lucide-react";
import { locales, type Locale } from "@/i18n";
import { usePreferences } from "@/providers/PreferencesProvider";

const controlClass =
  "inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-sm font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]";

export function ThemeToggle() {
  const { resolvedTheme, setTheme, t } = usePreferences();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      className={controlClass}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={t("preferences.theme")}
      aria-pressed={isDark}
      title={isDark ? t("theme.light") : t("theme.dark")}
    >
      {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
    </button>
  );
}

export function LanguageMenu() {
  const { locale, setLocale, t } = usePreferences();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const choose = (next: Locale) => {
    setLocale(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={controlClass}
        onClick={() => setOpen((current) => !current)}
        aria-label={t("preferences.language")}
        aria-expanded={open}
      >
        <Globe2 className="h-4.5 w-4.5" />
        <span className="text-[11px] uppercase">{locale}</span>
      </button>
      {open ? (
        <div className="absolute end-0 z-[90] mt-2 w-52 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2 shadow-[var(--shadow-lg)]">
          <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            {t("preferences.language")}
          </p>
          {locales.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => choose(item)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-start text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
            >
              <span>{t(`language.${item}`)}</span>
              {item === locale ? <Check className="h-4 w-4 text-[var(--color-accent)]" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
