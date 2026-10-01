"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Car, CheckCircle2, Luggage, MessageCircle, Users } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import {
  distinctCategories,
  listPublicVehicleCatalog,
  type PublicCatalogVehicle,
} from "@/lib/vehicleCatalogPublic";
import { listBusinessRules, ruleString } from "@/lib/engines/businessRules";

function capitalize(label: string): string {
  return label.length ? label[0].toUpperCase() + label.slice(1) : label;
}

function VehiclePhoto({ vehicle }: { vehicle: PublicCatalogVehicle }) {
  const photo = vehicle.photo_url || vehicle.photo_urls?.[0] || null;
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={`${vehicle.brand} ${vehicle.model}`}
        className="h-48 w-full rounded-t-2xl object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div className="flex h-48 w-full items-center justify-center rounded-t-2xl bg-gradient-to-br from-neutral-800 to-neutral-950">
      <div className="flex flex-col items-center gap-2 text-white/70">
        <Car className="h-10 w-10" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          {vehicle.brand} {vehicle.model}
        </span>
      </div>
    </div>
  );
}

export default function FlottePage() {
  const [vehicles, setVehicles] = useState<PublicCatalogVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState("221788324069");

  useEffect(() => {
    void Promise.all([
      listPublicVehicleCatalog(),
      listBusinessRules("contact").catch(() => []),
    ])
      .then(([rows, rules]) => {
        setVehicles(rows);
        setWhatsappPhone(ruleString(rules, "contact", "whatsapp_phone", whatsappPhone));
      })
      .catch(() => setError("Impossible de charger la flotte pour le moment."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => distinctCategories(vehicles), [vehicles]);
  const filtered = useMemo(
    () =>
      activeCategory
        ? vehicles.filter((v) => (v.category || "").trim().toLowerCase() === activeCategory)
        : vehicles,
    [vehicles, activeCategory]
  );

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Flotte SentraJet</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Notre flotte de véhicules
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
          Berlines, SUV et vans avec chauffeur professionnel. Chaque demande passe par SentraJet qui
          valide le devis et affecte un véhicule vérifié de la flotte — vous ne choisissez pas un
          chauffeur au hasard, vous réservez un service.
        </p>

        {categories.length > 1 ? (
          <div className="mt-8 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                activeCategory === null
                  ? "border-amber-500 bg-amber-500 text-neutral-900"
                  : "border-neutral-300 bg-white text-neutral-600 hover:border-amber-400"
              }`}
            >
              Tous
            </button>
            {categories.map((category) => {
              const key = category.toLowerCase();
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveCategory(key)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    activeCategory === key
                      ? "border-amber-500 bg-amber-500 text-neutral-900"
                      : "border-neutral-300 bg-white text-neutral-600 hover:border-amber-400"
                  }`}
                >
                  {capitalize(category)}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="mt-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <BrandedLoader />
            </div>
          ) : error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
          ) : !filtered.length ? (
            <p className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
              Aucun véhicule disponible pour le moment dans cette catégorie.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((vehicle) => {
                const whatsappHref = `https://wa.me/${whatsappPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `Bonjour SentraJet, je souhaite réserver le ${vehicle.brand} ${vehicle.model}${
                    vehicle.category ? ` (${vehicle.category})` : ""
                  }.`
                )}`;
                return (
                  <article
                    key={vehicle.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="relative">
                      <VehiclePhoto vehicle={vehicle} />
                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        {vehicle.category ? (
                          <span className="rounded-full bg-neutral-900/85 px-3 py-1 text-xs font-bold text-white">
                            {capitalize(vehicle.category)}
                          </span>
                        ) : null}
                        {vehicle.is_verified ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-bold text-white">
                            <CheckCircle2 className="h-3 w-3" /> Vérifié
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <div>
                        <h2 className="font-display text-lg font-bold text-neutral-900">
                          {vehicle.brand} {vehicle.model}
                        </h2>
                        {vehicle.tagline ? (
                          <p className="mt-1 text-sm text-neutral-600">{vehicle.tagline}</p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs font-semibold text-neutral-700">
                        {vehicle.seats ? (
                          <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1">
                            <Users className="h-3.5 w-3.5" /> {vehicle.seats} places
                          </span>
                        ) : null}
                        {vehicle.luggage_capacity ? (
                          <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1">
                            <Luggage className="h-3.5 w-3.5" /> {vehicle.luggage_capacity}
                          </span>
                        ) : null}
                        {vehicle.chauffeur_mode ? (
                          <span className="rounded-full bg-neutral-100 px-3 py-1">{vehicle.chauffeur_mode}</span>
                        ) : null}
                      </div>

                      {vehicle.ideal_for ? (
                        <p className="text-xs text-neutral-500">
                          <span className="font-semibold text-neutral-700">Idéal pour</span> · {vehicle.ideal_for}
                        </p>
                      ) : null}

                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-neutral-100 pt-3">
                        <div>
                          {vehicle.price_reference ? (
                            <p className="text-sm font-bold text-amber-800">{vehicle.price_reference}</p>
                          ) : null}
                          {vehicle.availability ? (
                            <p className="text-xs text-neutral-500">{vehicle.availability}</p>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 hover:border-emerald-400 hover:text-emerald-600"
                            aria-label="Demander ce véhicule sur WhatsApp"
                            title="Demander ce véhicule sur WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                          <Button
                            href={`/reserver?service=transfert_aibd`}
                            size="sm"
                            className="bg-amber-500 text-neutral-900 hover:bg-amber-400"
                          >
                            Réserver
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-12 rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 sm:p-8">
          <p>
            <strong className="text-neutral-900">Propriétaire de véhicule ou chauffeur indépendant ?</strong>{" "}
            SentraJet peut intégrer votre véhicule à cette vitrine. Les demandes, le dispatch et les
            paiements restent entièrement gérés par SentraJet — vous recevez vos missions et votre
            rémunération directement de la plateforme.{" "}
            <Link href="/devenir-partenaire" className="font-semibold text-amber-800 underline">
              Devenir partenaire
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
