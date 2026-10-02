"use client";

import Link from "next/link";
import { Car, MapPin, Plane, Clock, PartyPopper, Map, Users2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePreferences } from "@/providers/PreferencesProvider";

/**
 * Toutes les rubriques de l'offre, présentées comme les tuiles d'une app VTC (type Yango/Uber) —
 * plutôt que des sections marketing séparées. Allo Dakar reste visuellement distinct (bordure et
 * badge verts, pas la palette navy/or Premium) conformément à la décision produit de ne jamais le
 * confondre avec le service premium — mais apparaît ici au même niveau, pas en lien discret caché
 * en bas de page.
 */
function useServiceTiles() {
  const { t } = usePreferences();
  return [
    {
      icon: Plane,
      title: t("landing.service.airport"),
      text: t("landing.service.airportDetail"),
      href: "/reserver?service=transfert_aibd",
    },
    {
      icon: Clock,
      title: t("landing.service.hourly"),
      text: t("landing.service.hourlyDetail"),
      href: "/reserver?service=mise_a_disposition",
    },
    {
      icon: PartyPopper,
      title: t("booking.service.ceremony"),
      text: t("booking.service.ceremonyDetail"),
      href: "/reserver?service=ceremonie",
    },
    {
      icon: MapPin,
      title: t("landing.service.travel"),
      text: t("landing.service.travelDetail"),
      href: "/reserver?service=interurbain",
    },
    {
      icon: Car,
      title: "Location de véhicules",
      text: "Berlines, SUV, vans — photos, places, tarifs indicatifs à parcourir avant de réserver.",
      href: "/flotte",
    },
    {
      icon: Map,
      title: "Destinations régionales",
      text: "Thiès, Saint-Louis, Ziguinchor, Tambacounda… tout le Sénégal desservi avec chauffeur.",
      href: "/destinations",
    },
  ];
}

const alloDakarCard = {
  icon: Users2,
  title: "SentraJet Allo Dakar",
  text: "Trajets interurbains partagés, chauffeurs partenaires indépendants vérifiés — l'offre économique au départ de Dakar.",
  href: "/allo-dakar",
  badge: "Offre indépendante",
};

const steps = [
  { n: "1", title: "landing.step.simulate" as const, desc: "landing.step.simulateDetail" as const },
  { n: "2", title: "landing.step.confirm" as const, desc: "landing.step.confirmDetail" as const },
  { n: "3", title: "landing.step.travel" as const, desc: "landing.step.travelDetail" as const },
];

export function HomeContinued() {
  const { t } = usePreferences();
  const services = useServiceTiles();

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
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(({ icon: Icon, title, text, href }) => (
              <Link
                key={title}
                href={href}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm transition hover:border-[var(--color-accent)] hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{text}</p>
              </Link>
            ))}

            <Link
              href={alloDakarCard.href}
              className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-50/60 p-6 shadow-sm transition hover:border-emerald-500 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
                  <alloDakarCard.icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <span className="whitespace-nowrap rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  {alloDakarCard.badge}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-emerald-900">{alloDakarCard.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-800/80">{alloDakarCard.text}</p>
            </Link>
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
