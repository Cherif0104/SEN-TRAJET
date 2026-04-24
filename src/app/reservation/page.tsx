"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, CheckCircle, Minus, Plus } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { TripLiveMap } from "@/components/map/TripLiveMap";
import { fetchTripById } from "@/lib/fetchTrip";
import { createBooking } from "@/lib/bookings";
import { useAuth } from "@/hooks/useAuth";
import {
  clampPassengerDraft,
  computeBookingTotalFcfa,
  computePassengerTotal,
} from "@/lib/bookingRules";

const PAYMENT_OPTIONS = [
  { value: "wave", label: "Wave" },
  { value: "orange_money", label: "Orange Money" },
  { value: "cash", label: "Paiement en espèces" },
] as const;

const BAGGAGE_OPTIONS = [
  { value: "none", label: "Aucun" },
  { value: "light", label: "Léger (sac à dos)" },
  { value: "medium", label: "Moyen (valise cabine)" },
  { value: "large", label: "Volumineux (valise soute)" },
] as const;

const RESERVATION_TIMELINE = [
  "Demande envoyée",
  "Confirmation chauffeur",
  "Course en route",
  "Arrivée",
];

function CounterField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600">{label}</label>
      <div className="flex min-h-[48px] items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-2 py-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-700 shadow-sm transition active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[56px] text-center text-lg font-bold text-neutral-900">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-sm transition active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ReservationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const trajetId = searchParams.get("trajet") ?? "";

  const [trip, setTrip] = useState<Awaited<ReturnType<typeof fetchTripById>>>(null);
  const [tripLoading, setTripLoading] = useState(true);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [adultPassengers, setAdultPassengers] = useState(1);
  const [childPassengers, setChildPassengers] = useState(0);
  const [paymentMode, setPaymentMode] = useState<(typeof PAYMENT_OPTIONS)[number]["value"]>("wave");
  const [baggageType, setBaggageType] = useState<(typeof BAGGAGE_OPTIONS)[number]["value"]>("none");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passengers = computePassengerTotal(adultPassengers, childPassengers);

  useEffect(() => {
    if (!trajetId) {
      setTripLoading(false);
      return;
    }
    setTripLoading(true);
    fetchTripById(trajetId).then((data) => {
      setTrip(data);
      setTripLoading(false);
    });
  }, [trajetId]);

  useEffect(() => {
    if (trip) {
      const clamped = clampPassengerDraft({
        adultPassengers,
        childPassengers,
        availableSeats: trip.availableSeats,
      });
      if (clamped.adultPassengers !== adultPassengers) setAdultPassengers(clamped.adultPassengers);
      if (clamped.childPassengers !== childPassengers) setChildPassengers(clamped.childPassengers);
    }
  }, [trip, adultPassengers, childPassengers]);

  useEffect(() => {
    const maxChildren = Math.max(0, (trip?.availableSeats ?? 4) - adultPassengers);
    if (childPassengers > maxChildren) {
      setChildPassengers(maxChildren);
    }
  }, [adultPassengers, childPassengers, trip?.availableSeats]);

  const totalFcfa = trip ? computeBookingTotalFcfa(trip.priceFcfa, passengers) : 0;
  const totalFormatted = totalFcfa.toLocaleString("fr-FR");
  const departureLabel = trip ? (trip.fromPlace || trip.fromCity) : "";
  const arrivalLabel = trip ? (trip.toPlace || trip.toCity) : "";
  const selectedPaymentLabel = PAYMENT_OPTIONS.find((p) => p.value === paymentMode)?.label ?? "Mode inconnu";
  const trackingEnabled = Boolean(confirmed && user?.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!user || !trip || !trip.driverId) {
      setSubmitError("Vous devez être connecté pour réserver.");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      await createBooking({
        tripId: trip.id,
        clientId: user.id,
        driverId: trip.driverId,
        passengers,
        meetingPoint: meetingPoint || undefined,
        paymentMethod: paymentMode,
        baggageType,
        adultPassengers,
        childPassengers,
        totalFcfa,
      });
      setConfirmed(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erreur lors de la réservation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (tripLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-32 rounded bg-neutral-200" />
            <div className="h-10 w-full rounded bg-neutral-200" />
            <div className="h-40 rounded-xl bg-neutral-200" />
          </div>
        </main>
      </div>
    );
  }

  if (!trajetId || !trip) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
          <Card className="py-12 text-center">
            <h2 className="text-lg font-semibold text-neutral-900">
              Trajet introuvable
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Sélectionnez un trajet depuis la recherche pour réserver.
            </p>
            <Button href="/recherche" className="mt-4">
              Rechercher un trajet
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
          <Card className="py-12 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-secondary" />
            <h2 className="mt-4 text-xl font-bold text-neutral-900">
              Réservation confirmée
            </h2>
            <p className="mt-2 text-neutral-600">
              Total : <strong>{totalFormatted} FCFA</strong>
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {departureLabel} → {arrivalLabel} · {trip.departureTime}
            </p>
            <div className="mx-auto mt-4 max-w-md rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
              <p className="font-semibold">Paiement sélectionné: {selectedPaymentLabel}</p>
              <p className="mt-1">
                Statut: réservation créée. Le règlement est confirmé selon le mode choisi.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button href="/compte/reservations">Mes réservations</Button>
              <Button href={`/trajet/${trajetId}`} variant="secondary">Voir le trajet</Button>
              <Button variant="ghost" href="/recherche">
                Trouver un autre trajet
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4 sm:px-6 sm:py-5">
        <Link
          href={`/trajet/${trajetId}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au trajet
        </Link>

        <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">
          {step === "form"
            ? "Finaliser la réservation"
            : "Confirmer la réservation"}
        </h1>

        <TripLiveMap
          tripId={trajetId}
          fromCity={trip.fromCity}
          toCity={trip.toCity}
          userRole="client"
          trackingEnabled={trackingEnabled}
          className="mt-3 sm:mt-4"
        />

        <section className="mt-3 rounded-3xl border border-neutral-200 bg-white p-4 shadow-card sm:mt-4">
          <p className="text-sm font-semibold text-neutral-900">Progression de votre réservation</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {RESERVATION_TIMELINE.map((item, index) => {
              const activeIndex = step === "form" ? 0 : 1;
              const active = index <= activeIndex;
              return (
                <div
                  key={item}
                  className={`rounded-xl px-3 py-2 text-xs font-medium ${
                    active ? "bg-primary/10 text-primary" : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {index + 1}. {item}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-3 rounded-3xl border border-neutral-200 bg-white p-4 shadow-card sm:mt-4">
          <h3 className="font-semibold text-neutral-900">Récapitulatif</h3>
          <div className="mt-3 flex gap-3">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <div className="my-1 min-h-[20px] w-px flex-1 bg-neutral-300" />
              <div className="h-3 w-3 rounded-full bg-secondary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-neutral-900">{departureLabel}</p>
              <p className="text-sm text-neutral-500">{trip.departureTime}</p>
              <div className="my-2 h-px bg-neutral-100" />
              <p className="font-medium text-neutral-900">{arrivalLabel}</p>
              <p className="text-sm text-neutral-500">{trip.arrivalTime}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-neutral-600">
            Chauffeur : {trip.driverName}
          </p>
        </section>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 sm:mt-5 sm:space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-800">Passagers</label>
              <div className="grid gap-3 sm:grid-cols-2">
                <CounterField
                  label="Adultes"
                  value={adultPassengers}
                  min={1}
                  max={Math.max(1, trip?.availableSeats ?? 4)}
                  onChange={(next) => setAdultPassengers(next)}
                />
                <CounterField
                  label="Enfants"
                  value={childPassengers}
                  min={0}
                  max={Math.max(0, (trip?.availableSeats ?? 4) - adultPassengers)}
                  onChange={(next) => setChildPassengers(next)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-800">Mode de paiement</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as (typeof PAYMENT_OPTIONS)[number]["value"])}
                  className="w-full min-h-[44px] rounded-button border-2 border-neutral-300 bg-white px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {PAYMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-800">Bagages</label>
                <select
                  value={baggageType}
                  onChange={(e) => setBaggageType(e.target.value as (typeof BAGGAGE_OPTIONS)[number]["value"])}
                  className="w-full min-h-[44px] rounded-button border-2 border-neutral-300 bg-white px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {BAGGAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Input
              label="Point de rencontre (optionnel)"
              placeholder="Ex: Devant la station Shell"
              value={meetingPoint}
              onChange={(e) => setMeetingPoint(e.target.value)}
            />
            <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-card">
              <h3 className="font-semibold text-neutral-900">Tarif</h3>
              <div className="mt-2 space-y-1 text-sm">
                <p className="flex justify-between">
                  <span className="text-neutral-600">
                    {trip.priceFcfa.toLocaleString("fr-FR")} FCFA × {passengers} passager{passengers > 1 ? "s" : ""}
                  </span>
                  <span>{totalFormatted} FCFA</span>
                </p>
              </div>
              <p className="mt-3 flex justify-between border-t border-neutral-200 pt-3 text-lg font-bold">
                <span>Total</span>
                <span>{totalFormatted} FCFA</span>
              </p>
            </section>
            <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-card">
              <h3 className="font-semibold text-neutral-900">Paiement</h3>
              <p className="mt-2 text-sm text-neutral-600">
                Mode choisi: <span className="font-medium text-neutral-900">{selectedPaymentLabel}</span>
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Vous validez le mode maintenant, puis le statut passe en confirmé après création de réservation.
              </p>
            </section>
            {!user && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Vous serez redirigé vers la connexion pour réserver.
              </p>
            )}
            <Button type="submit" fullWidth size="lg" disabled={!user}>
              Continuer vers la confirmation
            </Button>
            {!user && (
              <Button type="button" variant="secondary" fullWidth href={`/connexion?next=${encodeURIComponent(`/reservation?trajet=${trajetId}`)}`}>
                Se connecter pour réserver
              </Button>
            )}
          </form>
        ) : (
          <div className="mt-4 space-y-3.5 sm:mt-5 sm:space-y-4">
            {submitError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </p>
            )}
            <div className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
              <p>
                <strong>Passagers :</strong> {passengers} ({adultPassengers} adulte{adultPassengers > 1 ? "s" : ""}, {childPassengers} enfant{childPassengers > 1 ? "s" : ""})
              </p>
              <p className="mt-1">
                <strong>Paiement :</strong> {PAYMENT_OPTIONS.find((p) => p.value === paymentMode)?.label}
              </p>
              <p className="mt-1">
                <strong>Bagages :</strong> {BAGGAGE_OPTIONS.find((b) => b.value === baggageType)?.label}
              </p>
              {meetingPoint && (
                <p className="mt-1 flex items-center gap-1">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <strong>Point de rencontre :</strong> {meetingPoint}
                </p>
              )}
            </div>
            <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-card">
              <p className="flex justify-between text-lg font-bold">
                <span>Total à régler</span>
                <span>{totalFormatted} FCFA</span>
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                Paiement sélectionné: {selectedPaymentLabel}
              </p>
            </section>
            <Button
              fullWidth
              size="lg"
              onClick={handleConfirm}
              isLoading={submitting}
              disabled={!user}
            >
              Confirmer la réservation
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setStep("form")}
            >
              Modifier
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function ReservationFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 rounded bg-neutral-200" />
          <div className="h-10 w-full rounded bg-neutral-200" />
          <div className="h-40 rounded-xl bg-neutral-200" />
        </div>
      </main>
    </div>
  );
}

export default function ReservationPage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Suspense fallback={<ReservationFallback />}>
        <ReservationContent />
      </Suspense>
    </div>
  );
}
