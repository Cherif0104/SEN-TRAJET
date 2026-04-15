"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { createRequest } from "@/lib/requests";
import {
  communesByDepartment,
  departmentsByRegion,
  senegalRegions,
} from "@/data/senegalLocations";
import type { TripType } from "@/lib/trips";
import type { PickupMode } from "@/lib/pricing";
import { ArrowRightLeft, CalendarDays, Route, ShieldCheck } from "lucide-react";

const TRIP_TYPES: { value: TripType; label: string }[] = [
  { value: "interurbain_covoiturage", label: "Covoiturage interurbain" },
  { value: "interurbain_location", label: "Location privée" },
  { value: "urbain", label: "Course urbaine" },
  { value: "aeroport", label: "Transfert aéroport" },
  { value: "colis", label: "Envoi de colis" },
];

const TIME_RANGES = [
  { value: "flexible", label: "Flexible" },
  { value: "matin", label: "Matin (6h-12h)" },
  { value: "apres-midi", label: "Après-midi (12h-18h)" },
  { value: "soir", label: "Soir (18h-22h)" },
  { value: "nuit", label: "Nuit (22h-6h)" },
];

export default function DemandePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [fromRegion, setFromRegion] = useState("");
  const [fromDepartment, setFromDepartment] = useState("");
  const [fromCommune, setFromCommune] = useState("");
  const [toRegion, setToRegion] = useState("");
  const [toDepartment, setToDepartment] = useState("");
  const [toCommune, setToCommune] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [timeRange, setTimeRange] = useState("flexible");
  const [passengers, setPassengers] = useState(1);
  const [tripType, setTripType] = useState<TripType>("interurbain_covoiturage");
  const [pickupMode, setPickupMode] = useState<PickupMode>("driver_point");
  const [driverPickupPointLabel, setDriverPickupPointLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [budgetFcfa, setBudgetFcfa] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/connexion?next=" + encodeURIComponent("/demande"));
      return;
    }
    if (fromCity.trim().toLowerCase() === toCity.trim().toLowerCase()) {
      setError("Le départ et la destination doivent être différents.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const request = await createRequest({
        clientId: user.id,
        fromCity,
        toCity,
        departureDate,
        departureTimeRange: timeRange,
        passengers,
        tripType,
        pickupMode,
        driverPickupPointLabel: driverPickupPointLabel || undefined,
        notes: notes || undefined,
        budgetFcfa: budgetFcfa.trim() ? Number(budgetFcfa) : undefined,
      });
      router.push(`/demande/${request.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const canSubmit = Boolean(user && fromCity.trim() && toCity.trim() && departureDate);
  const selectedTripTypeLabel = TRIP_TYPES.find((t) => t.value === tripType)?.label ?? tripType;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 sm:px-6">
        <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">
          Créer une demande de trajet
        </h1>
        <p className="mt-1 text-neutral-600">
          Décrivez votre trajet et recevez des propositions de chauffeurs en
          temps réel.
        </p>

        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
            <Route className="mr-1 inline h-3.5 w-3.5" />
            1. Itinéraire
          </p>
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sky-800">
            <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
            2. Préférences
          </p>
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
            <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
            3. Publication
          </p>
        </div>

        <Card className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Itinéraire
              </p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-800">Départ</label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <select
                      value={fromRegion}
                      onChange={(e) => {
                        const next = e.target.value;
                        setFromRegion(next);
                        setFromDepartment("");
                        setFromCommune("");
                        setFromCity(next);
                      }}
                      className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Région</option>
                      {senegalRegions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                    <select
                      value={fromDepartment}
                      onChange={(e) => {
                        const next = e.target.value;
                        setFromDepartment(next);
                        setFromCommune("");
                        setFromCity(next || fromRegion);
                      }}
                      disabled={!fromRegion}
                      className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-neutral-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Département</option>
                      {(departmentsByRegion[fromRegion] ?? []).map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                    <select
                      value={fromCommune}
                      onChange={(e) => {
                        const next = e.target.value;
                        setFromCommune(next);
                        setFromCity(next || fromDepartment || fromRegion);
                      }}
                      disabled={!fromDepartment}
                      className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-neutral-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Commune/Arrond.</option>
                      {(communesByDepartment[fromDepartment] ?? []).map((commune) => (
                        <option key={commune} value={commune}>
                          {commune}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-800">Destination</label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <select
                      value={toRegion}
                      onChange={(e) => {
                        const next = e.target.value;
                        setToRegion(next);
                        setToDepartment("");
                        setToCommune("");
                        setToCity(next);
                      }}
                      className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Région</option>
                      {senegalRegions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                    <select
                      value={toDepartment}
                      onChange={(e) => {
                        const next = e.target.value;
                        setToDepartment(next);
                        setToCommune("");
                        setToCity(next || toRegion);
                      }}
                      disabled={!toRegion}
                      className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-neutral-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Département</option>
                      {(departmentsByRegion[toRegion] ?? []).map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                    <select
                      value={toCommune}
                      onChange={(e) => {
                        const next = e.target.value;
                        setToCommune(next);
                        setToCity(next || toDepartment || toRegion);
                      }}
                      disabled={!toDepartment}
                      className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-neutral-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Commune/Arrond.</option>
                      {(communesByDepartment[toDepartment] ?? []).map((commune) => (
                        <option key={commune} value={commune}>
                          {commune}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const prevRegion = fromRegion;
                    const prevDepartment = fromDepartment;
                    const prevCommune = fromCommune;
                    setFromCity(toCity);
                    setToCity(fromCity);
                    setFromRegion(toRegion);
                    setFromDepartment(toDepartment);
                    setFromCommune(toCommune);
                    setToRegion(prevRegion);
                    setToDepartment(prevDepartment);
                    setToCommune(prevCommune);
                  }}
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Inverser départ et destination
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Préférences
              </p>
              <div className="space-y-3">
                <Input
                  label="Date de départ"
                  type="date"
                  min={today}
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  required
                />

                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-800">
                    Créneau horaire
                  </label>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {TIME_RANGES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-800">
                    Type de trajet
                  </label>
                  <select
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value as TripType)}
                    className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {TRIP_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-800">
                    Passagers
                  </label>
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                    className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} passager{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">
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
                  Point du chauffeur
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
                  A domicile (+supplement)
                </button>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                L&apos;option domicile applique automatiquement un supplément tarifaire.
              </p>
            </div>

            {pickupMode === "driver_point" && (
              <Input
                label="Point de prise en charge propose"
                placeholder="Ex: Station Shell Mermoz"
                value={driverPickupPointLabel}
                onChange={(e) => setDriverPickupPointLabel(e.target.value)}
              />
            )}

            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm">
              <p className="font-semibold text-neutral-900">Récapitulatif de votre demande</p>
              <p className="mt-1 text-neutral-600">
                {fromCity || "Départ"} → {toCity || "Destination"} · {departureDate || "Date à définir"}
              </p>
              <p className="mt-1 text-neutral-600">
                {selectedTripTypeLabel} · {passengers} passager{passengers > 1 ? "s" : ""} ·{" "}
                {pickupMode === "home_pickup" ? "Prise à domicile (+supplément)" : "Point du chauffeur"}
              </p>
              {budgetFcfa.trim() && (
                <p className="mt-1 text-neutral-600">
                  Budget indicatif: {Number(budgetFcfa).toLocaleString("fr-FR")} FCFA
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">
                Budget estimé (optionnel)
              </label>
              <input
                type="number"
                min={0}
                className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Ex: 8000"
                value={budgetFcfa}
                onChange={(e) => setBudgetFcfa(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">
                Notes (optionnel)
              </label>
              <textarea
                className="w-full min-h-[80px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Bagages volumineux, point de rendez-vous préféré..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {!user && !authLoading && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Connectez-vous pour publier votre demande.
              </p>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={submitting}
              disabled={!canSubmit}
              className="hidden sm:inline-flex"
            >
              Publier ma demande
            </Button>

            <div className="sticky bottom-16 z-30 -mx-1 rounded-2xl border border-neutral-200 bg-white/95 p-2 shadow-lg backdrop-blur sm:hidden">
              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={submitting}
                disabled={!canSubmit}
              >
                Publier ma demande
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
