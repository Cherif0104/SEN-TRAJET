"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { LocationSmartInput } from "@/components/map/LocationSmartInput";
import { useAuth } from "@/hooks/useAuth";
import { createTrip } from "@/lib/trips-create";
import { computePriceBreakdown, type PickupMode } from "@/lib/pricing";
import { getDriverPublishingReadiness, type DriverPublishingReadiness } from "@/lib/driverReadiness";
import {
  getDriverTripPublishingState,
  TRIP_PUBLICATION_COST_FCFA,
  type DriverTripPublishingState,
} from "@/lib/tripPublishing";
import { ArrowRightLeft, CircleDollarSign, Route, ShieldCheck, Minus, Plus, CheckCircle2, CircleAlert } from "lucide-react";

function SeatCounter({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
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
  );
}

export default function NouveauTrajetPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState("");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [places, setPlaces] = useState(4);
  const [prix, setPrix] = useState("");
  const [pickupMode, setPickupMode] = useState<PickupMode>("driver_point");
  const [driverPickupPointLabel, setDriverPickupPointLabel] = useState("");
  const [homePickupExtraFcfa, setHomePickupExtraFcfa] = useState("2000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<DriverPublishingReadiness | null>(null);
  const [publishingState, setPublishingState] = useState<DriverTripPublishingState | null>(null);
  const today = new Date().toISOString().split("T")[0];
  const priceNum = Number(prix);
  const homeExtraNum = Number(homePickupExtraFcfa);
  const totalPreview =
    Number.isFinite(priceNum) && priceNum > 0
      ? priceNum + (pickupMode === "home_pickup" && Number.isFinite(homeExtraNum) && homeExtraNum > 0 ? homeExtraNum : 0)
      : null;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/connexion");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user?.id) return;
    getDriverPublishingReadiness(user.id)
      .then(setReadiness)
      .catch(() => setReadiness(null));
    getDriverTripPublishingState(user.id)
      .then(setPublishingState)
      .catch(() => setPublishingState(null));
  }, [user?.id]);

  useEffect(() => {
    if (!profile?.city?.trim()) return;
    setDepart((prev) => (prev.trim() ? prev : profile.city!.trim()));
  }, [profile?.city]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user || !profile) return;
    if (!readiness?.ready) {
      setError("Votre compte chauffeur n'est pas encore conforme pour publier un trajet.");
      return;
    }
    if (publishingState && !publishingState.canPublish) {
      setError("Découvert maximum atteint. Rechargez votre wallet pour publier un nouveau trajet.");
      return;
    }
    if (depart.trim().toLowerCase() === arrivee.trim().toLowerCase()) {
      setError("Le départ et l'arrivée doivent être différents.");
      return;
    }
    const priceNum = Number(prix);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError("Prix invalide.");
      return;
    }
    const homeExtraNum = Number(homePickupExtraFcfa);
    if (!Number.isFinite(homeExtraNum) || homeExtraNum < 0) {
      setError("Supplement domicile invalide.");
      return;
    }
    setLoading(true);
    try {
      const departureTime = new Date(`${date}T${heure}:00`).toISOString();
      const breakdown = await computePriceBreakdown({
        basePriceFcfa: priceNum,
        pickupMode,
        homePickupExtraFcfa: homeExtraNum,
      });
      await createTrip({
        driverId: user.id,
        driverName: profile.full_name || user.email?.split("@")[0] || "Chauffeur",
        fromCity: depart.trim(),
        toCity: arrivee.trim(),
        departureTime,
        totalSeats: places,
        availableSeats: places,
        priceFcfa: breakdown.basePriceFcfa,
        pickupMode,
        homePickupExtraFcfa: homeExtraNum,
        driverPickupPointLabel: pickupMode === "driver_point" ? driverPickupPointLabel : undefined,
      });
      router.push("/chauffeur?published=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la publication.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-neutral-200" />
        <div className="h-64 rounded-xl bg-neutral-200" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">
        Publier un trajet
      </h1>
      <p className="mt-1 text-neutral-600">
        Proposez un trajet en quelques étapes : axe, horaires, prix et mode de prise en charge.
      </p>
      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
          <Route className="mr-1 inline h-3.5 w-3.5" />
          1. Itinéraire
        </p>
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sky-800">
          <CircleDollarSign className="mr-1 inline h-3.5 w-3.5" />
          2. Prix & places
        </p>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
          3. Publication
        </p>
      </div>
      {readiness && (
        <Card className={`mt-4 border ${readiness.ready ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"}`}>
          <p className={`text-sm font-semibold ${readiness.ready ? "text-emerald-900" : "text-amber-900"}`}>
            Conformité chauffeur: {Math.round(readiness.completion * 100)}%
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
            <div
              className={`h-full rounded-full transition-all ${readiness.ready ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${readiness.completion * 100}%` }}
            />
          </div>
          <div className="mt-2 space-y-1">
            {readiness.steps.map((step) => (
              <p key={step.key} className={`flex items-center gap-2 text-xs ${step.done ? "text-emerald-900" : "text-amber-900"}`}>
                {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
                {step.label}
              </p>
            ))}
          </div>
          {!readiness.ready && (
            <Button size="sm" variant="secondary" href="/chauffeur/profil" className="mt-3">
              Compléter mon profil chauffeur
            </Button>
          )}
        </Card>
      )}
      {publishingState && (
        <Card className="mt-3 border border-sky-200 bg-sky-50/50">
          <p className="text-sm font-semibold text-sky-900">Règle publication trajet</p>
          <p className="mt-1 text-xs text-sky-800">
            {publishingState.freeTripsRemaining > 0
              ? `${publishingState.freeTripsRemaining} trajet(s) gratuits restants sur 20.`
              : `Au-delà des 20 trajets: ${TRIP_PUBLICATION_COST_FCFA.toLocaleString("fr-FR")} FCFA par publication (1 crédit).`}
          </p>
          <p className="mt-1 text-xs text-sky-800">
            Solde wallet: {publishingState.walletBalanceCredits} crédit(s) · Découvert restant:{" "}
            {publishingState.loanRemainingTrips} trajet(s).
          </p>
        </Card>
      )}
      <Card className="mt-5 rounded-3xl sm:mt-6">
        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-600">Itinéraire</p>
            <div className="space-y-3">
              <LocationSmartInput
                label="Ville de départ"
                placeholder="Dakar"
                value={depart}
                onChange={setDepart}
                listId="chauffeur-trajet-cities-depart"
              />
              <LocationSmartInput
                label="Ville d&apos;arrivée"
                placeholder="Thiès"
                value={arrivee}
                onChange={setArrivee}
                listId="chauffeur-trajet-cities-arrivee"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  setDepart(arrivee);
                  setArrivee(depart);
                }}
              >
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Inverser départ et arrivée
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Input
              label="Heure de départ"
              type="time"
              value={heure}
              onChange={(e) => setHeure(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-800">
              Places disponibles
            </label>
            <SeatCounter value={places} min={1} max={7} onChange={setPlaces} />
          </div>
          <Input
            label="Prix par personne (FCFA)"
            type="number"
            placeholder="3500"
            min={1}
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
            required
          />
          {totalPreview !== null && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Tarif affiche au client: <strong>{totalPreview.toLocaleString("fr-FR")} FCFA</strong>
              {pickupMode === "home_pickup" ? " (inclut le supplément domicile)." : "."}
            </p>
          )}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm">
            <p className="font-semibold text-neutral-900">Récapitulatif publication</p>
            <p className="mt-1 text-neutral-600">
              {depart || "Départ"} → {arrivee || "Arrivée"} · {date || "Date"} {heure || "Heure"}
            </p>
            <p className="mt-1 text-neutral-600">
              {places} place{places > 1 ? "s" : ""} ·{" "}
              {prix ? `${Number(prix).toLocaleString("fr-FR")} FCFA / pers.` : "Prix à définir"} ·{" "}
              {pickupMode === "home_pickup" ? "Domicile avec supplément" : "Point chauffeur"}
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-800">
              Mode de prise en charge
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPickupMode("driver_point")}
                className={`rounded-xl border px-3 py-2 text-left text-sm ${
                  pickupMode === "driver_point"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-neutral-300 bg-white text-neutral-700"
                }`}
              >
                Point chauffeur
              </button>
              <button
                type="button"
                onClick={() => setPickupMode("home_pickup")}
                className={`rounded-xl border px-3 py-2 text-left text-sm ${
                  pickupMode === "home_pickup"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-neutral-300 bg-white text-neutral-700"
                }`}
              >
                Prise à domicile
              </button>
            </div>
          </div>
          {pickupMode === "driver_point" ? (
            <Input
              label="Point de prise en charge chauffeur"
              placeholder="Ex: Station Shell, Mairie..."
              value={driverPickupPointLabel}
              onChange={(e) => setDriverPickupPointLabel(e.target.value)}
              required
            />
          ) : (
            <Input
              label="Supplement domicile (FCFA)"
              type="number"
              min={0}
              value={homePickupExtraFcfa}
              onChange={(e) => setHomePickupExtraFcfa(e.target.value)}
            />
          )}
          <Button
            type="submit"
            fullWidth
            isLoading={loading}
            disabled={(readiness?.ready === false) || (publishingState?.canPublish === false)}
            className="hidden md:inline-flex"
          >
            Publier le trajet
          </Button>
          <div className="sticky bottom-20 z-30 -mx-1 rounded-2xl border border-neutral-200 bg-white/95 p-2 shadow-lg backdrop-blur md:hidden">
            <Button
              type="submit"
              fullWidth
              isLoading={loading}
              disabled={(readiness?.ready === false) || (publishingState?.canPublish === false)}
            >
              Publier le trajet
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
