"use client";

import Image from "next/image";
import Link from "next/link";
import { usePreferences } from "@/providers/PreferencesProvider";

export function HeroSection() {
  const { t } = usePreferences();

  return (
    <section className="relative min-h-[min(92vh,720px)] overflow-hidden bg-[#07111f] pb-16 pt-8 sm:min-h-[min(88vh,780px)] sm:pb-20 sm:pt-12 lg:pt-16">
      <div className="absolute inset-0">
        <Image
          src="/brand/sentrajet-vehicle-hero.webp"
          alt="Véhicule SentraJet Premium"
          fill
          priority
          quality={90}
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#07111f]/85 via-[#07111f]/50 to-[#07111f]/92"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#07111f]/80 via-[#07111f]/30 to-transparent"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="font-display text-sm font-semibold tracking-[0.22em] text-[var(--color-accent-hover)]">
          {t("landing.eyebrow")}
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-white drop-shadow-md sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
          {t("landing.title")}
        </h1>
        <p className="mt-4 max-w-xl text-base text-white/90 drop-shadow sm:text-lg">
          {t("landing.subtitle")}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/reserver"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--color-accent)] px-6 py-3.5 text-sm font-bold text-[var(--color-accent-contrast)] hover:bg-[var(--color-accent-hover)]"
          >
            {t("actions.bookNow")}
          </Link>
          <a
            href="https://wa.me/221788324069"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
