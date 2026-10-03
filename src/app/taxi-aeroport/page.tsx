"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CarFront,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Navigation,
  Plane,
  ShieldCheck,
} from "lucide-react";
import {
  AddressAutocomplete,
  type SelectedPlace,
} from "@/components/booking/AddressAutocomplete";
import { Logo } from "@/components/layout/Logo";
import {
  computeInstantTaxiPrice,
  formatFcfa,
  VEHICLE_CATEGORY_LABELS,
  VEHICLE_CATEGORY_SEATS,
  type VehicleCategory,
} from "@/lib/sentrajetPricing";

const AIBD: SelectedPlace = {
  id: "sentrajet:aibd",
  label: "Aéroport international Blaise-Diagne",
  address: "Aéroport international Blaise-Diagne (AIBD), Diass",
  lat: 14.6708,
  lng: -17.0726,
  source: "sentrajet",
};

type LiveBooking = {
  id: string;
  reference: string;
  status: string;
  estimatedPrice: number;
  distanceKm: number;
  searchExpiresAt: string;
  driver: { full_name?: string; phone?: string; photo_url?: string } | null;
  vehicle: {
    brand?: string;
    model?: string;
    plate_number?: string;
    color?: string;
    seats?: number;
    photo_url?: string;
  } | null;
};

const categories: VehicleCategory[] = ["berline", "suv", "van"];

