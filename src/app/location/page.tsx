"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Car, ShieldCheck, Clock3, ChevronRight, Search, Filter } from "lucide-react";
import { getRentalListings, type RentalListing } from "@/lib/rentals";
import { senegalCities } from "@/data/senegalLocations";
import { estimateTripDistance, simulatePriceFromDistance } from "@/lib/distancePricing";

export default function LocationPage() {
  const [listings, setListings] = useState<RentalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const [simFrom, setSimFrom] = useState("");
  const [simTo, setSimTo] = useState("");
  const [simWithDriver, setSimWithDriver] = useState(true);
  const [simResult, setSimResult] = useState<{
    distanceKm: number;
    durationMinutes: number;
    suggestedFcfa: number;
  } | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getRentalListings({ status: "active", city: city || undefined, q: query || undefined })
      .then((rows) => {
        if (mounted) setListings(rows);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [city, query]);

  const totalAvailable = useMemo(() => listings.length, [listings.length]);

  const runSimulation = async () => {
    if (!simFrom.trim() || !simTo.trim()) return;
    setSimLoading(true);
    try {
      const distance = await estimateTripDistance(simFrom, simTo);
      if (!distance) {
        setSimResult(null);
        return;
      }
      const pricing = await simulatePriceFromDistance({
        distanceKm: distance.distanceKm,
        fuelType: "diesel",
        vehicleCategory: "confort",
        withDriver: simWithDriver,
      });
      setSimResult({
        distanceKm: distance.distanceKm,
        durationMinutes: distance.durationMinutes,
        suggestedFcfa: pricing.totalSuggestedFcfa,
      });
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700">
            Location
          </p>
          <h1 className="mt-2 text-2xl font-bold text-neutral-900 sm:text-3xl">
            Louer une voiture
          </h1>
          <p className="mt-2 text-neutral-600">
            Nouvelle offre SEN TRAJET: comparez les véhicules disponibles et réservez rapidement.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-neutral-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Vérification des véhicules
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1">
              <Clock3 className="h-3.5 w-3.5" /> Confirmation rapide
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1">
              {totalAvailable} véhicule{totalAvailable > 1 ? "s" : ""} disponible{totalAvailable > 1 ? "s" : ""}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="sm:col-span-2">
              <span className="sr-only">Rechercher un véhicule</span>
              <div className="flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-neutral-200 bg-white px-3">
                <Search className="h-4 w-4 text-neutral-400" />
                <input
                  placeholder="Marque, modèle..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                />
              </div>
            </label>
            <label>
              <span className="sr-only">Filtrer par ville</span>
              <div className="flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-neutral-200 bg-white px-3">
                <Filter className="h-4 w-4 text-neutral-400" />
                <input
                  list="cities-location"
                  placeholder="Ville"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                />
              </div>
              <datalist id="cities-location">
                {senegalCities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {loading && (
            <>
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="h-44 animate-pulse rounded-xl bg-neutral-200" />
              ))}
            </>
          )}
          {!loading && listings.map((vehicle) => (
            <Card key={vehicle.id} className="border border-neutral-200">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <Car className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
                  {vehicle.transmission}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-neutral-900">
                {vehicle.brand} {vehicle.model}
              </h2>
              <p className="mt-1 text-sm text-neutral-600">{vehicle.city}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {vehicle.seats} places · {vehicle.fuel_type} · {vehicle.mileage_km.toLocaleString("fr-FR")} km
              </p>
              <p className="mt-3 text-sm font-semibold text-neutral-900">
                {vehicle.daily_rate_fcfa.toLocaleString("fr-FR")} FCFA / jour
              </p>
              <Button className="mt-4 w-full" variant="secondary" href={`/location/${vehicle.id}`}>
                Voir le détail
              </Button>
            </Card>
          ))}
          {!loading && listings.length === 0 && (
            <Card className="border border-neutral-200 md:col-span-3">
              <h2 className="text-lg font-semibold text-neutral-900">Aucun véhicule disponible pour ce filtre</h2>
              <p className="mt-2 text-sm text-neutral-600">
                Modifiez la ville ou la recherche, ou contactez-nous pour une mise à disposition spécifique.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => {
                  setCity("");
                  setQuery("");
                }}>
                  Réinitialiser les filtres
                </Button>
                <Button href="/contact" variant="secondary">
                  Contacter SEN TRAJET
                </Button>
              </div>
            </Card>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-card sm:p-6">
          <h3 className="text-lg font-semibold text-neutral-900">
            Simuler un tarif inter-région
          </h3>
          <p className="mt-1 text-sm text-neutral-600">
            Estimation automatique selon distance routière et coûts carburant.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <input
              list="cities-sim-from"
              value={simFrom}
              onChange={(e) => setSimFrom(e.target.value)}
              placeholder="Départ"
              className="min-h-[44px] rounded-xl border-2 border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <input
              list="cities-sim-to"
              value={simTo}
              onChange={(e) => setSimTo(e.target.value)}
              placeholder="Destination"
              className="min-h-[44px] rounded-xl border-2 border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <select
              value={simWithDriver ? "with" : "without"}
              onChange={(e) => setSimWithDriver(e.target.value === "with")}
              className="min-h-[44px] rounded-xl border-2 border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="with">Avec chauffeur</option>
              <option value="without">Sans chauffeur</option>
            </select>
            <Button onClick={runSimulation} isLoading={simLoading}>
              Simuler
            </Button>
            <datalist id="cities-sim-from">
              {senegalCities.map((c) => (
                <option key={`from-${c}`} value={c} />
              ))}
            </datalist>
            <datalist id="cities-sim-to">
              {senegalCities.map((c) => (
                <option key={`to-${c}`} value={c} />
              ))}
            </datalist>
          </div>
          {simResult && (
            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm">
              <p className="font-medium text-sky-900">
                Distance: {simResult.distanceKm.toLocaleString("fr-FR")} km · ~{simResult.durationMinutes} min
              </p>
              <p className="mt-1 text-sky-800">
                Tarif conseillé: {Math.round(simResult.suggestedFcfa).toLocaleString("fr-FR")} FCFA
              </p>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-card sm:p-6">
          <h3 className="text-lg font-semibold text-neutral-900">
            Étape suivante: marketplace partenaires
          </h3>
          <p className="mt-1 text-sm text-neutral-600">
            Cette base est prête pour brancher les partenaires loueurs et les stocks de véhicules.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button href="/contact">
              Devenir partenaire location
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button href="/compte" variant="ghost">
              Retour à mon compte
            </Button>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Version actuelle: maquette fonctionnelle pour lancer le parcours client.
          </p>
        </section>
      </main>
    </div>
  );
}
