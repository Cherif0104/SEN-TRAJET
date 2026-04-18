"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { senegalCities } from "@/data/senegalLocations";
import { reverseGeocode } from "@/lib/geocode";
import type { PickupMode } from "@/lib/pricing";

export function HeroSection() {
  const [depart, setDepart] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [pickupMode, setPickupMode] = useState<PickupMode>("driver_point");
  const [geolocating, setGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const cityOptions = useMemo(() => senegalCities, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (depart) params.set("depart", depart);
    if (destination) params.set("destination", destination);
    if (date) params.set("date", date);
    if (heure) params.set("heure", heure);
    params.set("pickupMode", pickupMode);
    window.location.href = `/recherche?${params.toString()}`;
  };

  const applyMyLocation = (field: "depart" | "destination") => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("La géolocalisation n’est pas disponible sur cet appareil.");
      return;
    }
    setGeoError(null);
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const label = (await reverseGeocode(latitude, longitude)) ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        if (field === "depart") setDepart(label);
        else setDestination(label);
        setGeolocating(false);
      },
      (err) => {
        setGeolocating(false);
        setGeoError(
          err.code === 1
            ? "Position refusée : autorisez la localisation pour le site dans les paramètres du navigateur."
            : "Impossible d’obtenir votre position. Réessayez ou saisissez une ville."
        );
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  return (
    <section className="relative min-h-[min(92vh,720px)] overflow-hidden bg-slate-950 pb-16 pt-8 sm:min-h-[min(88vh,780px)] sm:pb-20 sm:pt-12 lg:pt-16">
      {/* Photo Dakar — recadrage mobile vers la gauche (chauffeur / SUV) */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-sen-trajet.png"
          alt="Chauffeur et véhicules à Dakar, vue sur la côte"
          fill
          priority
          quality={90}
          className="object-cover object-[22%_center] sm:object-[28%_center] lg:object-center"
          sizes="100vw"
        />
      </div>
      {/* Voile pour lisibilité du texte sur le ciel et la route */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/55 to-slate-950/88"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/25 to-transparent sm:from-slate-950/65 sm:via-slate-950/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_0%,rgba(16,185,129,0.12),transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-emerald-300 drop-shadow-sm">SEN TRAJET</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-white drop-shadow-md sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
          Le trajet qu’il vous faut, sans friction.
        </h1>
        <p className="mt-4 max-w-xl text-base text-slate-100/90 drop-shadow sm:text-lg">
          Trajets interurbains et envoi de colis : comparez les offres, réservez en ligne et suivez le parcours — paiements
          pensés pour le contexte local (dont mobile money).
        </p>

        <form
          onSubmit={handleSearch}
          className="mt-10 rounded-2xl border border-white/10 bg-white p-4 shadow-2xl shadow-black/40 sm:p-6 lg:p-8"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            <div className="relative lg:col-span-1">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Départ
              </label>
              <Input
                placeholder="Ville ou commune"
                value={depart}
                onChange={(e) => setDepart(e.target.value)}
                list="senegal-cities-hero"
                className="h-12 border-neutral-200 pr-11 text-neutral-900"
              />
              <button
                type="button"
                onClick={() => applyMyLocation("depart")}
                disabled={geolocating}
                className="absolute bottom-2 right-2 rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-emerald-600 disabled:opacity-50"
                title="Ma position"
                aria-label="Utiliser ma position pour le départ"
              >
                <MapPin className="h-5 w-5" />
              </button>
            </div>
            <div className="relative lg:col-span-1">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Arrivée
              </label>
              <Input
                placeholder="Ville ou commune"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                list="senegal-cities-hero"
                className="h-12 border-neutral-200 pr-11 text-neutral-900"
              />
              <button
                type="button"
                onClick={() => applyMyLocation("destination")}
                disabled={geolocating}
                className="absolute bottom-2 right-2 rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-emerald-600 disabled:opacity-50"
                title="Ma position"
                aria-label="Utiliser ma position pour l’arrivée"
              >
                <MapPin className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 border-neutral-200 text-neutral-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Heure
              </label>
              <Input
                type="time"
                value={heure}
                onChange={(e) => setHeure(e.target.value)}
                className="h-12 border-neutral-200 text-neutral-900"
              />
            </div>
          </div>
          <datalist id="senegal-cities-hero">
            {cityOptions.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          {geoError && (
            <p className="mt-3 text-sm text-amber-800" role="alert">
              {geoError}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-50 p-1">
              <button
                type="button"
                onClick={() => setPickupMode("driver_point")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  pickupMode === "driver_point" ? "bg-white text-emerald-700 shadow-sm" : "text-neutral-600"
                }`}
              >
                Point chauffeur
              </button>
              <button
                type="button"
                onClick={() => setPickupMode("home_pickup")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  pickupMode === "home_pickup" ? "bg-white text-emerald-700 shadow-sm" : "text-neutral-600"
                }`}
              >
                A domicile (+2000)
              </button>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="h-12 bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500 sm:min-w-[200px]"
            >
              <Search className="mr-2 h-5 w-5" />
              Rechercher
            </Button>
            <Button
              variant="ghost"
              size="lg"
              href="/demande"
              className="text-neutral-600 hover:text-neutral-900"
            >
              Plutôt une demande personnalisée
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
