"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Car, ShieldCheck, Clock3, Search, Filter } from "lucide-react";
import {
  getRentalListings,
  type RentalListing,
  type RentalMode,
  type ServiceClassLevel,
  type TransportVehicleCategory,
} from "@/lib/rentals";
import { senegalCities } from "@/data/senegalLocations";

export default function LocationPage() {
  const [listings, setListings] = useState<RentalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TransportVehicleCategory | "">("");
  const [serviceClass, setServiceClass] = useState<ServiceClassLevel | "">("");
  const [rentalMode, setRentalMode] = useState<RentalMode | "">("");

  const categoryLabel: Record<TransportVehicleCategory, string> = {
    citadine: "Citadine",
    suv_berline: "SUV/Berline",
    familiale: "Familiale",
    minivan: "Minivan",
    minibus: "Minibus",
    bus: "Bus",
  };
  const classLabel: Record<ServiceClassLevel, string> = {
    eco: "Eco",
    confort: "Confort",
    confort_plus: "Confort+",
    premium: "Premium",
    premium_plus: "Premium+",
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getRentalListings({
      status: "active",
      city: city || undefined,
      category: category || undefined,
      serviceClass: serviceClass || undefined,
      rentalMode: rentalMode || undefined,
      q: query || undefined,
    })
      .then((rows) => {
        if (mounted) setListings(rows);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [city, query, category, serviceClass, rentalMode]);

  const totalAvailable = useMemo(() => listings.length, [listings.length]);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700">
            Location
          </p>
          <h1 className="mt-2 text-2xl font-bold text-neutral-900 sm:text-3xl">
            Louer une voiture
          </h1>
          <p className="mt-2 text-neutral-600">
            Comparez les véhicules disponibles et réservez rapidement.
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
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <label className="sm:col-span-2 lg:col-span-1">
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
            <label className="lg:col-span-1">
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
            <label className="lg:col-span-1">
              <span className="sr-only">Filtrer par catégorie</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TransportVehicleCategory | "")}
                className="min-h-[44px] w-full rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:border-primary focus:outline-none"
              >
                <option value="">Toutes catégories</option>
                <option value="citadine">Citadine</option>
                <option value="suv_berline">SUV/Berline</option>
                <option value="familiale">Familiale</option>
                <option value="minivan">Minivan</option>
                <option value="minibus">Minibus</option>
                <option value="bus">Bus</option>
              </select>
            </label>
            <label className="lg:col-span-1">
              <span className="sr-only">Filtrer par classe</span>
              <select
                value={serviceClass}
                onChange={(e) => setServiceClass(e.target.value as ServiceClassLevel | "")}
                className="min-h-[44px] w-full rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:border-primary focus:outline-none"
              >
                <option value="">Toutes classes</option>
                <option value="eco">Eco</option>
                <option value="confort">Confort</option>
                <option value="confort_plus">Confort+</option>
                <option value="premium">Premium</option>
                <option value="premium_plus">Premium+</option>
              </select>
            </label>
            <label className="lg:col-span-1">
              <span className="sr-only">Filtrer par mode</span>
              <select
                value={rentalMode}
                onChange={(e) => setRentalMode(e.target.value as RentalMode | "")}
                className="min-h-[44px] w-full rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:border-primary focus:outline-none"
              >
                <option value="">Avec ou sans chauffeur</option>
                <option value="with_driver">Avec chauffeur</option>
                <option value="without_driver">Sans chauffeur</option>
              </select>
            </label>
          </div>
        </section>

        <section className="mt-5 grid gap-3.5 md:mt-6 md:gap-4 md:grid-cols-3">
          {loading && (
            <>
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="h-44 animate-pulse rounded-xl bg-neutral-200" />
              ))}
            </>
          )}
          {!loading && listings.map((vehicle) => (
            <Card key={vehicle.id} className="rounded-3xl border border-neutral-200">
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
              <p className="mt-1 text-xs text-neutral-600">
                {categoryLabel[vehicle.transport_vehicle_category]} · {classLabel[vehicle.service_class]} ·{" "}
                {vehicle.rental_mode === "with_driver" ? "Avec chauffeur" : "Sans chauffeur"}
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
            <Card className="rounded-3xl border border-neutral-200 md:col-span-3">
              <h2 className="text-lg font-semibold text-neutral-900">Aucun véhicule disponible pour ce filtre</h2>
              <p className="mt-2 text-sm text-neutral-600">
                Modifiez la ville ou la recherche, ou contactez-nous pour une mise à disposition spécifique.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => {
                  setCity("");
                  setQuery("");
                  setCategory("");
                  setServiceClass("");
                  setRentalMode("");
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

        <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-5 shadow-card sm:mt-8 sm:p-6">
          <h3 className="text-lg font-semibold text-neutral-900">
            Besoin d&apos;aide pour votre location ?
          </h3>
          <p className="mt-1 text-sm text-neutral-600">
            Notre équipe vous accompagne pour choisir le véhicule adapté et finaliser rapidement votre réservation.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button href="/contact" variant="secondary">
              Contacter SEN TRAJET
            </Button>
            <Button href="/compte" variant="ghost">
              Retour à mon compte
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
