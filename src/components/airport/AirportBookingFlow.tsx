"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownUp,
  CalendarClock,
  CarFront,
  CheckCircle2,
  Clock3,
  Luggage,
  Plane,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AddressAutocomplete, type SelectedPlace } from "@/components/booking/AddressAutocomplete";
import { useAuth } from "@/hooks/useAuth";
import {
  AIRPORT_PLACE,
  AIRPORT_RIDE_CLASSES,
  airportClassPrice,
  airportPickupTime,
  type AirportBookingMode,
  type AirportDirection,
  type AirportRideClass,
} from "@/lib/airportTaxi";
import { createPaymentForBooking, createPlatformBooking, ensureClientForUser } from "@/lib/platformOps";
import { computeSentrajetPrice, formatFcfa } from "@/lib/sentrajetPricing";

type DistanceResult = {
  distanceKm?: number;
  durationMinutes?: number;
  source?: string;
  error?: string;
};

const AIRPORT_SELECTED_PLACE: SelectedPlace = { ...AIRPORT_PLACE };

export function AirportBookingFlow() {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<AirportBookingMode>("now");
  const [direction, setDirection] = useState<AirportDirection>("to_airport");
  const [address, setAddress] = useState<SelectedPlace | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(1);
  const [rideClass, setRideClass] = useState<AirportRideClass>("comfort");
  const [phone, setPhone] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [distance, setDistance] = useState<DistanceResult | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingRef, setBookingRef] = useState<string | null>(null);

  const pickup = direction === "to_airport" ? address : AIRPORT_SELECTED_PLACE;
  const dropoff = direction === "to_airport" ? AIRPORT_SELECTED_PLACE : address;

  useEffect(() => {
    if (!pickup || !dropoff) {
      setDistance(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setDistanceLoading(true);
      void fetch("/api/distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromPlace: pickup.address,
          toPlace: dropoff.address,
          fromLat: pickup.lat,
          fromLng: pickup.lng,
          toLat: dropoff.lat,
          toLng: dropoff.lng,
        }),
      })
        .then(async (response) => {
          const result = (await response.json()) as DistanceResult;
          if (!response.ok) throw new Error(result.error || "Itinéraire indisponible.");
          if (!cancelled) setDistance(result);
        })
        .catch((reason: unknown) => {
          if (!cancelled) {
            setDistance({
              error: reason instanceof Error ? reason.message : "Impossible de calculer le trajet.",
            });
          }
        })
        .finally(() => {
          if (!cancelled) setDistanceLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pickup, dropoff]);

  const baseQuote = useMemo(
    () =>
      computeSentrajetPrice({
        segment: "client",
        serviceType: direction === "to_airport" ? "transfert_aibd" : "aibd_retour",
        passengers,
        luggage,
        distanceKm: distance?.distanceKm ?? null,
      }),
    [direction, passengers, luggage, distance?.distanceKm]
  );
  const price = airportClassPrice(baseQuote.amountFcfa, rideClass);
  const pickupTime = airportPickupTime(mode, date, time);
  const canContinue = Boolean(address && distance?.distanceKm && pickupTime && !distanceLoading);

  async function submit() {
    if (!user) return;
    if (!pickup || !dropoff || !pickupTime || !distance?.distanceKm) {
      setError("Complétez le trajet et l’horaire avant de confirmer.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const clientId = await ensureClientForUser({
        userId: user.id,
        fullName: profile?.full_name,
        phone: phone || profile?.phone,
        email: user.email,
      });
      const classInfo = AIRPORT_RIDE_CLASSES[rideClass];
      const booking = await createPlatformBooking({
        clientId,
        pickup: pickup.address,
        dropoff: dropoff.address,
        pickupTime: pickupTime.toISOString(),
        serviceType: direction === "to_airport" ? "transfert_aibd" : "aibd_retour",
        passengers,
        estimatedPrice: price,
        pricingSegment: "client",
        distanceKm: distance.distanceKm,
        phone: phone || profile?.phone || null,
        flightNumber: flightNumber || null,
        luggageCount: luggage,
        notes: [
          `Verticale: Taxi Aéroport Sénégal`,
          `Mode: ${mode === "now" ? "maintenant" : "planifié"}`,
          `Classe: ${classInfo.label}`,
          `Durée estimée: ${distance.durationMinutes ?? "?"} min`,
        ].join(" · "),
      });
      await createPaymentForBooking({
        bookingId: booking.id,
        amountFcfa: price,
        bookingRef: booking.reference,
        status: "pending",
      }).catch(() => null);
      setBookingRef(booking.reference || booking.id.slice(0, 8));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La réservation n’a pas pu être créée.");
    } finally {
      setSubmitting(false);
    }
  }

  if (bookingRef) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-lg flex-col justify-center px-4 py-8">
        <div className="rounded-[30px] bg-white p-6 text-center shadow-[0_24px_80px_-36px_rgba(2,16,29,.65)]">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.2em] text-amber-700">
            Réservation confirmée
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-950">Votre taxi est demandé</h2>
          <p className="mt-3 text-sm text-slate-600">
            Référence <strong>{bookingRef}</strong>. Vous retrouverez l’affectation et le suivi dans
            votre espace.
          </p>
          <Link
            href="/compte/reservations"
            className="mt-6 flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#07111f] px-5 font-bold text-white"
          >
            Suivre ma course
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-lg px-4 pb-28 pt-5 sm:pt-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-700">
            Taxi Aéroport Sénégal
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
            Votre trajet vers AIBD
          </h1>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#07111f] text-amber-400">
          <Plane className="h-6 w-6" />
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_24px_80px_-42px_rgba(2,16,29,.7)]">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
          {(["now", "scheduled"] as AirportBookingMode[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
                mode === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
              }`}
            >
              {value === "now" ? <Clock3 className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
              {value === "now" ? "Maintenant" : "Planifier"}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {direction === "to_airport" ? "Destination" : "Départ"}
            </p>
            <div className="mt-1 flex items-center gap-2 font-bold text-slate-900">
              <Plane className="h-4 w-4 text-amber-600" />
              Aéroport AIBD
            </div>
          </div>
          <button
            type="button"
            aria-label="Inverser le sens du trajet"
            onClick={() => {
              setDirection((current) => (current === "to_airport" ? "from_airport" : "to_airport"));
              setDistance(null);
            }}
            className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
          >
            <ArrowDownUp className="h-4 w-4" />
          </button>
          <AddressAutocomplete
            label={direction === "to_airport" ? "Lieu de prise en charge" : "Votre destination"}
            placeholder="Quartier, hôtel, rue ou lieu…"
            value={address}
            showMyLocation={direction === "to_airport"}
            accent="pickup"
            onSelect={setAddress}
            onClear={() => setAddress(null)}
          />
        </div>

        {mode === "scheduled" ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-500">
              Date
              <input className="input-base mt-1.5" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Heure
              <input className="input-base mt-1.5" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Counter icon={Users} label="Passagers" value={passengers} min={1} max={8} onChange={setPassengers} />
          <Counter icon={Luggage} label="Bagages" value={luggage} min={0} max={12} onChange={setLuggage} />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Votre véhicule</p>
            <p className="mt-1 text-xs text-slate-500">Prix affiché avant confirmation</p>
          </div>
          {distance?.distanceKm ? (
            <p className="text-xs font-semibold text-slate-500">
              {distance.distanceKm} km · ~{distance.durationMinutes ?? "—"} min
            </p>
          ) : null}
        </div>
        {(Object.entries(AIRPORT_RIDE_CLASSES) as [AirportRideClass, (typeof AIRPORT_RIDE_CLASSES)[AirportRideClass]][]).map(
          ([value, option]) => (
            <button
              key={value}
              type="button"
              onClick={() => setRideClass(value)}
              className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-3.5 text-left transition ${
                rideClass === value ? "border-amber-500 shadow-sm" : "border-slate-200"
              }`}
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-800">
                <CarFront className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-slate-950">{option.label}</p>
                <p className="truncate text-xs text-slate-500">{option.description}</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-slate-950">
                  {distanceLoading
                    ? "…"
                    : price && rideClass === value
                      ? formatFcfa(price)
                      : distance?.distanceKm
                        ? formatFcfa(airportClassPrice(baseQuote.amountFcfa, value))
                        : "—"}
                </p>
                <p className="text-[10px] text-slate-500">{option.etaLabel}</p>
              </div>
            </button>
          )
        )}
      </div>

      {canContinue ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-500">
              Téléphone
              <input
                className="input-base mt-1.5"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+221 77 000 00 00"
              />
            </label>
            <label className="text-xs font-bold text-slate-500">
              N° de vol <span className="font-normal">(facultatif)</span>
              <input
                className="input-base mt-1.5"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                placeholder="Ex. HC403"
              />
            </label>
          </div>
        </div>
      ) : null}

      {distance?.error ? <p className="mt-3 text-sm text-red-600">{distance.error}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          {!user && canContinue ? (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/connexion?next=/taxi-aeroport"
                className="flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-bold text-slate-800"
              >
                Se connecter
              </Link>
              <Link
                href="/inscription?role=client&next=/taxi-aeroport"
                className="flex min-h-12 items-center justify-center rounded-2xl bg-[#07111f] px-4 text-sm font-bold text-white"
              >
                Créer un compte
              </Link>
            </div>
          ) : (
            <button
              type="button"
              disabled={!canContinue || submitting}
              onClick={() => void submit()}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#07111f] px-5 font-extrabold text-white disabled:bg-slate-300"
            >
              <ShieldCheck className="h-5 w-5 text-amber-400" />
              {submitting
                ? "Confirmation…"
                : !address
                  ? "Indiquez votre adresse"
                  : distanceLoading
                    ? "Calcul de l’itinéraire…"
                    : mode === "scheduled" && !pickupTime
                      ? "Choisissez la date et l’heure"
                      : `Confirmer · ${price ? formatFcfa(price) : "calcul en cours"}`}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Counter({
  icon: Icon,
  label,
  value,
  min,
  max,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-3">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="h-10 w-10 rounded-xl bg-slate-100 font-bold">
          −
        </button>
        <strong className="text-lg text-slate-950">{value}</strong>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="h-10 w-10 rounded-xl bg-slate-100 font-bold">
          +
        </button>
      </div>
    </div>
  );
}
