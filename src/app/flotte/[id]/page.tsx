"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BadgeCheck,
  Car,
  ChevronLeft,
  ChevronRight,
  Luggage,
  MessageCircle,
  Share2,
  Users,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import {
  getPublicVehicleById,
  vehiclePhotos,
  type PublicCatalogVehicle,
} from "@/lib/vehicleCatalogPublic";
import { listBusinessRules, ruleString } from "@/lib/engines/businessRules";

function capitalize(label: string): string {
  return label.length ? label[0].toUpperCase() + label.slice(1) : label;
}

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<PublicCatalogVehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [whatsappPhone, setWhatsappPhone] = useState("221788324069");
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    void Promise.all([
      getPublicVehicleById(params.id),
      listBusinessRules("contact").catch(() => []),
    ])
      .then(([row, rules]) => {
        if (!row) {
          setError("Ce véhicule n’est plus disponible dans le catalogue.");
          return;
        }
        setVehicle(row);
        setWhatsappPhone(ruleString(rules, "contact", "whatsapp_phone", whatsappPhone));
      })
      .catch(() => setError("Impossible de charger ce véhicule pour le moment."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const photos = useMemo(() => (vehicle ? vehiclePhotos(vehicle) : []), [vehicle]);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = vehicle ? `${vehicle.brand} ${vehicle.model} — SentraJet` : "SentraJet";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* l'utilisateur a annulé — on retombe sur la copie du lien */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch {
      /* presse-papiers indisponible, pas bloquant */
    }
  }

  const whatsappShareHref = vehicle
    ? `https://wa.me/?text=${encodeURIComponent(
        `${vehicle.brand} ${vehicle.model} — SentraJet : ${typeof window !== "undefined" ? window.location.href : ""}`
      )}`
    : "#";
  const whatsappBookHref = vehicle
    ? `https://wa.me/${whatsappPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Bonjour SentraJet, je souhaite réserver le ${vehicle.brand} ${vehicle.model}${
          vehicle.category ? ` (${vehicle.category})` : ""
        }.`
      )}`
    : "#";

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <button
          type="button"
          onClick={() => router.push("/flotte")}
          className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-amber-800"
        >
          <ChevronLeft className="h-4 w-4" /> Retour à la flotte
        </button>

        {loading ? (
          <div className="flex justify-center py-20">
            <BrandedLoader />
          </div>
        ) : error || !vehicle ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
            <p className="text-sm text-neutral-600">{error || "Véhicule introuvable."}</p>
            <Link href="/flotte" className="mt-4 inline-block text-sm font-semibold text-amber-800 underline">
              Voir la flotte
            </Link>
          </div>
        ) : (
          <>
            {/* Galerie photo */}
            <div className="relative overflow-hidden rounded-3xl bg-neutral-900">
              {photos.length ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photos[activeIndex]}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="h-72 w-full object-cover sm:h-96"
                  />
                  {photos.length > 1 ? (
                    <>
                      <button
                        type="button"
                        aria-label="Photo précédente"
                        onClick={() => setActiveIndex((i) => (i - 1 + photos.length) % photos.length)}
                        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Photo suivante"
                        onClick={() => setActiveIndex((i) => (i + 1) % photos.length)}
                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
                        {activeIndex + 1} / {photos.length}
                      </span>
                    </>
                  ) : null}
                </>
              ) : (
                <div className="flex h-72 w-full flex-col items-center justify-center gap-2 text-white/70 sm:h-96">
                  <Car className="h-12 w-12" />
                  <span className="text-sm font-semibold uppercase tracking-wide">
                    {vehicle.brand} {vehicle.model}
                  </span>
                </div>
              )}
            </div>
            {photos.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {photos.map((photo, index) => (
                  <button
                    key={photo}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      index === activeIndex ? "border-amber-500" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}

            {/* En-tête */}
            <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {vehicle.category ? (
                    <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold text-white">
                      {capitalize(vehicle.category)}
                    </span>
                  ) : null}
                  {vehicle.is_verified ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                      <BadgeCheck className="h-3.5 w-3.5" /> Certifié SentraJet
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-2 font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
                  {vehicle.brand} {vehicle.model}
                  {vehicle.year ? <span className="text-neutral-400"> · {vehicle.year}</span> : null}
                </h1>
                {vehicle.tagline ? <p className="mt-1 text-sm text-neutral-600">{vehicle.tagline}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => void share()}
                className="flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-amber-400"
              >
                <Share2 className="h-4 w-4" /> {shared ? "Lien copié !" : "Partager"}
              </button>
            </div>

            {/* Caractéristiques */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                vehicle.seats ? { icon: Users, label: `${vehicle.seats} places` } : null,
                vehicle.luggage_capacity ? { icon: Luggage, label: vehicle.luggage_capacity } : null,
                vehicle.chauffeur_mode ? { icon: Car, label: vehicle.chauffeur_mode } : null,
                vehicle.color ? { icon: Car, label: vehicle.color } : null,
              ]
                .filter((item): item is { icon: typeof Users; label: string } => Boolean(item))
                .map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700"
                  >
                    <Icon className="h-4 w-4 text-amber-700" />
                    {label}
                  </div>
                ))}
            </div>

            {vehicle.ideal_for ? (
              <p className="mt-4 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
                <span className="font-semibold text-neutral-800">Idéal pour</span> · {vehicle.ideal_for}
              </p>
            ) : null}

            {/* Tarif + CTA */}
            <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-neutral-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                {vehicle.price_reference ? (
                  <p className="text-lg font-bold text-amber-300">{vehicle.price_reference}</p>
                ) : null}
                {vehicle.availability ? <p className="text-sm text-neutral-300">{vehicle.availability}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={whatsappShareHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-white/25 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  <Share2 className="h-4 w-4" /> Partager sur WhatsApp
                </a>
                <a
                  href={whatsappBookHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-white/25 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
                <Button
                  href={`/reserver?service=transfert_aibd`}
                  className="bg-amber-500 text-neutral-900 hover:bg-amber-400"
                >
                  Réserver
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
