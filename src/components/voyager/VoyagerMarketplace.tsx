"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BusFront,
  CalendarDays,
  Clock3,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  TicketCheck,
  UsersRound,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/hooks/useAuth";
import { formatFcfa } from "@/lib/sentrajetPricing";
import {
  createVoyagerBooking,
  searchVoyagerDepartures,
  startVoyagerPayment,
  type VoyagerBooking,
  type VoyagerDeparture,
} from "@/lib/voyagerOps";

const VEHICLE_LABELS: Record<string, string> = {
  citadine: "Petite voiture",
  berline: "Berline",
  suv: "SUV",
  minivan: "Minivan",
  minibus: "Minibus",
  bus: "Bus",
};

function today() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function VoyagerMarketplace() {
  const { profile } = useAuth();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [departures, setDepartures] = useState<VoyagerDeparture[]>([]);
  const [selected, setSelected] = useState<VoyagerDeparture | null>(null);
  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [seats, setSeats] = useState(1);
  const [booking, setBooking] = useState<VoyagerBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingNow, setBookingNow] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!name && profile?.full_name) setName(profile.full_name);
    if (!phone && profile?.phone) setPhone(profile.phone);
  }, [name, phone, profile]);

  async function search(filters = { origin, destination, date }) {
    setLoading(true);
    setMessage(null);
    try {
      setDepartures(await searchVoyagerDepartures(filters));
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Départs indisponibles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialOrigin = params.get("origin") ?? "";
    const initialDestination = params.get("destination") ?? "";
    const initialDate = params.get("date") ?? "";
    setOrigin(initialOrigin);
    setDestination(initialDestination);
    setDate(initialDate);
    void search({
      origin: initialOrigin,
      destination: initialDestination,
      date: initialDate,
    });
    // Chargement initial uniquement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(
    () => (selected ? selected.pricePerSeatFcfa * seats : 0),
    [seats, selected],
  );

  async function reserve() {
    if (!selected) return;
    if (!name.trim() || phone.replace(/\D/g, "").length < 9) {
      setMessage("Indiquez votre nom et un téléphone joignable.");
      return;
    }
    setBookingNow(true);
    setMessage(null);
    try {
      const created = await createVoyagerBooking({
        departureId: selected.id,
        fullName: name,
        phone,
        seats,
      });
      setBooking(created);
      const payment = await startVoyagerPayment(created.id);
      if (payment.checkoutUrl) {
        window.location.assign(payment.checkoutUrl);
        return;
      }
      setMessage(
        "Mode démonstration : vos places sont bloquées 15 minutes, mais aucun paiement n’a été effectué.",
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Réservation impossible.");
    } finally {
      setBookingNow(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f5f7] pb-24 text-[#07111f]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Link href="/compte" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Logo className="flex-1 [&_img]:!h-7" />
          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-amber-900">
            Voyager
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pt-5">
        <section className="overflow-hidden rounded-[1.75rem] bg-[#07111f] p-5 text-white sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
            Lignes régionales
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-white">
            Les horaires du Sénégal, réunis au même endroit.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
            Comparez les compagnies vérifiées, choisissez un départ et payez vos places à SentraJet.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void search();
            }}
            className="mt-6 grid gap-2 rounded-3xl bg-white p-3 text-[#07111f] sm:grid-cols-[1fr_1fr_150px_auto]"
          >
            <label className="rounded-2xl bg-slate-100 px-3 py-2">
              <span className="text-[10px] font-black uppercase text-slate-400">Départ</span>
              <input value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="Dakar" className="mt-1 w-full bg-transparent text-sm font-bold outline-none" />
            </label>
            <label className="rounded-2xl bg-slate-100 px-3 py-2">
              <span className="text-[10px] font-black uppercase text-slate-400">Destination</span>
              <input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Saint-Louis" className="mt-1 w-full bg-transparent text-sm font-bold outline-none" />
            </label>
            <label className="rounded-2xl bg-slate-100 px-3 py-2">
              <span className="text-[10px] font-black uppercase text-slate-400">Date</span>
              <input type="date" min={today()} value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full bg-transparent text-sm font-bold outline-none" />
            </label>
            <button type="submit" className="flex min-h-12 items-center justify-center rounded-2xl bg-amber-400 px-4 text-sm font-black">
              <Search className="mr-2 h-4 w-4" /> Chercher
            </button>
          </form>
        </section>

        <div className="mb-3 mt-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Départs disponibles</p>
            <h2 className="mt-1 text-xl font-black">{departures.length} horaire{departures.length === 1 ? "" : "s"}</h2>
          </div>
          <Link href="/premium-interurbain" className="text-xs font-bold text-amber-700">
            Voyage privé
          </Link>
        </div>

        {message && !selected ? (
          <p className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{message}</p>
        ) : null}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-amber-600" /></div>
        ) : (
          <div className="grid gap-3">
            {departures.map((departure) => (
              <button
                key={departure.id}
                type="button"
                onClick={() => {
                  setSelected(departure);
                  setBooking(null);
                  setSeats(1);
                  setMessage(null);
                }}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-amber-300"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100"><BusFront className="h-6 w-6" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <b>{departure.line.originCity} → {departure.line.destinationCity}</b>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{departure.line.operator.displayName}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(departure.departureAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                      {" · "}{VEHICLE_LABELS[departure.vehicleType] ?? departure.vehicleType}
                    </p>
                    <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-amber-600" /> {departure.line.boardingPoint}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <b className="text-base">{formatFcfa(departure.pricePerSeatFcfa)}</b>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">{departure.seatsAvailable} places</p>
                  </div>
                </div>
              </button>
            ))}
            {!departures.length ? (
              <div className="rounded-3xl bg-white p-8 text-center">
                <CalendarDays className="mx-auto h-9 w-9 text-slate-300" />
                <h3 className="mt-3 font-black">Aucun départ trouvé</h3>
                <p className="mt-1 text-sm text-slate-500">Essayez une autre date ou retirez un filtre.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#07111f]/60 p-3 backdrop-blur-sm sm:items-center">
          <button type="button" className="absolute inset-0" onClick={() => !bookingNow && setSelected(null)} aria-label="Fermer" />
          <section className="relative w-full max-w-md rounded-[1.75rem] bg-white p-5 shadow-2xl">
            {booking ? (
              <>
                <TicketCheck className="h-11 w-11 text-emerald-600" />
                <h2 className="mt-3 text-2xl font-black">Places réservées</h2>
                <p className="mt-2 text-sm text-slate-500">{booking.reference} · paiement en attente</p>
                {message ? <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{message}</p> : null}
                <Link href="/compte/reservations" className="mt-5 block rounded-2xl bg-[#07111f] px-4 py-3 text-center text-sm font-black text-white">
                  Voir Mes trajets
                </Link>
              </>
            ) : (
              <>
                <p className="text-xs font-black uppercase tracking-wide text-amber-700">{selected.line.operator.displayName}</p>
                <h2 className="mt-1 text-2xl font-black">{selected.line.originCity} → {selected.line.destinationCity}</h2>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl bg-slate-100 p-3"><Clock3 className="h-4 w-4" /><b className="mt-2 block">{new Date(selected.departureAt).toLocaleString("fr-FR")}</b></div>
                  <div className="rounded-2xl bg-slate-100 p-3"><UsersRound className="h-4 w-4" /><b className="mt-2 block">{selected.seatsAvailable} places restantes</b></div>
                </div>
                <div className="mt-4 grid grid-cols-[100px_1fr] gap-2">
                  <label className="rounded-2xl border border-slate-200 px-3 py-2"><span className="text-[10px] font-black text-slate-400">PLACES</span><input type="number" min={1} max={Math.min(10, selected.seatsAvailable)} value={seats} onChange={(event) => setSeats(Math.max(1, Math.min(selected.seatsAvailable, Number(event.target.value) || 1)))} className="mt-1 w-full text-lg font-black outline-none" /></label>
                  <label className="rounded-2xl border border-slate-200 px-3 py-2"><span className="text-[10px] font-black text-slate-400">TÉLÉPHONE</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full text-sm font-bold outline-none" /></label>
                </div>
                <label className="mt-2 block rounded-2xl border border-slate-200 px-3 py-2"><span className="text-[10px] font-black text-slate-400">NOM DU PASSAGER</span><input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full text-sm font-bold outline-none" /></label>
                {message ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
                <div className="mt-4 flex items-center justify-between"><span className="text-sm text-slate-500">Total</span><b className="text-2xl">{formatFcfa(total)}</b></div>
                <button type="button" onClick={() => void reserve()} disabled={bookingNow} className="mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl bg-amber-400 px-4 font-black disabled:opacity-50">
                  {bookingNow ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                  Réserver et payer
                </button>
                <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">Le paiement est encaissé par SentraJet. Les coordonnées de l’opérateur restent protégées.</p>
              </>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}
