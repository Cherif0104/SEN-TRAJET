"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { createTrip } from "@/lib/trips-create";
import { computePriceBreakdown, type PickupMode } from "@/lib/pricing";
import { senegalCities } from "@/data/senegalLocations";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user || !profile) return;
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
      <h1 className="text-xl font-bold text-neutral-900">
        Publier un trajet
      </h1>
      <p className="mt-1 text-neutral-600">
        Proposez un trajet en quelques etapes: axe, horaires, prix et mode de prise en charge.
      </p>
      <Card className="mt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-600">Itinéraire</p>
            <div className="space-y-3">
              <Input
                label="Ville de départ"
                placeholder="Dakar"
                value={depart}
                onChange={(e) => setDepart(e.target.value)}
                list="cities-depart"
                required
              />
              <Input
                label="Ville d&apos;arrivée"
                placeholder="Thiès"
                value={arrivee}
                onChange={(e) => setArrivee(e.target.value)}
                list="cities-arrivee"
                required
              />
            </div>
          </div>
          <datalist id="cities-depart">
            {senegalCities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <datalist id="cities-arrivee">
            {senegalCities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
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
            <select
              value={places}
              onChange={(e) => setPlaces(Number(e.target.value))}
              className="w-full min-h-[44px] rounded-button border-2 border-neutral-300 bg-white px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
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
                Prise domicile
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
          <Button type="submit" fullWidth isLoading={loading}>
            Publier le trajet
          </Button>
        </form>
      </Card>
    </>
  );
}
