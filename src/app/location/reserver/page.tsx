"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import {
  computeRentalDays,
  createRentalBooking,
  getRentalListingById,
  simulateRentalPrice,
  type RentalListing,
} from "@/lib/rentals";
import { estimateTripDistance } from "@/lib/distancePricing";
import { senegalCities } from "@/data/senegalLocations";

function ReserverLocationPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const listingId = params.get("listing") ?? "";
  const { user, loading: authLoading } = useAuth();

  const [listing, setListing] = useState<RentalListing | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [withDriver, setWithDriver] = useState(true);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [pricingSimulation, setPricingSimulation] = useState<{
    suggestedDailyRateFcfa: number;
    suggestedTotalFcfa: number;
  } | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId) return;
    let mounted = true;
    getRentalListingById(listingId).then((row) => {
      if (mounted) setListing(row);
    });
    return () => {
      mounted = false;
    };
  }, [listingId]);

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return computeRentalDays(startDate, endDate);
  }, [startDate, endDate]);

  const estimate = useMemo(() => {
    if (!listing || days <= 0) return null;
    const subtotal = listing.daily_rate_fcfa * days;
    const total = subtotal + listing.deposit_fcfa;
    return { subtotal, total };
  }, [listing, days]);

  const today = new Date().toISOString().slice(0, 10);

  const runRouteSimulation = async () => {
    if (!listing || !destinationCity.trim()) return;
    setDistanceLoading(true);
    try {
      const distance = await estimateTripDistance(listing.city, destinationCity);
      if (!distance) {
        setDistanceKm(null);
        setDurationMinutes(null);
        setPricingSimulation(null);
        return;
      }
      setDistanceKm(distance.distanceKm);
      setDurationMinutes(distance.durationMinutes);
      const simulation = await simulateRentalPrice({
        distanceKm: distance.distanceKm,
        fuelType: listing.fuel_type || "essence",
        vehicleCategory:
          listing.metadata?.vehicle_category && typeof listing.metadata.vehicle_category === "string"
            ? listing.metadata.vehicle_category
            : "confort",
        withDriver,
        days: days || 1,
      });
      setPricingSimulation({
        suggestedDailyRateFcfa: simulation.suggestedDailyRateFcfa,
        suggestedTotalFcfa: simulation.suggestedTotalFcfa,
      });
    } finally {
      setDistanceLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      router.push(`/connexion?next=${encodeURIComponent(`/location/reserver?listing=${listingId}`)}`);
      return;
    }
    if (!listing) {
      setError("Véhicule introuvable.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Choisissez une période de location.");
      return;
    }
    if (days <= 0) {
      setError("La période de location est invalide.");
      return;
    }
    setSubmitting(true);
    try {
      await createRentalBooking({
        listingId: listing.id,
        clientId: user.id,
        startDate,
        endDate,
        notes,
      });
      router.push("/compte/locations?created=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer la réservation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
          <Card>
            <h1 className="text-lg font-semibold text-neutral-900">Connexion requise</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Connectez-vous pour finaliser votre réservation de location.
            </p>
            <Button href={`/connexion?next=${encodeURIComponent(`/location/reserver?listing=${listingId}`)}`} className="mt-4">
              Se connecter
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-neutral-900">Réserver une location</h1>
        <p className="mt-1 text-neutral-600">
          Confirmez les dates, payez votre réservation et nous vous recontactons sous 24h pour validation finale.
        </p>

        <Card className="mt-6">
          {listing ? (
            <>
              <p className="text-sm text-neutral-600">Véhicule</p>
              <h2 className="text-lg font-semibold text-neutral-900">
                {listing.brand} {listing.model} · {listing.city}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {listing.daily_rate_fcfa.toLocaleString("fr-FR")} FCFA / jour
              </p>
            </>
          ) : (
            <p className="text-sm text-neutral-500">Chargement du véhicule…</p>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Date de début"
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <Input
                label="Date de fin"
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">Destination prévue (optionnel)</label>
              <input
                list="cities-rental-destination"
                className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Ex: Saint-Louis"
                value={destinationCity}
                onChange={(e) => setDestinationCity(e.target.value)}
              />
              <datalist id="cities-rental-destination">
                {senegalCities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">Option chauffeur</label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setWithDriver(true)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm ${
                    withDriver ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-neutral-300 bg-white text-neutral-700"
                  }`}
                >
                  Avec chauffeur
                </button>
                <button
                  type="button"
                  onClick={() => setWithDriver(false)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm ${
                    !withDriver ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-neutral-300 bg-white text-neutral-700"
                  }`}
                >
                  Sans chauffeur
                </button>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={runRouteSimulation}
              isLoading={distanceLoading}
              disabled={!listing || !destinationCity.trim()}
            >
              Simuler la tarification du trajet
            </Button>

            {distanceKm != null && pricingSimulation && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm">
                <p className="font-medium text-sky-900">
                  Distance estimée: {distanceKm.toLocaleString("fr-FR")} km
                  {durationMinutes != null ? ` · ~${durationMinutes} min` : ""}
                </p>
                <p className="mt-1 text-sky-800">
                  Tarif conseillé / jour: {pricingSimulation.suggestedDailyRateFcfa.toLocaleString("fr-FR")} FCFA
                </p>
                <p className="text-sky-800">
                  Tarif conseillé total: {pricingSimulation.suggestedTotalFcfa.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">Notes (optionnel)</label>
              <textarea
                className="min-h-[100px] w-full rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Heure souhaitée, besoins spécifiques..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {estimate && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
                <p className="text-emerald-800">Durée: {days} jour{days > 1 ? "s" : ""}</p>
                <p className="text-neutral-700">
                  Sous-total: {estimate.subtotal.toLocaleString("fr-FR")} FCFA
                </p>
                <p className="text-neutral-700">
                  Dépôt de garantie: {(listing?.deposit_fcfa ?? 0).toLocaleString("fr-FR")} FCFA
                </p>
                <p className="mt-1 font-semibold text-neutral-900">
                  Total estimé: {estimate.total.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
            )}

            <Button type="submit" isLoading={submitting} disabled={!listing || !user}>
              Payer et confirmer la réservation
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}

export default function ReserverLocationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-neutral-50">
          <Header />
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
            <div className="h-40 animate-pulse rounded-xl bg-neutral-200" />
          </main>
        </div>
      }
    >
      <ReserverLocationPageContent />
    </Suspense>
  );
}