export default function TaxiAeroportPage() {
  const [pickup, setPickup] = useState<SelectedPlace | null>(null);
  const [dropoff, setDropoff] = useState<SelectedPlace | null>(AIBD);
  const [category, setCategory] = useState<VehicleCategory>("berline");
  const [passengers, setPassengers] = useState(1);
  const [phone, setPhone] = useState("");
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<LiveBooking | null>(null);
  const [searchToken, setSearchToken] = useState<string | null>(null);

  const quote = useMemo(
    () => (distanceKm ? computeInstantTaxiPrice(distanceKm, category) : null),
    [distanceKm, category]
  );

  useEffect(() => {
    if (!pickup || !dropoff) {
      setDistanceKm(null);
      return;
    }
    let cancelled = false;
    setEstimating(true);
    setError(null);
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
        const payload = (await response.json()) as {
          distanceKm?: number;
          durationMinutes?: number;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "Itinéraire indisponible.");
        if (!cancelled) {
          setDistanceKm(Number(payload.distanceKm));
          setDurationMinutes(Number(payload.durationMinutes));
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setDistanceKm(null);
          setError(reason instanceof Error ? reason.message : "Itinéraire indisponible.");
        }
      })
      .finally(() => {
        if (!cancelled) setEstimating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff]);

  useEffect(() => {
    if (!booking || !searchToken || booking.status !== "recherche_chauffeur") return;
    const timer = window.setInterval(() => {
      void fetch(
        `/api/bookings/instant?id=${encodeURIComponent(booking.id)}&token=${encodeURIComponent(searchToken)}`,
        { cache: "no-store" }
      )
        .then(async (response) => {
          const payload = (await response.json()) as { booking?: LiveBooking };
          if (response.ok && payload.booking) setBooking(payload.booking);
        })
        .catch(() => undefined);
    }, 4_000);
    return () => window.clearInterval(timer);
  }, [booking, searchToken]);

  function swapRoute() {
    setPickup(dropoff);
    setDropoff(pickup);
  }

  async function findTaxi() {
    if (!pickup || !dropoff || !quote) {
      setError("Confirmez le départ et la destination.");
      return;
    }
    if (passengers > VEHICLE_CATEGORY_SEATS[category]) {
      setError(`Cette catégorie accepte ${VEHICLE_CATEGORY_SEATS[category]} passagers maximum.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/bookings/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup,
          dropoff,
          vehicleCategory: category,
          passengers,
          phone,
        }),
      });
      const payload = (await response.json()) as {
        booking?: LiveBooking;
        searchToken?: string;
        error?: string;
      };
      if (!response.ok || !payload.booking || !payload.searchToken) {
        throw new Error(payload.error || "Impossible de lancer la recherche.");
      }
      setBooking(payload.booking);
      setSearchToken(payload.searchToken);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Recherche impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  const assigned = booking?.status === "chauffeur_assigne" && booking.driver && booking.vehicle;
  const unavailable = booking?.status === "aucun_chauffeur";

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-[#07111f]">
      <div className="mx-auto min-h-screen max-w-xl bg-white shadow-xl">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-100 bg-white/95 px-4 backdrop-blur">
          <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Logo className="flex-1 [&_img]:!h-7" />
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
            LIVE
          </span>
        </header>

        <section className="px-4 pb-28 pt-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Taxi aéroport</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Un chauffeur, maintenant.</h1>
          <p className="mt-2 text-sm text-slate-500">Position, prix et affectation traités automatiquement.</p>

          {booking ? (
            <div className="mt-6">
              {assigned ? (
                <div className="rounded-[1.6rem] bg-[#07111f] p-5 text-white">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  <h2 className="mt-4 text-2xl font-black text-white">Chauffeur trouvé</h2>
                  <p className="mt-1 text-sm text-white/60">{booking.reference}</p>
                  <div className="mt-5 rounded-2xl bg-white/10 p-4">
                    <p className="text-lg font-bold text-white">{booking.driver?.full_name}</p>
                    <p className="mt-1 text-sm text-white/70">
                      {booking.vehicle?.brand} {booking.vehicle?.model} · {booking.vehicle?.color}
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-amber-300">{booking.vehicle?.plate_number}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {booking.driver?.phone ? (
                      <a href={`tel:${booking.driver.phone}`} className="rounded-2xl bg-emerald-400 px-4 py-3 text-center text-sm font-black text-emerald-950">
                        Appeler
                      </a>
                    ) : null}
                    <Link href={`/compte/reservations/${booking.id}`} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-[#07111f]">
                      Suivre
                    </Link>
                  </div>
                </div>
              ) : unavailable ? (
                <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-5">
                  <Clock3 className="h-9 w-9 text-amber-700" />
                  <h2 className="mt-3 text-xl font-black">Aucun chauffeur immédiat</h2>
                  <p className="mt-2 text-sm text-slate-600">La recherche est terminée. Planifiez le trajet pour que l’équipe organise votre prise en charge.</p>
                  <Link href="/reserver?service=transfert_aibd" className="mt-4 inline-flex rounded-2xl bg-[#07111f] px-4 py-3 text-sm font-black text-white">
                    Planifier mon transfert
                  </Link>
                </div>
              ) : (
                <div className="rounded-[1.6rem] bg-[#07111f] p-6 text-center text-white">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15">
                    <Navigation className="h-8 w-8 animate-pulse text-emerald-400" />
                  </span>
                  <h2 className="mt-4 text-xl font-black text-white">Recherche autour de vous…</h2>
                  <p className="mt-2 text-sm text-white/60">Flotte SentraJet prioritaire, puis partenaires certifiés.</p>
                  <Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-amber-400" />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="relative mt-6 space-y-3 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4">
                <AddressAutocomplete
                  label="Où êtes-vous ?"
                  placeholder="Votre point de prise en charge"
                  value={pickup}
                  onSelect={setPickup}
                  onClear={() => setPickup(null)}
                  showMyLocation
                  accent="pickup"
                />
                <button type="button" onClick={swapRoute} className="absolute right-7 top-[78px] z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm" aria-label="Inverser le trajet">
                  ↕
                </button>
                <AddressAutocomplete
                  label="Destination"
                  placeholder="AIBD ou une autre adresse"
                  value={dropoff}
                  onSelect={setDropoff}
                  onClear={() => setDropoff(null)}
                  accent="dropoff"
                />
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black">Choisissez votre véhicule</h2>
                  {estimating ? <Loader2 className="h-4 w-4 animate-spin text-amber-600" /> : null}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {categories.map((item) => {
                    const itemQuote = distanceKm ? computeInstantTaxiPrice(distanceKm, item) : null;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCategory(item)}
                        className={`rounded-2xl border p-3 text-left transition ${
                          category === item ? "border-[#07111f] bg-[#07111f] text-white" : "border-slate-200 bg-white"
                        }`}
                      >
                        <CarFront className={`h-5 w-5 ${category === item ? "text-amber-400" : "text-slate-500"}`} />
                        <span className="mt-2 block text-xs font-black">{VEHICLE_CATEGORY_LABELS[item]}</span>
                        <span className={`mt-1 block text-[10px] ${category === item ? "text-white/60" : "text-slate-400"}`}>
                          {itemQuote ? formatFcfa(itemQuote.amountFcfa) : `${VEHICLE_CATEGORY_SEATS[item]} places`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-[110px_1fr] gap-3">
                <label className="rounded-2xl border border-slate-200 px-3 py-2">
                  <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">Passagers</span>
                  <input type="number" min={1} max={10} value={passengers} onChange={(event) => setPassengers(Number(event.target.value))} className="mt-1 w-full bg-transparent text-lg font-black outline-none" />
                </label>
                <label className="rounded-2xl border border-slate-200 px-3 py-2">
                  <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">Téléphone</span>
                  <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+221 77 000 00 00" className="mt-1 w-full bg-transparent text-sm font-bold outline-none" />
                </label>
              </div>

              {quote ? (
                <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-emerald-700">Prix estimé transparent</p>
                      <p className="mt-1 text-2xl font-black text-emerald-950">{formatFcfa(quote.amountFcfa)}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-emerald-800">{quote.distanceKm} km</span>
                  </div>
                  <p className="mt-2 text-xs text-emerald-800/70">{quote.formula} · environ {durationMinutes} min</p>
                </div>
              ) : null}

              {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

              <div className="mt-5 flex items-start gap-2 text-xs text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                Chauffeur et véhicule validés par SentraJet. Votre chauffeur n’est affiché qu’après l’affectation.
              </div>
            </>
          )}
        </section>

        {!booking ? (
          <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-xl border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
            <button
              type="button"
              onClick={() => void findTaxi()}
              disabled={submitting || estimating || !quote}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-4 text-base font-black text-[#07111f] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
              {submitting ? "Lancement…" : "Trouver un taxi"}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
