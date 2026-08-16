"use client";

import Link from "next/link";
import { MapPin, Plane, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePreferences } from "@/providers/PreferencesProvider";

const pillars = [
  {
    icon: Plane,
    title: "landing.service.airport" as const,
    text: "landing.service.airportDetail" as const,
  },
  {
    icon: MapPin,
    title: "landing.service.travel" as const,
    text: "landing.service.travelDetail" as const,
  },
  {
    icon: Clock,
    title: "landing.service.hourly" as const,
    text: "landing.service.hourlyDetail" as const,
  },
];

const steps = [
  { n: "1", title: "landing.step.simulate" as const, desc: "landing.step.simulateDetail" as const },
  { n: "2", title: "landing.step.confirm" as const, desc: "landing.step.confirmDetail" as const },
  { n: "3", title: "landing.step.travel" as const, desc: "landing.step.travelDetail" as const },
];

export function HomeContinued() {
  const { t } = usePreferences();

  return (
    <>
      <section className="bg-[var(--color-background)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-accent)]">{t("landing.services")}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              {t("landing.servicesTitle")}
            </h2>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              {t("landing.servicesSubtitle")}
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {pillars.map(({ icon: Icon, title, text }) => (
              <Link
                key={title}
                href="/reserver"
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm transition hover:border-[var(--color-accent)] hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">{t(title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{t(text)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-accent)]">{t("landing.journey")}</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
                {t("landing.journeyTitle")}
              </h2>
            </div>
            <Button variant="outline" size="sm" href="/reserver" className="w-fit shrink-0">
              {t("actions.bookNow")}
            </Button>
          </div>
          <ol className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="relative flex gap-4">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-[var(--color-text-inverse)]"
                  aria-hidden
                >
                  {s.n}
                </span>
                <div>
                  <h3 className="font-semibold text-[var(--color-text-primary)]">{t(s.title)}</h3>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t(s.desc)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#07111f] py-14 text-white sm:py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{t("landing.ready")}</h2>
            <p className="mt-2 max-w-lg text-neutral-400">
              {t("landing.readyDetail")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="lg"
              href="/reserver"
              className="bg-amber-500 text-neutral-900 hover:bg-amber-400 focus:ring-amber-500"
            >
              {t("actions.bookNow")}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              href="/inscription"
              className="border-white/30 text-white hover:bg-white/10"
            >
              {t("actions.createAccount")}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
