"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, MapPin, MessageCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { groupRoutesByRegion, listPublicPremiumRoutes, type PremiumRegionalRoute } from "@/lib/premiumRoutes";
import { computeSentrajetPrice, formatFcfa } from "@/lib/sentrajetPricing";
import { listBusinessRules, ruleString } from "@/lib/engines/businessRules";

/** Hypothèse d'affichage pour un tarif "à partir de" lisible (4 passagers, aller simple). */
const REFERENCE_PASSENGERS = 4;

function referenceQuote(distanceKm: number) {
  return computeSentrajetPrice({
    segment: "client",
    serviceType: "interurbain",
    passengers: REFERENCE_PASSENGERS,
    distanceKm,
    tripMode: "aller_simple",
  });
}

export default function DestinationsPage() {
  const [routes, setRoutes] = useState<PremiumRegionalRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState("221788324069");

  useEffect(() => {
    void Promise.all([listPublicPremiumRoutes(), listBusinessRules("contact").catch(() => [])])
      .then(([rows, rules]) => {
        setRoutes(rows);
        setWhatsappPhone(ruleString(rules, "contact", "whatsapp_phone", whatsappPhone));
      })
      .catch(() => setError("Impossible de charger les destinations pour le moment."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => groupRoutesByRegion(routes), [routes]);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          Transport interurbain
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Nos destinations régionales
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
          SentraJet dessert les principales régions du Sénégal au départ de Dakar, avec chauffeur
          professionnel et véhicule vérifié. Les tarifs ci-dessous sont indicatifs (
          {REFERENCE_PASSENGERS} passagers, aller simple) — le prix exact est calculé sur la
          distance réelle lors de votre réservation.
        </p>

        <div className="mt-10">
          {loading ? (
            <div className="flex justify-center py-16">
              <BrandedLoader />
            </div>
          ) : error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
          ) : !groups.length ? (
            <p className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
              Aucune destination publiée pour le moment.
            </p>
          ) : (
            <div className="space-y-10">
              {groups.map((group) => (
                <section key={group.region}>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
                    {group.region}
                  </h2>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {group.routes.map((route) => {
                      const quote = referenceQuote(route.distance_km);
                      const whatsappHref = `https://wa.me/${whatsappPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Bonjour SentraJet, je souhaite réserver un trajet Dakar → ${route.destination_city}.`
                      )}`;
                      return (
                        <article
                          key={route.id}
                          className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-display text-lg font-bold text-neutral-900">
                              Dakar → {route.destination_city}
                            </h3>
                            <span className="whitespace-nowrap rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                              {route.distance_km} km
                            </span>
                          </div>

                          {route.description ? (
                            <p className="text-sm text-neutral-600">{route.description}</p>
                          ) : null}

                          <div className="flex flex-wrap gap-3 text-xs font-semibold text-neutral-700">
                            {route.duration_minutes ? (
                              <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1">
                                <Clock3 className="h-3.5 w-3.5" /> ~{route.duration_minutes} min
                              </span>
                            ) : null}
                            {route.suggested_schedule ? (
                              <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1">
                                <MapPin className="h-3.5 w-3.5" /> {route.suggested_schedule}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-auto flex items-center justify-between gap-3 border-t border-neutral-100 pt-3">
                            <div>
                              <p className="text-sm font-bold text-amber-800">
                                {quote.amountFcfa > 0 ? `à partir de ${formatFcfa(quote.amountFcfa)}` : "Sur devis"}
                              </p>
                              <p className="text-xs text-neutral-500">{REFERENCE_PASSENGERS} passagers · aller simple</p>
                            </div>
                            <div className="flex gap-2">
                              <a
                                href={whatsappHref}
                                target="_blank"
                                rel="noreferrer"
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 hover:border-emerald-400 hover:text-emerald-600"
                                aria-label="Demander ce trajet sur WhatsApp"
                                title="Demander ce trajet sur WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                              <Button
                                href={`/interurbain?destination=${encodeURIComponent(route.destination_city)}`}
                                size="sm"
                                className="bg-amber-500 text-neutral-900 hover:bg-amber-400"
                              >
                                Réserver
                              </Button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 sm:p-8">
          <p>
            <strong className="text-neutral-900">Votre région n’est pas listée ?</strong> Indiquez
            simplement votre destination dans{" "}
            <Link href="/interurbain" className="font-semibold text-amber-800 underline">
              la recherche Voyager
            </Link>{" "}
            ou choisissez un voyage privé sur mesure.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
