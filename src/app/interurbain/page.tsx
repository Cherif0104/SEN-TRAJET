"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CarFront,
  Check,
  Clock3,
  MapPinned,
  RefreshCw,
  Route,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  AddressAutocomplete,
  type SelectedPlace,
} from "@/components/booking/AddressAutocomplete";
import { Logo } from "@/components/layout/Logo";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { VoyagerMarketplace } from "@/components/voyager/VoyagerMarketplace";
import { useAuth } from "@/hooks/useAuth";
import {
  createIntercityBooking,
  createIntercityQuote,
  startIntercityPayment,
  type IntercityQuote,
  type IntercityTripMode,
  type IntercityVehicleOffer,
} from "@/lib/intercityService";
import { formatFcfa } from "@/lib/sentrajetPricing";

function localDateTime(daysAhead: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, 0, 0, 0);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function VehicleVisual({ offer }: { offer: IntercityVehicleOffer }) {
  const photo = offer.photoUrl || offer.photoUrls[0];
  return (
    <div className="relative h-36 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1b304e] to-[#bf9121]">
      {photo ? (
        <Image
          src={photo}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 360px"
        />
      ) : (
        <CarFront className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-white/80" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#07111f]/80 to-transparent" />
      <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-[#07111f]">
        Flotte SentraJet
      </span>
    </div>
  );
}

export function PremiumIntercityPage() {
  const { profile } = useAuth();
  const minimumTime = useMemo(() => localDateTime(1, 8), []);
  const [pickup, setPickup] = useState<SelectedPlace | null>(null);
  const [pickupText, setPickupText] = useState("");
  const [dropoff, setDropoff] = useState<SelectedPlace | null>(null);
  const [dropoffText, setDropoffText] = useState("");
  const [pickupTime, setPickupTime] = useState(minimumTime);
  const [returnTime, setReturnTime] = useState(() => localDateTime(2, 16));
  const [tripMode, setTripMode] = useState<IntercityTripMode>("aller_simple");
  const [passengers, setPassengers] = useState(1);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [quote, setQuote] = useState<IntercityQuote | null>(null);
  const [selected, setSelected] = useState<IntercityVehicleOffer | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);

  useEffect(() => {
    const requestedDestination = new URLSearchParams(window.location.search).get("destination");
    if (requestedDestination) setDropoffText(requestedDestination);
  }, []);

  useEffect(() => {
    if (!phone && profile?.phone) setPhone(profile.phone);
  }, [phone, profile?.phone]);

  useEffect(() => {
    setQuote(null);
    setSelected(null);
    setError(null);
  }, [pickup, dropoff, pickupTime, returnTime, tripMode, passengers]);

  function routeInput() {
    if (!pickup || !dropoff) return null;
    const departure = new Date(pickupTime);
    const returning = tripMode === "aller_retour" ? new Date(returnTime) : null;
    if (
      !Number.isFinite(departure.getTime()) ||
      (returning && !Number.isFinite(returning.getTime()))
    ) {
      return null;
    }
    return {
      pickup: pickup.address,
      dropoff: dropoff.address,
      pickupTime: departure.toISOString(),
      returnTime: returning?.toISOString() ?? null,
      tripMode,
      passengers,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
    };
  }

  async function calculateQuote() {
    const input = routeInput();
    if (!input) {
      setError("Sélectionnez le départ et la destination dans les suggestions.");
      return;
    }
    setQuoting(true);
    setError(null);
    setSimulationMessage(null);
    try {
      const result = await createIntercityQuote(input);
      setQuote(result);
      setSelected(result.offers[0] ?? null);
      if (!result.offers.length) {
        setError("Aucun véhicule SentraJet n’est libre pour ce créneau.");
      }
    } catch (cause) {
      setQuote(null);
      setSelected(null);
      setError(cause instanceof Error ? cause.message : "Calcul impossible.");
    } finally {
      setQuoting(false);
    }
  }

  async function reserve() {
    const input = routeInput();
    if (!input || !selected) {
      setError("Calculez le trajet puis choisissez un véhicule.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 9) {
      setError("Indiquez un numéro de téléphone joignable.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSimulationMessage(null);
    try {
      const booking = await createIntercityBooking({
        ...input,
        vehicleId: selected.vehicleId,
        phone,
      });
      const payment = await startIntercityPayment(booking.paymentId);
      if (payment.checkoutUrl) {
        window.location.assign(payment.checkoutUrl);
        return;
      }
      setSimulationMessage(
        `Réservation ${booking.reference} enregistrée. Le paiement Wave est en mode démonstration.`,
      );
      window.setTimeout(
        () => window.location.assign(`/compte/reservations/${booking.bookingId}`),
        1800,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Réservation impossible.");
      await calculateQuote();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f5f8] text-[#07111f]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/compte"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Logo className="flex-1 [&_img]:!h-7" />
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
            Premium
          </span>
        </div>
      </header>

      <section className="bg-[#07111f] px-4 pb-20 pt-8 text-white sm:pb-24 sm:pt-12">
        <div className="mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
            <MapPinned className="h-4 w-4" /> Voyage interurbain privé
          </span>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
            Votre destination, votre véhicule, votre horaire.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Calculez l’itinéraire réel, comparez les véhicules SentraJet disponibles et
            confirmez votre voyage sans attendre un devis manuel.
          </p>
        </div>
      </section>

      <div className="mx-auto -mt-12 grid max-w-6xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-[1.2fr_.8fr]">
        <section className="space-y-5">
          <div className="rounded-3xl bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                  Étape 1
                </p>
                <h2 className="mt-1 text-lg font-black">Construisez votre trajet</h2>
              </div>
              <Route className="h-6 w-6 text-amber-600" />
            </div>
            <div className="mt-4 grid gap-3">
              <AddressAutocomplete
                label="Point de départ"
                placeholder="Votre position, hôtel, domicile…"
                value={pickup}
                textValue={pickupText}
                onSelect={(place) => {
                  setPickup(place);
                  setPickupText(place.address);
                }}
                onClear={() => {
                  setPickup(null);
                  setPickupText("");
                }}
                showMyLocation
                accent="pickup"
              />
              <AddressAutocomplete
                label="Destination"
                placeholder="Ville, quartier ou adresse précise…"
                value={dropoff}
                textValue={dropoffText}
                onSelect={(place) => {
                  setDropoff(place);
                  setDropoffText(place.address);
                }}
                onClear={() => {
                  setDropoff(null);
                  setDropoffText("");
                }}
                accent="dropoff"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5">
              {([
                ["aller_simple", "Aller simple"],
                ["aller_retour", "Aller-retour"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTripMode(value)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-black transition ${
                    tripMode === value ? "bg-white shadow-sm" : "text-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="rounded-2xl border border-slate-200 p-3">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <CalendarClock className="h-4 w-4" /> Départ
                </span>
                <input
                  type="datetime-local"
                  value={pickupTime}
                  min={minimumTime}
                  onChange={(event) => setPickupTime(event.target.value)}
                  className="mt-2 w-full bg-transparent text-sm font-bold outline-none"
                />
              </label>
              {tripMode === "aller_retour" ? (
                <label className="rounded-2xl border border-slate-200 p-3">
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <RefreshCw className="h-4 w-4" /> Retour
                  </span>
                  <input
                    type="datetime-local"
                    value={returnTime}
                    min={pickupTime}
                    onChange={(event) => setReturnTime(event.target.value)}
                    className="mt-2 w-full bg-transparent text-sm font-bold outline-none"
                  />
                </label>
              ) : (
                <label className="rounded-2xl border border-slate-200 p-3">
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Users className="h-4 w-4" /> Passagers
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={passengers}
                    onChange={(event) =>
                      setPassengers(Math.max(1, Math.min(60, Number(event.target.value) || 1)))
                    }
                    className="mt-2 w-full bg-transparent text-sm font-bold outline-none"
                  />
                </label>
              )}
            </div>
            {tripMode === "aller_retour" ? (
              <label className="mt-3 block rounded-2xl border border-slate-200 p-3">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Users className="h-4 w-4" /> Passagers
                </span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={passengers}
                  onChange={(event) =>
                    setPassengers(Math.max(1, Math.min(60, Number(event.target.value) || 1)))
                  }
                  className="mt-2 w-full bg-transparent text-sm font-bold outline-none"
                />
              </label>
            ) : null}
            <button
              type="button"
              onClick={() => void calculateQuote()}
              disabled={!pickup || !dropoff || quoting}
              className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#07111f] px-5 font-black text-white disabled:opacity-40"
            >
              {quoting ? <BrandedLoader /> : <>Voir les véhicules et les prix <ArrowRight className="h-5 w-5" /></>}
            </button>
          </div>

          {quote ? (
            <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                    Étape 2
                  </p>
                  <h2 className="mt-1 text-lg font-black">Choisissez votre véhicule</h2>
                </div>
                <div className="flex gap-2 text-xs font-bold">
                  <span className="rounded-full bg-slate-100 px-3 py-1.5">
                    {quote.distanceKm} km
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5">
                    ~{Math.floor(quote.durationMinutes / 60)} h {quote.durationMinutes % 60} min
                  </span>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {quote.offers.map((offer) => (
                  <button
                    key={offer.vehicleId}
                    type="button"
                    onClick={() => setSelected(offer)}
                    className={`overflow-hidden rounded-3xl border bg-white p-2 text-left transition ${
                      selected?.vehicleId === offer.vehicleId
                        ? "border-amber-400 ring-2 ring-amber-300"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <VehicleVisual offer={offer} />
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-black">{offer.brand} {offer.model}</h3>
                          <p className="text-xs text-slate-500">
                            {offer.seats} places · {offer.luggageCapacity || offer.category}
                          </p>
                        </div>
                        {selected?.vehicleId === offer.vehicleId ? (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400">
                            <Check className="h-4 w-4" />
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-lg font-black">{formatFcfa(offer.amountFcfa)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="h-fit rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-200 sm:p-6 lg:sticky lg:top-20">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
            Étape 3
          </p>
          <h2 className="mt-1 text-lg font-black">Confirmez votre voyage</h2>
          {quote && selected ? (
            <>
              <div className="mt-4 rounded-2xl bg-[#07111f] p-4 text-white">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-300">Prix total immédiat</span>
                  <b className="text-lg">{formatFcfa(selected.amountFcfa)}</b>
                </div>
                <div className="mt-3 border-t border-white/10 pt-3 text-xs text-slate-400">
                  {tripMode === "aller_retour" ? "Aller-retour" : "Aller simple"} · {quote.distanceKm} km
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
                  <BadgeCheck className="h-4 w-4" /> Prix recalculé et sécurisé côté serveur
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm">
                <b>{selected.brand} {selected.model}</b>
                <p className="mt-1 text-xs text-slate-600">
                  Véhicule exact réservé pour {passengers} passager{passengers > 1 ? "s" : ""}.
                </p>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-2xl bg-slate-50 p-6 text-center">
              <Clock3 className="mx-auto h-7 w-7 text-slate-400" />
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Renseignez le trajet pour afficher les véhicules réellement disponibles.
              </p>
            </div>
          )}
          <label className="mt-4 block">
            <span className="text-xs font-bold text-slate-500">Téléphone joignable</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+221 77 000 00 00"
              className="mt-1 min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-amber-400"
            />
          </label>
          {error ? (
            <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">
              {error}
            </p>
          ) : null}
          {simulationMessage ? (
            <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
              {simulationMessage}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void reserve()}
            disabled={!selected || submitting}
            className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl bg-amber-400 px-5 font-black text-[#07111f] disabled:opacity-45"
          >
            {submitting
              ? "Confirmation…"
              : selected
                ? `Réserver · ${formatFcfa(selected.amountFcfa)}`
                : "Choisissez un véhicule"}
          </button>
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-slate-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Paiement Wave sécurisé. Le véhicule est bloqué lors de la confirmation pour
            éviter les doubles réservations.
          </p>
        </aside>
      </div>
    </main>
  );
}

export default function VoyagerPage() {
  return <VoyagerMarketplace />;
}
