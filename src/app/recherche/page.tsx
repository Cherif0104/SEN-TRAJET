"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, SlidersHorizontal, Search, MapPin, Loader2, Calendar, ArrowRightLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TripTypeBadge } from "@/components/ui/TripTypeBadge";
import { VehicleBadge } from "@/components/ui/VehicleBadge";
import { searchTrips, type Trip } from "@/lib/trips";
import type { PickupMode } from "@/lib/pricing";
import { reverseGeocode } from "@/lib/geocode";
import {
  communesByDepartment,
  departmentsByRegion,
  senegalCities,
  senegalRegions,
} from "@/data/senegalLocations";

const CATEGORY_OPTIONS = [
  { value: "", label: "Toutes catégories" },
  { value: "Eco", label: "Eco" },
  { value: "Confort", label: "Confort" },
  { value: "Premium", label: "Premium" },
  { value: "Standard", label: "Standard" },
];

function parseAvailableSeats(seats: string): number {
  const m = seats.match(/^(\d+)\/\d+$/);
  return m ? parseInt(m[1], 10) : 0;
}

type LocationHierarchy = {
  region: string;
  department: string;
  commune: string;
};

function inferLocationHierarchy(value: string): LocationHierarchy {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return { region: "", department: "", commune: "" };

  for (const [department, communes] of Object.entries(communesByDepartment)) {
    const commune = communes.find((c) => c.toLowerCase() === normalized);
    if (commune) {
      const region = Object.entries(departmentsByRegion).find(([, deps]) =>
        deps.includes(department)
      )?.[0];
      return { region: region ?? "", department, commune };
    }
  }

  for (const [region, departments] of Object.entries(departmentsByRegion)) {
    const department = departments.find((d) => d.toLowerCase() === normalized);
    if (department) return { region, department, commune: "" };
  }

  const region = senegalRegions.find((r) => r.toLowerCase() === normalized);
  if (region) return { region, department: "", commune: "" };

  return { region: "", department: "", commune: "" };
}

function RechercheContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramDepart = searchParams.get("depart") ?? "";
  const paramDestination = searchParams.get("destination") ?? "";
  const paramDate = searchParams.get("date") ?? "";
  const paramHeure = searchParams.get("heure") ?? "";
  const paramBudget = searchParams.get("budget") ?? "";
  const paramPickupMode = (searchParams.get("pickupMode") as PickupMode) || "driver_point";

  const [formDepart, setFormDepart] = useState(paramDepart);
  const [formDestination, setFormDestination] = useState(paramDestination);
  const [formDate, setFormDate] = useState(paramDate);
  const [formHeure, setFormHeure] = useState(paramHeure);
  const [formBudget, setFormBudget] = useState(paramBudget);
  const [formPickupMode, setFormPickupMode] = useState<PickupMode>(paramPickupMode);
  const [formError, setFormError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState<"depart" | "destination" | null>(null);
  const [departRegion, setDepartRegion] = useState("");
  const [departDepartment, setDepartDepartment] = useState("");
  const [departCommune, setDepartCommune] = useState("");
  const [destinationRegion, setDestinationRegion] = useState("");
  const [destinationDepartment, setDestinationDepartment] = useState("");
  const [destinationCommune, setDestinationCommune] = useState("");
  const [departManualMode, setDepartManualMode] = useState(false);
  const [destinationManualMode, setDestinationManualMode] = useState(false);

  const hasSearchParams = Boolean(paramDepart.trim() && paramDestination.trim());
  const [loading, setLoading] = useState(hasSearchParams);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [filterMinSeats, setFilterMinSeats] = useState("");

  useEffect(() => {
    setFormDepart(paramDepart);
    setFormDestination(paramDestination);
    setFormDate(paramDate);
    setFormHeure(paramHeure);
    setFormBudget(paramBudget);
    setFormPickupMode(paramPickupMode);

    const departHierarchy = inferLocationHierarchy(paramDepart);
    setDepartRegion(departHierarchy.region);
    setDepartDepartment(departHierarchy.department);
    setDepartCommune(departHierarchy.commune);
    setDepartManualMode(Boolean(paramDepart && !departHierarchy.region));

    const destinationHierarchy = inferLocationHierarchy(paramDestination);
    setDestinationRegion(destinationHierarchy.region);
    setDestinationDepartment(destinationHierarchy.department);
    setDestinationCommune(destinationHierarchy.commune);
    setDestinationManualMode(Boolean(paramDestination && !destinationHierarchy.region));
  }, [paramDepart, paramDestination, paramDate, paramHeure, paramBudget, paramPickupMode]);

  useEffect(() => {
    if (!hasSearchParams) {
      setTrips([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    const budgetNum = paramBudget ? parseInt(paramBudget, 10) : undefined;
    searchTrips({
      depart: paramDepart,
      destination: paramDestination,
      ...(paramDate ? { date: paramDate } : {}),
      ...(budgetNum && budgetNum > 0 ? { maxPriceFcfa: budgetNum } : {}),
      pickupMode: paramPickupMode,
    })
      .then((nextTrips) => {
        if (mounted) setTrips(nextTrips);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [hasSearchParams, paramDepart, paramDestination, paramDate, paramBudget, paramPickupMode]);

  const filteredTrips = useMemo(() => {
    let list = trips;
    if (filterCategory) {
      list = list.filter((t) => t.category.toLowerCase() === filterCategory.toLowerCase());
    }
    const maxPrice = filterMaxPrice ? parseInt(filterMaxPrice, 10) : NaN;
    if (!Number.isNaN(maxPrice) && maxPrice > 0) list = list.filter((t) => t.price <= maxPrice);
    const minSeats = filterMinSeats ? parseInt(filterMinSeats, 10) : NaN;
    if (!Number.isNaN(minSeats) && minSeats > 0) {
      list = list.filter((t) => parseAvailableSeats(t.seats) >= minSeats);
    }
    return list;
  }, [trips, filterCategory, filterMaxPrice, filterMinSeats]);

  const hasResults = useMemo(() => filteredTrips.length > 0, [filteredTrips.length]);
  const hasActiveFilters = filterCategory || filterMaxPrice || filterMinSeats;

  const applyMyPosition = (field: "depart" | "destination") => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setGeoLoading(field);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const city = await reverseGeocode(latitude, longitude);
        if (field === "depart") setFormDepart(city || "Ma position");
        else setFormDestination(city || "Ma position");
        setGeoLoading(null);
      },
      () => {
        if (field === "depart") setFormDepart("Ma position");
        else setFormDestination("Ma position");
        setGeoLoading(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const depart = formDepart.trim();
    const destination = formDestination.trim();
    if (!depart || !destination) {
      setFormError("Renseignez le départ et la destination pour lancer la recherche.");
      return;
    }
    if (depart.toLowerCase() === destination.toLowerCase()) {
      setFormError("Le départ et la destination doivent être différents.");
      return;
    }
    setFormError(null);
    const params = new URLSearchParams();
    params.set("depart", depart);
    params.set("destination", destination);
    if (formDate) params.set("date", formDate);
    if (formHeure) params.set("heure", formHeure);
    if (formBudget.trim()) {
      const b = parseInt(formBudget, 10);
      if (!Number.isNaN(b) && b > 0) params.set("budget", String(b));
    }
    params.set("pickupMode", formPickupMode);
    router.push(`/recherche?${params.toString()}`);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-8">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l’accueil
        </Link>

        {/* Formulaire de recherche — toujours visible */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/35 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600">
            Recherche
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Trouver un trajet
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Départ, destination, date : affichez les offres disponibles ou affinez avec le budget.
          </p>
          <form onSubmit={handleSearchSubmit} className="mt-6 space-y-4">
            {formError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">Point de départ</label>
              <div className="grid gap-2 sm:grid-cols-3">
                <select
                  value={departRegion}
                  onChange={(e) => {
                    const nextRegion = e.target.value;
                    setDepartRegion(nextRegion);
                    setDepartDepartment("");
                    setDepartCommune("");
                    setFormDepart(nextRegion);
                    setDepartManualMode(false);
                    if (formError) setFormError(null);
                  }}
                  className="min-h-[44px] rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Région</option>
                  {senegalRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                <select
                  value={departDepartment}
                  onChange={(e) => {
                    const nextDepartment = e.target.value;
                    setDepartDepartment(nextDepartment);
                    setDepartCommune("");
                    setFormDepart(nextDepartment || departRegion);
                    setDepartManualMode(false);
                    if (formError) setFormError(null);
                  }}
                  disabled={!departRegion}
                  className="min-h-[44px] rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Département</option>
                  {(departmentsByRegion[departRegion] ?? []).map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
                <select
                  value={departCommune}
                  onChange={(e) => {
                    const nextCommune = e.target.value;
                    setDepartCommune(nextCommune);
                    setFormDepart(nextCommune || departDepartment || departRegion);
                    setDepartManualMode(false);
                    if (formError) setFormError(null);
                  }}
                  disabled={!departDepartment}
                  className="min-h-[44px] rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Commune/Arrond.</option>
                  {(communesByDepartment[departDepartment] ?? []).map((commune) => (
                    <option key={commune} value={commune}>
                      {commune}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyMyPosition("depart")}
                  disabled={geoLoading !== null}
                  title="Utiliser ma position"
                >
                  {geoLoading === "depart" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  <span className="ml-1">Ma position</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDepartManualMode((v) => !v)}
                >
                  {departManualMode ? "Masquer saisie" : "Saisie manuelle"}
                </Button>
              </div>
              {departManualMode && (
                <div className="mt-2">
                  <input
                    type="text"
                    list="cities-depart"
                    placeholder="Ex: Dakar, Thiès…"
                    value={formDepart}
                    onChange={(e) => {
                      setFormDepart(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="min-h-[44px] w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <datalist id="cities-depart">
                    {senegalCities.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">Destination</label>
              <div className="grid gap-2 sm:grid-cols-3">
                <select
                  value={destinationRegion}
                  onChange={(e) => {
                    const nextRegion = e.target.value;
                    setDestinationRegion(nextRegion);
                    setDestinationDepartment("");
                    setDestinationCommune("");
                    setFormDestination(nextRegion);
                    setDestinationManualMode(false);
                    if (formError) setFormError(null);
                  }}
                  className="min-h-[44px] rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Région</option>
                  {senegalRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                <select
                  value={destinationDepartment}
                  onChange={(e) => {
                    const nextDepartment = e.target.value;
                    setDestinationDepartment(nextDepartment);
                    setDestinationCommune("");
                    setFormDestination(nextDepartment || destinationRegion);
                    setDestinationManualMode(false);
                    if (formError) setFormError(null);
                  }}
                  disabled={!destinationRegion}
                  className="min-h-[44px] rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Département</option>
                  {(departmentsByRegion[destinationRegion] ?? []).map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
                <select
                  value={destinationCommune}
                  onChange={(e) => {
                    const nextCommune = e.target.value;
                    setDestinationCommune(nextCommune);
                    setFormDestination(nextCommune || destinationDepartment || destinationRegion);
                    setDestinationManualMode(false);
                    if (formError) setFormError(null);
                  }}
                  disabled={!destinationDepartment}
                  className="min-h-[44px] rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Commune/Arrond.</option>
                  {(communesByDepartment[destinationDepartment] ?? []).map((commune) => (
                    <option key={commune} value={commune}>
                      {commune}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyMyPosition("destination")}
                  disabled={geoLoading !== null}
                  title="Utiliser ma position"
                >
                  {geoLoading === "destination" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  <span className="ml-1">Ma position</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDestinationManualMode((v) => !v)}
                >
                  {destinationManualMode ? "Masquer saisie" : "Saisie manuelle"}
                </Button>
              </div>
              {destinationManualMode && (
                <div className="mt-2">
                  <input
                    type="text"
                    list="cities-dest"
                    placeholder="Ex: Saint-Louis, Mbour…"
                    value={formDestination}
                    onChange={(e) => {
                      setFormDestination(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="min-h-[44px] w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <datalist id="cities-dest">
                    {senegalCities.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => {
                const prevDepartRegion = departRegion;
                const prevDepartDepartment = departDepartment;
                const prevDepartCommune = departCommune;
                const prevDepartManualMode = departManualMode;
                setFormDepart(formDestination);
                setFormDestination(formDepart);
                setDepartRegion(destinationRegion);
                setDepartDepartment(destinationDepartment);
                setDepartCommune(destinationCommune);
                setDepartManualMode(destinationManualMode);
                setDestinationRegion(prevDepartRegion);
                setDestinationDepartment(prevDepartDepartment);
                setDestinationCommune(prevDepartCommune);
                setDestinationManualMode(prevDepartManualMode);
              }}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Inverser départ et destination
            </Button>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                Budget max (FCFA, optionnel)
              </label>
              <input
                type="number"
                min={0}
                placeholder="Ex: 5000"
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                Prise en charge
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFormPickupMode("driver_point")}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                    formPickupMode === "driver_point"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  Point du chauffeur
                </button>
                <button
                  type="button"
                  onClick={() => setFormPickupMode("home_pickup")}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                    formPickupMode === "home_pickup"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  A domicile (+supplement)
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">Date (optionnel)</label>
                <div className="flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20">
                  <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    type="date"
                    min={today}
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">Heure (optionnel)</label>
                <input
                  type="time"
                  value={formHeure}
                  onChange={(e) => setFormHeure(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
            <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto" disabled={!formDepart.trim() || !formDestination.trim()}>
              <Search className="mr-2 h-5 w-5" />
              Rechercher les trajets
            </Button>
          </form>
        </Card>

        {/* Résultats — uniquement après une recherche */}
        {!hasSearchParams && (
          <Card className="mt-8">
            <p className="text-sm text-slate-600">
              Renseignez départ et destination, puis lancez la recherche pour voir les trajets publiés.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" href="/recherche?depart=Dakar&destination=Thiès">
                Dakar → Thiès
              </Button>
              <Button size="sm" variant="ghost" href="/recherche?depart=Dakar&destination=Saint-Louis">
                Dakar → Saint-Louis
              </Button>
              <Button size="sm" variant="ghost" href="/recherche?depart=Thiès&destination=Mbour">
                Thiès → Mbour
              </Button>
            </div>
          </Card>
        )}

        {hasSearchParams && (
          <>
            <section className="mt-10 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-lg shadow-slate-200/30 sm:p-6">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Trajets disponibles · {paramDepart} → {paramDestination}
                {paramBudget && parseInt(paramBudget, 10) > 0 && (
                  <span className="ml-2 text-base font-normal text-neutral-500">
                    (budget max {parseInt(paramBudget, 10).toLocaleString("fr-FR")} FCFA)
                  </span>
                )}
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                {paramDate
                  ? new Date(paramDate + "T12:00:00").toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : "Toutes dates"}
                {paramHeure && ` · ${paramHeure}`}
                {` · ${paramPickupMode === "home_pickup" ? "Prise en charge domicile" : "Point chauffeur"}`}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/60">
                  {paramDepart}
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/60">
                  {paramDestination}
                </span>
                {paramDate && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {new Date(paramDate + "T12:00:00").toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {hasActiveFilters && (
                    <span className="text-xs font-semibold text-emerald-700">Filtres actifs</span>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setFilterOpen((o) => !o)}>
                    <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
                    Filtrer
                  </Button>
                </div>
              </div>
              {filterOpen && (
                <Card className="mt-4 border border-neutral-200 bg-neutral-50/80 p-4">
                  <p className="mb-3 text-sm font-medium text-neutral-700">Affiner les résultats</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-600">Catégorie</label>
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value || "all"} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-600">Prix max (FCFA)</label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Ex: 5000"
                        value={filterMaxPrice}
                        onChange={(e) => setFilterMaxPrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-600">Places min.</label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Ex: 2"
                        value={filterMinSeats}
                        onChange={(e) => setFilterMinSeats(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-3"
                    onClick={() => {
                      setFilterCategory("");
                      setFilterMaxPrice("");
                      setFilterMinSeats("");
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                </Card>
              )}
            </section>

            {loading ? (
              <div className="mt-6 animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 rounded-xl bg-neutral-200" />
                ))}
              </div>
            ) : !hasResults ? (
              <Card className="mt-6">
                <h2 className="text-lg font-semibold text-neutral-900">
                  {hasActiveFilters ? "Aucun trajet ne correspond aux filtres" : paramBudget && parseInt(paramBudget, 10) > 0 ? "Aucun trajet dans votre budget" : "Aucun trajet trouvé pour le moment"}
                </h2>
                <p className="mt-2 text-sm text-neutral-600">
                  {hasActiveFilters
                    ? "Modifiez ou réinitialisez les filtres."
                    : paramBudget && parseInt(paramBudget, 10) > 0
                      ? "Augmentez votre budget ou modifiez la date / les villes. Vous pouvez aussi publier une demande."
                      : "Modifiez la date ou les villes, ou publiez une demande pour que les chauffeurs vous proposent un trajet."}
                </p>
                {hasActiveFilters && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                      setFilterCategory("");
                      setFilterMaxPrice("");
                      setFilterMinSeats("");
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" href="/demande">
                    Publier une demande
                  </Button>
                  <Button size="sm" variant="ghost" href="/recherche?depart=Dakar&destination=Thiès">
                    Dakar → Thiès
                  </Button>
                  <Button size="sm" variant="ghost" href="/recherche?depart=Dakar&destination=Saint-Louis">
                    Dakar → Saint-Louis
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="mt-6 space-y-4">
                <p className="text-sm font-medium text-slate-600">
                  {filteredTrips.length} trajet{filteredTrips.length !== 1 ? "s" : ""} — sélectionnez une offre pour continuer
                </p>
                {filteredTrips.map((trip) => (
                  <Card
                    key={trip.id}
                    variant="interactive"
                    className="rounded-2xl border border-slate-200/80 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-900">
                          {trip.driver.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900">{trip.driver}</p>
                          <p className="flex items-center gap-2 text-sm text-neutral-600">
                            ★ {trip.rating} ({trip.reviews} avis)
                            <TripTypeBadge tripType={trip.tripType} />
                          </p>
                          <p className="mt-2 text-sm text-neutral-700">
                            {trip.departure} → {trip.arrival} · {trip.from} → {trip.to}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {trip.km} km · {trip.duration}
                          </p>
                          <div className="mt-2">
                            <VehicleBadge
                              name={trip.vehicle}
                              category={trip.category}
                              seats={trip.seats}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end sm:gap-2">
                        <p className="text-lg font-bold text-neutral-900">
                          {trip.price.toLocaleString("fr-FR")} FCFA
                          <span className="text-sm font-normal text-neutral-500">/pers</span>
                        </p>
                        {trip.suggestedPriceFcfa && (
                          <p className="text-xs text-neutral-500">
                            Prix conseillé: {Math.round(trip.suggestedPriceFcfa).toLocaleString("fr-FR")} FCFA
                          </p>
                        )}
                        {paramPickupMode === "home_pickup" && (
                          <p className="text-xs text-emerald-700">
                            Inclut supplement domicile (+{(trip.homePickupExtraFcfa ?? 2000).toLocaleString("fr-FR")} FCFA)
                          </p>
                        )}
                        <Button size="sm" href={`/trajet/${trip.id}`}>
                          Réserver ce trajet
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="fixed bottom-4 left-4 right-4 z-30 rounded-2xl border border-neutral-200 bg-white/95 p-2 shadow-lg backdrop-blur sm:hidden">
              <div className="flex gap-2">
                <Button href="/demande" fullWidth size="sm" variant="secondary">
                  Publier une demande
                </Button>
                <Button
                  type="button"
                  fullWidth
                  size="sm"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                  Modifier recherche
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function RechercheFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-neutral-100">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-lg bg-slate-200" />
          <div className="h-4 w-64 rounded-lg bg-slate-100" />
          <div className="mt-8 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-36 rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RecherchePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-neutral-100">
      <Suspense fallback={<RechercheFallback />}>
        <RechercheContent />
      </Suspense>
    </div>
  );
}
