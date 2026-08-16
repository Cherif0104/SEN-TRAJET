"use client";

import { useEffect, useRef, useState } from "react";
import { Languages, MonitorCog, Settings2 } from "lucide-react";
import { locales, type Locale } from "@/i18n";
import {
  usePreferences,
  type ThemePreference,
} from "@/providers/PreferencesProvider";

const themes: ThemePreference[] = ["system", "light", "dark"];

export function PreferencesMenu({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, theme, setTheme, t } = usePreferences();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
        aria-label={t("preferences.title")}
        aria-expanded={open}
      >
        <Settings2 className="h-4.5 w-4.5" />
      </button>
      {open ? (
        <div
          className={`absolute z-[80] mt-2 w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 text-start shadow-[var(--shadow-md)] ${
            compact ? "start-0" : "end-0"
          }`}
        >
          <strong className="block text-sm text-[var(--color-text-primary)]">
            {t("preferences.title")}
          </strong>
          <label className="mt-4 grid gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5" />
              {t("preferences.language")}
            </span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
              className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            >
              {locales.map((item) => (
                <option key={item} value={item}>
                  {t(`language.${item}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 grid gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1.5">
              <MonitorCog className="h-3.5 w-3.5" />
              {t("preferences.theme")}
            </span>
            <select
              value={theme}
              onChange={(event) =>
                setTheme(event.target.value as ThemePreference)
              }
              className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            >
              {themes.map((item) => (
                <option key={item} value={item}>
                  {t(`theme.${item}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}
