"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { getPartnerByUserId } from "@/lib/partners";
import {
  createRentalListing,
  checkServiceClassEligibility,
  getHighestEligibleServiceClass,
  getPartnerRentalListings,
  type RentalListing,
  type RentalOperatingMode,
  type RentalMode,
  type ServiceClassLevel,
  type TransportVehicleCategory,
} from "@/lib/rentals";
import { Car, CalendarClock, Wallet, CheckCircle2, Circle } from "lucide-react";

const RENTAL_SETUP_AVAILABILITY_KEY = "sentrajet_rental_setup_availability_seen";

export default function PartenaireLocationVehiculesPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [rows, setRows] = useState<RentalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [city, setCity] = useState("");
  const [dailyRate, setDailyRate] = useState("30000");
  const [mode, setMode] = useState<RentalOperatingMode>("marketplace_partner");
  const [rentalMode, setRentalMode] = useState<RentalMode>("with_driver");
  const [transportCategory, setTransportCategory] = useState<TransportVehicleCategory>("citadine");
  const [serviceClass, setServiceClass] = useState<ServiceClassLevel>("eco");
  const [fuelType, setFuelType] = useState("essence");
  const [engineSize, setEngineSize] = useState("1.6");
  const [year, setYear] = useState("");
  const [seats, setSeats] = useState("4");
  const [mileage, setMileage] = useState("0");
  const [insuranceDate, setInsuranceDate] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [hasAC, setHasAC] = useState(true);
  const [hasAirbags, setHasAirbags] = useState(true);
  const [hasSeatbelts, setHasSeatbelts] = useState(true);
  const [hasSpareTire, setHasSpareTire] = useState(true);
  const [hasSeenAvailability, setHasSeenAvailability] = useState(false);
  const isSetupFlow = searchParams.get("setup") === "1";
  const serviceClassLabel: Record<ServiceClassLevel, string> = {
    eco: "Eco",
    confort: "Confort",
    confort_plus: "Confort+",
    premium: "Premium",
    premium_plus: "Premium+",
  };

  const numericYear = year.trim() ? Number(year) : null;
  const eligibilityCheck = useMemo(
    () =>
      checkServiceClassEligibility({
        serviceClass,
        year: numericYear,
        hasAirConditioning: hasAC,
        acOperational: hasAC,
      }),
    [serviceClass, numericYear, hasAC]
  );

  useEffect(() => {
    if (eligibilityCheck.eligible) return;
    const fallbackClass = getHighestEligibleServiceClass({
      year: numericYear,
      hasAirConditioning: hasAC,
      acOperational: hasAC,
    });
    if (fallbackClass !== serviceClass) {
      setServiceClass(fallbackClass);
    }
  }, [eligibilityCheck.eligible, numericYear, hasAC, serviceClass]);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const partner = await getPartnerByUserId(user.id);
    if (!partner) {
      setRows([]);
      setLoading(false);
      return;
    }
    const data = await getPartnerRentalListings(partner.id);
    setRows(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasSeenAvailability(window.localStorage.getItem(RENTAL_SETUP_AVAILABILITY_KEY) === "1");
  }, []);

  const hasCatalog = rows.length > 0;
  const hasPricing = rows.some((row) => Number(row.daily_rate_fcfa) > 0);
  const setupSteps = [
    { label: "Catalogue publié", done: hasCatalog },
    { label: "Tarif défini", done: hasPricing },
    { label: "Disponibilités consultées", done: hasSeenAvailability },
  ] as const;
  const completedSetupSteps = setupSteps.filter((step) => step.done).length;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setError(null);
    setSuccess(null);
    const partner = await getPartnerByUserId(user.id);
    if (!partner) {
      setError("Aucun partenaire actif pour ce compte.");
      return;
    }
    setSubmitting(true);
    try {
      await createRentalListing({
        ownerProfileId: user.id,
        partnerId: partner.id,
        operatingMode: mode,
        title,
        brand,
        model,
        plateNumber,
        city,
        transportVehicleCategory: transportCategory,
        serviceClass,
        rentalMode,
        dailyRateFcfa: Number(dailyRate),
        fuelType,
        engineSizeL: engineSize ? Number(engineSize) : null,
        year: year ? Number(year) : null,
        seats: Number(seats || 4),
        mileageKm: Number(mileage || 0),
        insuranceValidUntil: insuranceDate || null,
        technicalInspectionValidUntil: visitDate || null,
        hasAirConditioning: hasAC,
        acOperational: hasAC,
        airbagsOperational: hasAirbags,
        seatbeltsOperational: hasSeatbelts,
        hasSpareTire,
      });
      setSuccess("Véhicule soumis pour validation admin.");
      setTitle("");
      setBrand("");
      setModel("");
      setPlateNumber("");
      setCity("");
      setSeats("4");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de publier le véhicule.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Flotte location</h1>
      <p className="mt-1 text-neutral-600">
        Publiez vos véhicules avec fiche technique complète et conformité.
      </p>

      {isSetupFlow && (
        <Card className="mt-4 border border-emerald-200 bg-emerald-50/40">
          <p className="text-sm font-semibold text-emerald-900">Parcours express loueur pro</p>
          <p className="mt-1 text-xs text-emerald-800/90">
            1) Ajoutez le véhicule au catalogue, 2) définissez le tarif/jour, 3) suivez les disponibilités et réservations.
          </p>
          <p className="mt-2 text-xs font-semibold text-emerald-900">
            Progression: {completedSetupSteps}/3
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(completedSetupSteps / 3) * 100}%` }}
            />
          </div>
          <div className="mt-2 grid gap-1">
            {setupSteps.map((step) => (
              <p key={step.label} className="flex items-center gap-2 text-xs text-emerald-900">
                {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                {step.label}
              </p>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Button size="sm" variant="secondary">
              <Car className="mr-1 h-4 w-4" /> Catalogue
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => document.getElementById("daily-rate-fcfa")?.focus()}
            >
              <Wallet className="mr-1 h-4 w-4" /> Tarifs
            </Button>
            <Button size="sm" variant="secondary" href="/partenaire/location/reservations?setup=1">
              <CalendarClock className="mr-1 h-4 w-4" /> Disponibilités
            </Button>
          </div>
        </Card>
      )}

      <Card className="mt-6 border border-neutral-200">
        <h2 className="text-base font-semibold text-neutral-900">Nouveau véhicule</h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Input label="Ville" value={city} onChange={(e) => setCity(e.target.value)} required />
            <Input label="Marque" value={brand} onChange={(e) => setBrand(e.target.value)} required />
            <Input label="Modèle" value={model} onChange={(e) => setModel(e.target.value)} required />
            <Input label="Plaque" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} required />
            <Input
              id="daily-rate-fcfa"
              label="Tarif/jour (FCFA)"
              type="number"
              min={1}
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
              required
            />
            <Input
              label="Places passagers"
              type="number"
              min={1}
              max={60}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              required
            />
            <Input label="Carburant" value={fuelType} onChange={(e) => setFuelType(e.target.value)} />
            <Input label="Moteur (L)" value={engineSize} onChange={(e) => setEngineSize(e.target.value)} />
            <Input label="Année" type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
            <Input label="Kilométrage" type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} />
            <Input label="Assurance valide jusqu’au" type="date" value={insuranceDate} onChange={(e) => setInsuranceDate(e.target.value)} />
            <Input label="Visite technique valide jusqu’au" type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">Catégorie véhicule</label>
              <select
                value={transportCategory}
                onChange={(e) => setTransportCategory(e.target.value as TransportVehicleCategory)}
                className="w-full min-h-[40px] rounded-xl border-2 border-neutral-300 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="citadine">Citadine</option>
                <option value="suv_berline">SUV/Berline</option>
                <option value="familiale">Familiale</option>
                <option value="minivan">Minivan</option>
                <option value="minibus">Minibus</option>
                <option value="bus">Bus</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">Classe de service</label>
              <select
                value={serviceClass}
                onChange={(e) => setServiceClass(e.target.value as ServiceClassLevel)}
                className="w-full min-h-[40px] rounded-xl border-2 border-neutral-300 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="eco">Eco</option>
                <option value="confort">Confort</option>
                <option value="confort_plus">Confort+</option>
                <option value="premium">Premium</option>
                <option value="premium_plus">Premium+</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">Mode location client</label>
              <select
                value={rentalMode}
                onChange={(e) => setRentalMode(e.target.value as RentalMode)}
                className="w-full min-h-[40px] rounded-xl border-2 border-neutral-300 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="with_driver">Avec chauffeur</option>
                <option value="without_driver">Sans chauffeur</option>
              </select>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleField label="Mode plateforme gérée" checked={mode === "platform_managed"} onChange={(v) => setMode(v ? "platform_managed" : "marketplace_partner")} />
            <ToggleField label="Climatisation opérationnelle" checked={hasAC} onChange={setHasAC} />
            <ToggleField label="Airbags opérationnels" checked={hasAirbags} onChange={setHasAirbags} />
            <ToggleField label="Ceintures fonctionnelles" checked={hasSeatbelts} onChange={setHasSeatbelts} />
            <ToggleField label="Roue de secours disponible" checked={hasSpareTire} onChange={setHasSpareTire} />
          </div>

          {!eligibilityCheck.eligible && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {eligibilityCheck.reason}
            </p>
          )}
          {eligibilityCheck.eligible && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Classe {serviceClassLabel[serviceClass]} validée pour ce véhicule.
            </p>
          )}

          <Button type="submit" isLoading={submitting} disabled={!eligibilityCheck.eligible}>
            Publier le véhicule
          </Button>
        </form>
      </Card>

      <div className="mt-6 space-y-3">
        {loading ? (
          [1, 2].map((idx) => <div key={idx} className="h-24 animate-pulse rounded-xl bg-neutral-200" />)
        ) : rows.length === 0 ? (
          <Card className="border border-neutral-200">
            <p className="text-sm text-neutral-600">Aucun véhicule location publié pour l’instant.</p>
          </Card>
        ) : (
          rows.map((vehicle) => (
            <Card key={vehicle.id} className="border border-neutral-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-900">
                    {vehicle.brand} {vehicle.model} · {vehicle.plate_number}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {vehicle.city} · {vehicle.daily_rate_fcfa.toLocaleString("fr-FR")} FCFA/jour
                  </p>
                  <p className="text-xs text-neutral-500">
                    {vehicle.transport_vehicle_category} · {vehicle.service_class} ·{" "}
                    {vehicle.rental_mode === "with_driver" ? "Avec chauffeur" : "Sans chauffeur"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Statut: {vehicle.status} · Eligibilité: {vehicle.eligibility_status}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <Car className="h-5 w-5" />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2">
      <span className="text-sm text-neutral-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
