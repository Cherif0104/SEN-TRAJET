"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import {
  confirmRentalBookingPayment,
  computeRentalDays,
  computeRentalEstimateForListing,
  createRentalBooking,
  getRentalListingById,
  type RentalBooking,
  type RentalListing,
  validateRentalPeriod,
} from "@/lib/rentals";

function ReserverLocationPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const listingId = params.get("listing") ?? "";
  const { user, loading: authLoading } = useAuth();

  const [listing, setListing] = useState<RentalListing | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<RentalBooking | null>(null);

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
    return computeRentalEstimateForListing(listing, days);
  }, [listing, days]);

  const today = new Date().toISOString().slice(0, 10);

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
    const periodError = validateRentalPeriod(startDate, endDate);
    if (periodError) {
      setError(periodError);
      return;
    }
    setSubmitting(true);
    try {
      const booking = await createRentalBooking({
        listingId: listing.id,
        clientId: user.id,
        startDate,
        endDate,
        notes,
      });
      setCreatedBooking(booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer la réservation.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!user || !createdBooking) return;
    setError(null);
    setConfirmingPayment(true);
    try {
      await confirmRentalBookingPayment({
        bookingId: createdBooking.id,
        clientId: user.id,
      });
      router.push("/compte/locations?created=1&paid=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de confirmer le paiement.");
    } finally {
      setConfirmingPayment(false);
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

  if (createdBooking) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
          <h1 className="text-2xl font-bold text-neutral-900">Paiement de votre location</h1>
          <p className="mt-1 text-neutral-600">
            Votre demande est créée avec le statut <strong>Paiement en attente</strong>.
          </p>
          <Card className="mt-6 rounded-3xl">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <p className="text-sm text-neutral-600">Montant total</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {createdBooking.total_fcfa.toLocaleString("fr-FR")} FCFA
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Réservation: {createdBooking.total_days} jour{createdBooking.total_days > 1 ? "s" : ""} ·
              du {createdBooking.start_date} au {createdBooking.end_date}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button onClick={handleConfirmPayment} isLoading={confirmingPayment}>
                Confirmer paiement (simulation)
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push("/compte/locations?created=1")}
              >
                Payer plus tard
              </Button>
            </div>
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
          Choisissez les dates, vérifiez le montant et confirmez votre demande.
        </p>

        <Card className="mt-6 rounded-3xl">
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
              Confirmer ma demande de location
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
