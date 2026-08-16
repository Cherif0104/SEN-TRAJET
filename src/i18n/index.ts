import { ar } from "./locales/ar";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { fr, type TranslationKey } from "./locales/fr";
import { zh } from "./locales/zh";

export const locales = ["fr", "en", "ar", "es", "zh"] as const;
export type Locale = (typeof locales)[number];

export const dictionaries = { fr, en, ar, es, zh } as const;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

export function translate(locale: Locale, key: TranslationKey): string {
  return dictionaries[locale][key] ?? fr[key] ?? key;
}

export type { TranslationKey };
