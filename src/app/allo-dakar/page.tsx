"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { AlloDakarShell } from "@/components/allo-dakar/AlloDakarShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import {
  bookAlloDakarSeats,
  createAlloDakarRideRequest,
  createAlloDakarWaveCheckout,
  listAlloDakarCorridors,
  searchAlloDakarDepartures,
  type AlloDakarCorridor,
  type AlloDakarDeparture,
  type AlloDakarPickupMode,
} from "@/lib/alloDakarOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { supabase } from "@/lib/supabase";

type TravelMode = "maintenant" | "planifier";
type SheetStep = "options" | "contact";

const today = () => new Date().toISOString().slice(0, 10);

function departureTime(value: string) {
  return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function departureDay(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export default function AlloDakarPage() {
  const [corridors, setCorridors] = useState<AlloDakarCorridor[]>([]);
  const [departures, setDepartures] = useState<AlloDakarDeparture[]>([]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [travelMode, setTravelMode] = useState<TravelMode>("maintenant");
  const [travelDate, setTravelDate] = useState(today());
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selected, setSelected] = useState<AlloDakarDeparture | null>(null);
  const [sheetStep, setSheetStep] = useState<SheetStep>("options");
  const [seats, setSeats] = useState(1);
  const [pickupMode, setPickupMode] = useState<AlloDakarPickupMode>("point_relais");
  const [pickupDetail, setPickupDetail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);
  const [payLink, setPayLink] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestStep, setRequestStep] = useState<SheetStep>("options");
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const origins = useMemo(
    () => Array.from(new Set(corridors.map((corridor) => corridor.origin_city))),
    [corridors]
  );
  const destinations = useMemo(
    () =>
      Array.from(
        new Set(
          corridors
            .filter((corridor) => !origin || corridor.origin_city === origin)
            .map((corridor) => corridor.destination_city)
        )
      ),
    [corridors, origin]
  );
  const activeCorridor = useMemo(
    () =>
      corridors.find(
        (corridor) =>
          corridor.origin_city === origin && corridor.destination_city === destination
      ) ?? null,
    [corridors, origin, destination]
  );

  async function runSearch(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setSearching(true);
      setHasSearched(true);
    }
    try {
      const fromDate =
        travelMode === "planifier"
          ? new Date(`${travelDate}T00:00:00`).toISOString()
          : new Date().toISOString();
      const rows = await searchAlloDakarDepartures({
        originCity: origin || undefined,
        destinationCity: destination || undefined,
        fromDate,
      });
      const filtered =
        travelMode === "planifier"
          ? rows.filter((row) => row.departure_at.slice(0, 10) === travelDate)
          : rows;
      setDepartures(filtered);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    void listAlloDakarCorridors()
      .then((rows) => {
        setCorridors(rows);
        const params = new URLSearchParams(window.location.search);
        setOrigin(params.get("origin") || "");
        setDestination(params.get("destination") || "");
      })
      .finally(() => setLoading(false));
    void searchAlloDakarDepartures({ fromDate: new Date().toISOString() }).then(setDepartures);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("allo-dakar-public-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "allo_dakar_departures" },
        () => void runSearch({ silent: true })
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // Les filtres courants sont volontairement repris lors d'un changement live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, travelMode, travelDate]);

  function swapCities() {
    setOrigin(destination);
    setDestination(origin);
    setHasSearched(false);
  }

  function chooseDeparture(departure: AlloDakarDeparture) {
    setSelected(departure);
    setSheetStep("options");
    setSeats(1);
    setPickupMode("point_relais");
    setPickupDetail("");
    setBookingError(null);
    setConfirmedRef(null);
    setPayLink(null);
  }

  const selectedPrice = selected
    ? pickupMode === "domicile"
      ? selected.price_domicile_fcfa ?? selected.price_per_seat_fcfa
      : selected.price_per_seat_fcfa
    : 0;

  async function confirmBooking() {
    if (!selected || !name.trim() || !phone.trim()) return;
    if (pickupMode === "domicile" && !pickupDetail.trim()) {
      setBookingError("Ajoutez votre adresse de prise en charge.");
      return;
    }
    setBooking(true);
    setBookingError(null);
    try {
      const result = await bookAlloDakarSeats({
        departureId: selected.id,
        clientFullName: name,
        clientPhone: phone,
        seats,
        pickupMode,
        pickupDetail: pickupDetail || null,
      });
      setConfirmedRef(result.id.slice(0, 8).toUpperCase());
      setPayLink(await createAlloDakarWaveCheckout(result.id).catch(() => null));
      await runSearch({ silent: true });
    } catch (reason) {
      setBookingError(
        reason instanceof Error ? reason.message : "Impossible de réserver cette place."
      );
    } finally {
      setBooking(false);
    }
  }

  function openLiveRequest() {
    setRequestOpen(true);
    setRequestStep("options");
    setRequestSent(false);
    setRequestError(null);
  }

  async function publishLiveRequest() {
    if (!activeCorridor || !name.trim() || !phone.trim()) {
      setRequestError("Choisissez un axe puis indiquez vos coordonnées.");
      return;
    }
    if (pickupMode === "domicile" && !pickupDetail.trim()) {
      setRequestError("Ajoutez votre adresse de prise en charge.");
      return;
    }
    setRequesting(true);
    setRequestError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await createAlloDakarRideRequest({
        clientUserId: user?.id ?? null,
        clientFullName: name,
        clientPhone: phone,
        corridorId: activeCorridor.id,
        desiredDate: travelMode === "maintenant" ? today() : travelDate,
        seatsNeeded: seats,
        pickupMode,
        pickupDetail: pickupDetail || null,
      });
      setRequestSent(true);
    } catch (reason) {
      setRequestError(
        reason instanceof Error ? reason.message : "Impossible de diffuser votre recherche."
      );
    } finally {
      setRequesting(false);
    }
  }

  if (loading) return <BrandedLoader fullScreen />;

  return (
    <AlloDakarShell>
      <div className="pb-8">
        <section className="relative overflow-hidden bg-[#07111f] px-4 pb-20 pt-6 text-white sm:px-6">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-emerald-400/10" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Réseau Allo Dakar en direct
            </span>
            <h1 className="mt-4 max-w-lg text-3xl font-black leading-[1.05] tracking-tight text-white">
              Où voulez-vous aller aujourd’hui ?
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
              Choisissez votre axe. Les départs publiés et les places restantes se mettent à jour automatiquement.
            </p>
          </div>
        </section>

        <section className="relative z-10 mx-4 -mt-14 rounded-[1.7rem] bg-white p-4 shadow-[0_22px_60px_rgba(7,17,31,0.2)] sm:mx-6">
          <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            {(["maintenant", "planifier"] as TravelMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setTravelMode(mode);
                  setHasSearched(false);
                }}
                className={`rounded-xl px-3 py-2.5 text-xs font-black transition ${
                  travelMode === mode
                    ? "bg-white text-[#07111f] shadow-sm"
                    : "text-slate-400"
                }`}
              >
                {mode === "maintenant" ? "Partir maintenant" : "Planifier"}
              </button>
            ))}
          </div>

          <div className="relative mt-4 grid gap-2">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <LocateFixed className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Départ</span>
                <select
                  value={origin}
                  onChange={(event) => {
                    setOrigin(event.target.value);
                    setDestination("");
                    setHasSearched(false);
                  }}
                  className="w-full bg-transparent text-sm font-black outline-none"
                >
                  <option value="">Choisir une ville</option>
                  {origins.map((city) => <option key={city}>{city}</option>)}
                </select>
              </span>
            </label>
            <button
              type="button"
              onClick={swapCities}
              disabled={!origin && !destination}
              className="absolute right-5 top-[47px] z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black shadow-sm disabled:opacity-40"
              aria-label="Inverser le trajet"
            >
              ↕
            </button>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Destination</span>
                <select
                  value={destination}
                  onChange={(event) => {
                    setDestination(event.target.value);
                    setHasSearched(false);
                  }}
                  className="w-full bg-transparent text-sm font-black outline-none"
                >
                  <option value="">Choisir une ville</option>
                  {destinations.map((city) => <option key={city}>{city}</option>)}
                </select>
              </span>
            </label>
          </div>

          {travelMode === "planifier" ? (
            <label className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-3">
              <CalendarDays className="h-4 w-4 text-amber-700" />
              <input
                type="date"
                min={today()}
                value={travelDate}
                onChange={(event) => {
                  setTravelDate(event.target.value);
                  setHasSearched(false);
                }}
                className="w-full bg-transparent text-sm font-bold outline-none"
              />
            </label>
          ) : null}

          <button
            type="button"
            onClick={() => void runSearch()}
            disabled={searching || !origin || !destination}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-4 text-sm font-black text-[#07111f] disabled:opacity-40"
          >
            {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {searching ? "Recherche sur le réseau…" : "Voir les départs disponibles"}
          </button>
        </section>

        <section className="px-4 pt-8 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                <Radar className="h-3.5 w-3.5" /> Mise à jour en direct
              </p>
              <h2 className="mt-1 text-xl font-black">
                {hasSearched ? "Résultats de votre recherche" : "Prochains départs"}
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">
              {departures.length}
            </span>
          </div>

          {searching ? (
            <div className="mt-5 rounded-[1.6rem] bg-[#07111f] p-6 text-center text-white">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10">
                <Radar className="h-8 w-8 animate-pulse text-emerald-400" />
              </span>
              <p className="mt-4 font-black text-white">Interrogation des chauffeurs et départs…</p>
              <p className="mt-1 text-xs text-white/50">Places, horaires et véhicules sont vérifiés en temps réel.</p>
            </div>
          ) : departures.length ? (
            <div className="mt-4 grid gap-3">
              {departures.map((departure, index) => (
                <button
                  key={departure.id}
                  type="button"
                  onClick={() => chooseDeparture(departure)}
                  className="w-full rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-[62px] shrink-0 text-center">
                      <p className="text-xl font-black text-[#07111f]">{departureTime(departure.departure_at)}</p>
                      <p className="mt-0.5 text-[10px] font-bold capitalize text-slate-400">{departureDay(departure.departure_at)}</p>
                    </div>
                    <div className="relative h-11 w-px bg-slate-200">
                      <span className="absolute -left-[4px] top-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                      <span className="absolute -bottom-0 -left-[4px] h-2.5 w-2.5 rounded-full bg-amber-400 ring-4 ring-amber-50" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{departure.corridor?.origin_city}</p>
                      <p className="mt-2 truncate text-sm font-black">{departure.corridor?.destination_city}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#07111f] text-xs font-black text-white">
                        {(departure.driver?.full_name || "SJ").slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 truncate text-xs font-bold">
                          Chauffeur vérifié <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        </span>
                        <span className="block truncate text-[10px] text-slate-400">
                          {departure.vehicle?.brand || "Véhicule"} {departure.vehicle?.model || ""} · {departure.seats_available} places
                        </span>
                      </span>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-black text-emerald-700">{formatFcfa(departure.price_per_seat_fcfa)}</span>
                      <span className="block text-[9px] font-bold text-slate-400">par place</span>
                    </span>
                  </div>

                  {index === 0 ? (
                    <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">
                      Prochain départ
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : hasSearched ? (
            <div className="mt-4 rounded-[1.6rem] border border-dashed border-emerald-300 bg-emerald-50/60 p-5 text-center">
              <Radar className="mx-auto h-9 w-9 text-emerald-600" />
              <h3 className="mt-3 text-lg font-black">Aucun départ publié sur cet axe</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                Diffusez votre recherche au réseau. Un chauffeur pourra créer un départ correspondant.
              </p>
              <button
                type="button"
                onClick={openLiveRequest}
                disabled={!activeCorridor}
                className="mt-4 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white disabled:opacity-40"
              >
                Rechercher un chauffeur
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-[1.6rem] bg-slate-50 p-5">
              <p className="text-sm font-bold text-slate-700">Choisissez votre départ et votre destination.</p>
              <p className="mt-1 text-xs text-slate-400">Les offres correspondant à votre trajet apparaîtront ici.</p>
            </div>
          )}

          <div className="mt-7 grid grid-cols-3 gap-2">
            {[
              { icon: ShieldCheck, label: "Chauffeurs vérifiés" },
              { icon: Sparkles, label: "Prix affichés" },
              { icon: Clock3, label: "Places en direct" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl bg-slate-100 p-3 text-center">
                  <Icon className="mx-auto h-5 w-5 text-emerald-700" />
                  <p className="mt-2 text-[10px] font-black leading-tight text-slate-600">{item.label}</p>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Vous conduisez sur ces axes ?{" "}
            <Link href="/allo-dakar/chauffeur" className="font-black text-emerald-700 underline">
              Publier un départ
            </Link>
          </p>
        </section>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[#07111f]/65 backdrop-blur-sm">
          <button type="button" className="absolute inset-0" aria-label="Fermer" onClick={() => setSelected(null)} />
          <section className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            <button type="button" onClick={() => setSelected(null)} className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100" aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>

            {confirmedRef ? (
              <div className="py-4 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-9 w-9" />
                </span>
                <h2 className="mt-5 text-2xl font-black">Votre place est réservée</h2>
                <p className="mt-2 text-sm text-slate-500">Référence {confirmedRef} · les places ont été mises à jour en direct.</p>
                {payLink ? (
                  <a href={payLink} target="_blank" rel="noreferrer" className="mt-5 block rounded-2xl bg-amber-400 px-4 py-4 text-sm font-black text-[#07111f]">
                    Payer avec Wave
                  </a>
                ) : (
                  <p className="mt-5 rounded-2xl bg-slate-100 p-3 text-xs text-slate-500">Le paiement sera finalisé avec le chauffeur.</p>
                )}
                <button type="button" className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" onClick={() => setSelected(null)}>
                  Terminer
                </button>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                  {sheetStep === "options" ? "1 · Personnalisez votre trajet" : "2 · Confirmez votre place"}
                </p>
                <div className="mt-3 rounded-[1.4rem] bg-[#07111f] p-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-white">{selected.corridor?.origin_city} → {selected.corridor?.destination_city}</p>
                      <p className="mt-1 text-xs text-white/60">{departureDay(selected.departure_at)} · {departureTime(selected.departure_at)}</p>
                    </div>
                    <CarFront className="h-7 w-7 text-amber-400" />
                  </div>
                </div>

                {sheetStep === "options" ? (
                  <div className="mt-5 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black">Nombre de places</p>
                        <p className="text-xs text-slate-400">{selected.seats_available} disponibles</p>
                      </div>
                      <div className="flex items-center gap-3 rounded-full bg-slate-100 p-1">
                        <button type="button" onClick={() => setSeats(Math.max(1, seats - 1))} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"><Minus className="h-4 w-4" /></button>
                        <span className="w-5 text-center font-black">{seats}</span>
                        <button type="button" onClick={() => setSeats(Math.min(selected.seats_available, seats + 1))} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#07111f] text-white"><Plus className="h-4 w-4" /></button>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-black">Prise en charge</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setPickupMode("point_relais")} className={`rounded-2xl border p-3 text-left ${pickupMode === "point_relais" ? "border-[#07111f] bg-[#07111f] text-white" : "border-slate-200"}`}>
                          <MapPin className="h-4 w-4" />
                          <span className="mt-2 block text-xs font-black">Point relais</span>
                          <span className="mt-1 block text-[10px] opacity-60">{formatFcfa(selected.price_per_seat_fcfa)}</span>
                        </button>
                        <button type="button" disabled={!selected.price_domicile_fcfa} onClick={() => setPickupMode("domicile")} className={`rounded-2xl border p-3 text-left disabled:opacity-35 ${pickupMode === "domicile" ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-200"}`}>
                          <LocateFixed className="h-4 w-4" />
                          <span className="mt-2 block text-xs font-black">À domicile</span>
                          <span className="mt-1 block text-[10px] opacity-60">{selected.price_domicile_fcfa ? formatFcfa(selected.price_domicile_fcfa) : "Indisponible"}</span>
                        </button>
                      </div>
                      <input value={pickupDetail} onChange={(event) => setPickupDetail(event.target.value)} placeholder={pickupMode === "domicile" ? "Votre adresse exacte" : "Point souhaité (optionnel)"} className="input-base mt-2" />
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4">
                      <span className="text-xs font-bold text-emerald-800">Total, sans surprise</span>
                      <span className="text-xl font-black text-emerald-950">{formatFcfa(selectedPrice * seats)}</span>
                    </div>
                    <button type="button" onClick={() => setSheetStep("contact")} className="w-full rounded-2xl bg-amber-400 px-4 py-4 text-sm font-black text-[#07111f]">
                      Continuer <ArrowRight className="ml-1 inline h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    <label className="block rounded-2xl border border-slate-200 px-3 py-2.5">
                      <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Nom du passager</span>
                      <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full bg-transparent text-sm font-bold outline-none" placeholder="Votre nom complet" />
                    </label>
                    <label className="block rounded-2xl border border-slate-200 px-3 py-2.5">
                      <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Téléphone / WhatsApp</span>
                      <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" className="mt-1 w-full bg-transparent text-sm font-bold outline-none" placeholder="+221 77 000 00 00" />
                    </label>
                    <div className="rounded-2xl bg-slate-100 p-3 text-xs text-slate-500">
                      <ShieldCheck className="mr-1 inline h-4 w-4 text-emerald-600" /> Vos coordonnées sont transmises au chauffeur uniquement après confirmation.
                    </div>
                    {bookingError ? <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{bookingError}</p> : null}
                    <div className="grid grid-cols-[auto_1fr] gap-2">
                      <button type="button" onClick={() => setSheetStep("options")} className="rounded-2xl border border-slate-200 px-4 py-4 text-sm font-bold">Retour</button>
                      <button type="button" disabled={booking || !name.trim() || !phone.trim()} onClick={() => void confirmBooking()} className="rounded-2xl bg-amber-400 px-4 py-4 text-sm font-black text-[#07111f] disabled:opacity-40">
                        {booking ? "Confirmation…" : `Confirmer · ${formatFcfa(selectedPrice * seats)}`}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      ) : null}

      {requestOpen ? (
        <div className="fixed inset-0 z-[210] flex items-end justify-center bg-[#07111f]/65 backdrop-blur-sm">
          <button type="button" className="absolute inset-0" aria-label="Fermer" onClick={() => setRequestOpen(false)} />
          <section className="relative w-full max-w-xl rounded-t-[2rem] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            {requestSent ? (
              <div className="py-5 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-8 w-8 text-emerald-700" />
                </span>
                <h2 className="mt-4 text-2xl font-black">Recherche diffusée</h2>
                <p className="mt-2 text-sm text-slate-500">Les chauffeurs de l’axe {origin} → {destination} peuvent maintenant organiser un départ.</p>
                <button type="button" onClick={() => setRequestOpen(false)} className="mt-5 w-full rounded-2xl bg-[#07111f] px-4 py-4 text-sm font-black text-white">Compris</button>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Recherche réseau · {requestStep === "options" ? "Préférences" : "Contact"}</p>
                <h2 className="mt-2 text-xl font-black">{origin} → {destination}</h2>
                {requestStep === "options" ? (
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-100 p-3">
                      <span className="text-sm font-bold"><UsersRound className="mr-2 inline h-4 w-4" /> Places recherchées</span>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setSeats(Math.max(1, seats - 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-white"><Minus className="h-3.5 w-3.5" /></button>
                        <b>{seats}</b>
                        <button type="button" onClick={() => setSeats(Math.min(10, seats + 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#07111f] text-white"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setPickupMode("point_relais")} className={`rounded-2xl border p-3 text-xs font-black ${pickupMode === "point_relais" ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-200"}`}>Point relais</button>
                      <button type="button" onClick={() => setPickupMode("domicile")} className={`rounded-2xl border p-3 text-xs font-black ${pickupMode === "domicile" ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-200"}`}>À domicile</button>
                    </div>
                    <input value={pickupDetail} onChange={(event) => setPickupDetail(event.target.value)} className="input-base" placeholder={pickupMode === "domicile" ? "Votre adresse" : "Point souhaité (optionnel)"} />
                    <button type="button" onClick={() => setRequestStep("contact")} className="w-full rounded-2xl bg-emerald-700 px-4 py-4 text-sm font-black text-white">Continuer</button>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    <input value={name} onChange={(event) => setName(event.target.value)} className="input-base" placeholder="Nom complet" />
                    <input value={phone} onChange={(event) => setPhone(event.target.value)} className="input-base" type="tel" placeholder="Téléphone / WhatsApp" />
                    {requestError ? <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{requestError}</p> : null}
                    <div className="grid grid-cols-[auto_1fr] gap-2">
                      <button type="button" onClick={() => setRequestStep("options")} className="rounded-2xl border border-slate-200 px-4 py-4 text-sm font-bold">Retour</button>
                      <button type="button" disabled={requesting || !name.trim() || !phone.trim()} onClick={() => void publishLiveRequest()} className="rounded-2xl bg-amber-400 px-4 py-4 text-sm font-black text-[#07111f] disabled:opacity-40">
                        {requesting ? "Diffusion…" : "Diffuser ma recherche"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      ) : null}
    </AlloDakarShell>
  );
}
