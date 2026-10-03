"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  MapPin,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { AlloDakarShell } from "@/components/allo-dakar/AlloDakarShell";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import {
  bookAlloDakarSeats,
  createAlloDakarRideRequest,
  createAlloDakarWaveCheckout,
  listAlloDakarCorridors,
  listOpenAlloDakarRideRequests,
  searchAlloDakarDepartures,
  type AlloDakarCorridor,
  type AlloDakarDeparture,
  type AlloDakarPickupMode,
  type AlloDakarRideRequest,
} from "@/lib/alloDakarOps";
import { supabase } from "@/lib/supabase";

export default function AlloDakarPage() {
  const [corridors, setCorridors] = useState<AlloDakarCorridor[]>([]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departures, setDepartures] = useState<AlloDakarDeparture[]>([]);
  const [rideRequests, setRideRequests] = useState<AlloDakarRideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AlloDakarDeparture | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [seats, setSeats] = useState(1);
  const [pickupMode, setPickupMode] = useState<AlloDakarPickupMode>("point_relais");
  const [pickupDetail, setPickupDetail] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);
  const [payLink, setPayLink] = useState<string | null>(null);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqCorridorId, setReqCorridorId] = useState("");
  const [reqDate, setReqDate] = useState("");
  const [reqSeats, setReqSeats] = useState(1);
  const [reqName, setReqName] = useState("");
  const [reqPhone, setReqPhone] = useState("");
  const [reqPickupMode, setReqPickupMode] = useState<AlloDakarPickupMode>("point_relais");
  const [reqPickupDetail, setReqPickupDetail] = useState("");
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqSent, setReqSent] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  const origins = useMemo(() => Array.from(new Set(corridors.map((c) => c.origin_city))), [corridors]);
  const destinations = useMemo(() => Array.from(new Set(corridors.map((c) => c.destination_city))), [corridors]);

  async function runSearch() {
    setSearching(true);
    try {
      const results = await searchAlloDakarDepartures({
        originCity: origin || undefined,
        destinationCity: destination || undefined,
        fromDate: new Date().toISOString(),
      });
      setDepartures(results);
    } finally {
      setSearching(false);
    }
  }

  async function loadRideRequests() {
    const results = await listOpenAlloDakarRideRequests().catch(() => []);
    setRideRequests(results);
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
    void runSearch();
    void loadRideRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !name.trim() || !phone.trim()) return;
    if (pickupMode === "domicile" && !pickupDetail.trim()) return;
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
      setConfirmedRef(result.id.slice(0, 8));
      const checkoutUrl = await createAlloDakarWaveCheckout(result.id).catch(() => null);
      setPayLink(checkoutUrl);
      await runSearch();
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Impossible de réserver cette place.");
    } finally {
      setBooking(false);
    }
  }

  const selectedPrice = selected ? (pickupMode === "domicile" ? selected.price_domicile_fcfa ?? 0 : selected.price_per_seat_fcfa) : 0;

  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!reqCorridorId || !reqDate || !reqName.trim() || !reqPhone.trim()) return;
    if (reqPickupMode === "domicile" && !reqPickupDetail.trim()) return;
    setReqSubmitting(true);
    setReqError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await createAlloDakarRideRequest({
        clientUserId: user?.id ?? null,
        clientFullName: reqName,
        clientPhone: reqPhone,
        corridorId: reqCorridorId,
        desiredDate: reqDate,
        seatsNeeded: reqSeats,
        pickupMode: reqPickupMode,
        pickupDetail: reqPickupDetail || null,
      });
      setReqSent(true);
      await loadRideRequests();
    } catch (err) {
      setReqError(err instanceof Error ? err.message : "Impossible d’envoyer cette demande.");
    } finally {
      setReqSubmitting(false);
    }
  }

  if (loading) return <BrandedLoader fullScreen />;

  return (
    <AlloDakarShell>
      <div className="px-4 pb-8 pt-5 sm:px-6">
        <div className="rounded-[1.5rem] bg-[#07111f] p-5 text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-300">
            <CarFront className="h-3.5 w-3.5" /> Covoiturage interurbain
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white">
            Trouvez une place pour votre prochain trajet.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">
            Allo Dakar est le service économique de SentraJet : départs publiés, chauffeurs vérifiés et réservation à la place.
          </p>
        </div>

        <section className="relative z-10 -mt-3 rounded-[1.4rem] border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(7,17,31,0.14)]">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <label className="rounded-2xl bg-slate-100 px-3 py-2">
              <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Départ</span>
              <select className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                <option value="">Toutes les villes</option>
                {origins.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </label>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <label className="rounded-2xl bg-slate-100 px-3 py-2">
              <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Arrivée</span>
              <select className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none" value={destination} onChange={(e) => setDestination(e.target.value)}>
                <option value="">Toutes les villes</option>
                {destinations.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </label>
          </div>
          <button
            type="button"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3.5 text-sm font-extrabold text-[#07111f]"
            onClick={() => void runSearch()}
            disabled={searching}
          >
            <Search className="h-4 w-4" />
            {searching ? "Recherche des départs…" : "Rechercher un trajet"}
          </button>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-700">Disponibles maintenant</p>
              <h2 className="mt-1 text-xl font-extrabold">Départs publiés</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
              {departures.length} trajet{departures.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {departures.map((dep) => (
              <article key={dep.id} className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-extrabold text-slate-900">
                      {dep.corridor?.origin_city} <ArrowRight className="mx-1 inline h-3.5 w-3.5" /> {dep.corridor?.destination_city}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(dep.departure_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <span className="shrink-0 text-right text-sm font-extrabold text-emerald-700">
                    {formatFcfa(dep.price_per_seat_fcfa)}
                    <span className="block text-[9px] font-semibold text-slate-400">par place</span>
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <UsersRound className="h-3.5 w-3.5" /> {dep.seats_available} place{dep.seats_available > 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <CarFront className="h-3.5 w-3.5" /> {dep.vehicle?.brand || "Véhicule"} {dep.vehicle?.model || ""}
                  </span>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Chauffeur vérifié{dep.driver?.garage_name ? ` · Antenne ${dep.driver.garage_name}` : ""}
                </p>
                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#07111f] px-4 py-3 text-sm font-extrabold text-white"
                  onClick={() => {
                    setSelected(dep);
                    setConfirmedRef(null);
                    setPayLink(null);
                    setBookingError(null);
                    setPickupMode("point_relais");
                    setPickupDetail("");
                    setSeats(1);
                  }}
                >
                  Réserver cette place <ArrowRight className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>
          {!departures.length ? (
            <div className="mt-4 rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <MapPin className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-2 text-sm font-bold text-slate-700">Aucun départ ne correspond pour le moment.</p>
              <p className="mt-1 text-xs text-slate-400">Publiez votre besoin pour être contacté par un chauffeur.</p>
            </div>
          ) : null}
        </section>

        <section className="mt-9">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-700">Demande communautaire</p>
              <h2 className="mt-1 text-xl font-extrabold">Besoins des voyageurs</h2>
            </div>
            <button type="button" className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-extrabold text-amber-900" onClick={() => setShowRequestForm(true)}>
              + Publier
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Les chauffeurs voient ces destinations et peuvent proposer un départ correspondant.
          </p>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {rideRequests.slice(0, 8).map((request) => (
              <article key={request.id} className="min-w-[250px] rounded-[1.4rem] border border-slate-200 bg-white p-4">
                <p className="font-extrabold text-slate-900">
                  {request.corridor?.origin_city} <ArrowRight className="mx-1 inline h-3.5 w-3.5" /> {request.corridor?.destination_city}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" /> {new Date(request.desired_date).toLocaleDateString("fr-FR")}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <UsersRound className="h-3.5 w-3.5" /> {request.seats_needed} place{request.seats_needed > 1 ? "s" : ""} recherchée{request.seats_needed > 1 ? "s" : ""}
                </p>
                <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                  Demande ouverte
                </span>
              </article>
            ))}
            {!rideRequests.length ? (
              <div className="w-full rounded-[1.4rem] bg-slate-50 p-5 text-center text-sm text-slate-500">
                Aucun besoin public actuellement. Soyez le premier à publier le vôtre.
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-5 rounded-[1.4rem] border border-emerald-100 bg-emerald-50/70 p-4">
          {reqSent ? (
            <p className="text-sm font-bold text-emerald-800">
              Demande envoyée ! Elle apparaît maintenant parmi les besoins voyageurs.
            </p>
          ) : showRequestForm ? (
            <form onSubmit={handleCreateRequest} className="space-y-3">
              <h3 className="text-base font-extrabold text-slate-900">Publier mon besoin de trajet</h3>
              {reqError ? <p className="text-sm text-red-600">{reqError}</p> : null}
              <select className="input-base" value={reqCorridorId} onChange={(e) => setReqCorridorId(e.target.value)} required>
                <option value="">Choisir un axe</option>
                {corridors.map((corridor) => (
                  <option key={corridor.id} value={corridor.id}>{corridor.origin_city} → {corridor.destination_city}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="input-base" value={reqDate} onChange={(e) => setReqDate(e.target.value)} required />
                <input type="number" min={1} max={10} className="input-base" value={reqSeats} onChange={(e) => setReqSeats(Math.max(1, Number(e.target.value) || 1))} aria-label="Nombre de places" />
              </div>
              <input className="input-base" placeholder="Nom complet" value={reqName} onChange={(e) => setReqName(e.target.value)} required />
              <input className="input-base" placeholder="Téléphone" value={reqPhone} onChange={(e) => setReqPhone(e.target.value)} required />
              <div className="grid grid-cols-2 gap-2">
                {(["point_relais", "domicile"] as AlloDakarPickupMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${
                      reqPickupMode === mode ? "border-emerald-700 bg-emerald-700 text-white" : "border-emerald-200 bg-white text-emerald-900"
                    }`}
                    onClick={() => setReqPickupMode(mode)}
                  >
                    {mode === "point_relais" ? "Point relais" : "À domicile"}
                  </button>
                ))}
              </div>
              <input
                className="input-base"
                placeholder={reqPickupMode === "domicile" ? "Adresse de prise en charge" : "Point souhaité (optionnel)"}
                value={reqPickupDetail}
                onChange={(e) => setReqPickupDetail(e.target.value)}
                required={reqPickupMode === "domicile"}
              />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" onClick={() => setShowRequestForm(false)}>
                  Annuler
                </button>
                <button type="submit" className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-extrabold text-[#07111f]" disabled={reqSubmitting}>
                  {reqSubmitting ? "Publication…" : "Publier"}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-extrabold text-emerald-950">Vous ne trouvez pas votre trajet ?</p>
                <p className="mt-1 text-xs text-emerald-800/70">Indiquez votre besoin aux chauffeurs Allo Dakar.</p>
              </div>
              <button type="button" className="shrink-0 rounded-2xl bg-emerald-700 px-4 py-3 text-xs font-extrabold text-white" onClick={() => setShowRequestForm(true)}>
                Publier
              </button>
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          Vous êtes chauffeur ?{" "}
          <Link href="/allo-dakar/chauffeur" className="font-bold text-emerald-700 underline">
            Rejoindre le réseau SentraJet
          </Link>
        </p>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[#07111f]/60 p-3 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-5 shadow-2xl sm:p-6">
            {confirmedRef ? (
              <>
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-7 w-7" />
                </span>
                <h3 className="mt-4 text-xl font-extrabold text-neutral-900">Réservation confirmée</h3>
                <p className="mt-2 text-sm text-neutral-600">Référence {confirmedRef}. Le chauffeur vous contactera avant le départ.</p>
                {payLink ? (
                  <a href={payLink} target="_blank" rel="noreferrer" className="mt-4 block rounded-2xl bg-amber-400 px-4 py-3.5 text-center text-sm font-extrabold text-[#07111f]">
                    Payer maintenant via Wave
                  </a>
                ) : (
                  <p className="mt-4 text-xs text-neutral-500">Le paiement pourra être finalisé auprès du chauffeur.</p>
                )}
                <button type="button" className="mt-3 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold" onClick={() => setSelected(null)}>
                  Fermer
                </button>
              </>
            ) : (
              <form onSubmit={handleBook}>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">Allo Dakar · Réserver une place</span>
                <h3 className="mt-2 text-xl font-extrabold text-neutral-900">
                  {selected.corridor?.origin_city} → {selected.corridor?.destination_city}
                </h3>
                <p className="text-sm text-neutral-600">{new Date(selected.departure_at).toLocaleString("fr-FR")}</p>
                {bookingError ? <p className="mt-2 text-sm text-red-600">{bookingError}</p> : null}
                <div className="mt-4 space-y-3">
                  <input className="input-base" placeholder="Nom complet" value={name} onChange={(e) => setName(e.target.value)} required />
                  <input className="input-base" placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-neutral-500">Nombre de places</label>
                    <input
                      type="number"
                      min={1}
                      max={selected.seats_available}
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm"
                      value={seats}
                      onChange={(e) => setSeats(Math.max(1, Math.min(selected.seats_available, Number(e.target.value) || 1)))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-neutral-500">Prise en charge</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${pickupMode === "point_relais" ? "border-[#07111f] bg-[#07111f] text-white" : "border-neutral-300 text-neutral-700"}`}
                        onClick={() => setPickupMode("point_relais")}
                      >
                        Point relais · {formatFcfa(selected.price_per_seat_fcfa)}
                      </button>
                      {selected.price_domicile_fcfa ? (
                        <button
                          type="button"
                          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${pickupMode === "domicile" ? "border-[#07111f] bg-[#07111f] text-white" : "border-neutral-300 text-neutral-700"}`}
                          onClick={() => setPickupMode("domicile")}
                        >
                          Domicile · {formatFcfa(selected.price_domicile_fcfa)}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {pickupMode === "domicile" ? (
                    <input
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm"
                      placeholder="Adresse de prise en charge"
                      value={pickupDetail}
                      onChange={(e) => setPickupDetail(e.target.value)}
                      required
                    />
                  ) : (
                    <input
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm"
                      placeholder="Point de rendez-vous souhaité (optionnel)"
                      value={pickupDetail}
                      onChange={(e) => setPickupDetail(e.target.value)}
                    />
                  )}
                </div>
                <p className="mt-3 text-sm font-bold text-neutral-900">
                  Total : {formatFcfa(selectedPrice * seats)}
                </p>
                <div className="mt-4 flex gap-2">
                  <button type="button" className="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold" onClick={() => setSelected(null)} disabled={booking}>
                    Annuler
                  </button>
                  <button type="submit" className="flex-1 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-extrabold text-[#07111f]" disabled={booking}>
                    {booking ? "Réservation…" : "Confirmer"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </AlloDakarShell>
  );
}
