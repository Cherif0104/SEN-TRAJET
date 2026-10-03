"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, CalendarClock, Car, Check, Clock3, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react";
import { AddressAutocomplete, type SelectedPlace } from "@/components/booking/AddressAutocomplete";
import { Logo } from "@/components/layout/Logo";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { useAuth } from "@/hooks/useAuth";
import { formatFcfa } from "@/lib/sentrajetPricing";
import {
  createVipBooking,
  listVipOffers,
  startVipPayment,
  vipIncludedKm,
  vipPrice,
  type VipDuration,
  type VipVehicleOffer,
} from "@/lib/vipService";

function defaultPickupTime(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

const durations: Array<{ value: VipDuration; title: string; detail: string }> = [
  { value: 4, title: "Demi-journée", detail: "4 heures" },
  { value: 8, title: "Journée", detail: "8 heures" },
  { value: 12, title: "Grande journée", detail: "12 heures" },
];

function VehicleVisual({ offer }: { offer: VipVehicleOffer }) {
  const photo = offer.photoUrl || offer.photoUrls[0];
  return (
    <div className="relative h-40 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1b304e] to-[#bf9121]">
      {photo ? <Image src={photo} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 360px" /> : <Car className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white/80" />}
      <div className="absolute inset-0 bg-gradient-to-t from-[#07111f]/75 to-transparent" />
      <span className="absolute left-3 top-3 rounded-full bg-[#07111f]/85 px-3 py-1 text-[11px] font-bold text-white">{offer.category}</span>
    </div>
  );
}

export default function VipPage() {
  const { profile } = useAuth();
  const initialTime = useMemo(defaultPickupTime, []);
  const [pickupTime, setPickupTime] = useState(initialTime);
  const [duration, setDuration] = useState<VipDuration>(8);
  const [passengers, setPassengers] = useState(1);
  const [pickup, setPickup] = useState<SelectedPlace | null>(null);
  const [pickupText, setPickupText] = useState("");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [offers, setOffers] = useState<VipVehicleOffer[]>([]);
  const [selected, setSelected] = useState<VipVehicleOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);

  async function refreshOffers(nextDuration = duration, nextPassengers = passengers) {
    const start = new Date(pickupTime);
    if (!Number.isFinite(start.getTime())) {
      setOffers([]);
      setSelected(null);
      setError("Sélectionnez une date et une heure valides.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listVipOffers({
        pickupTime: start.toISOString(),
        durationHours: nextDuration,
        passengers: nextPassengers,
      });
      setOffers(rows);
      setSelected((current) => rows.find((row) => row.vehicleId === current?.vehicleId) ?? rows[0] ?? null);
    } catch (cause) {
      setOffers([]);
      setSelected(null);
      setError(cause instanceof Error ? cause.message : "Disponibilités indisponibles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!phone && profile?.phone) setPhone(profile.phone);
  }, [phone, profile?.phone]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshOffers(), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupTime, duration, passengers]);

  async function reserve() {
    if (!selected || !pickup) {
      setError("Sélectionnez le lieu de prise en charge et un véhicule.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSimulationMessage(null);
    try {
      const booking = await createVipBooking({
        vehicleId: selected.vehicleId,
        pickup: pickup.address,
        pickupTime: new Date(pickupTime).toISOString(),
        durationHours: duration,
        passengers,
        phone,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        notes,
      });
      const payment = await startVipPayment(booking.paymentId);
      if (payment.checkoutUrl) {
        window.location.assign(payment.checkoutUrl);
        return;
      }
      setSimulationMessage(`Réservation ${booking.reference} enregistrée. Le paiement Wave est en mode démonstration.`);
      window.setTimeout(() => window.location.assign(`/compte/reservations/${booking.bookingId}`), 1800);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Réservation impossible.");
      await refreshOffers();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f5f8] text-[#07111f]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/compte" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100" aria-label="Retour"><ArrowLeft className="h-5 w-5" /></Link>
          <Logo className="flex-1 [&_img]:!h-7" />
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">VIP</span>
        </div>
      </header>

      <section className="bg-[#07111f] px-4 pb-20 pt-8 text-white sm:pb-24 sm:pt-12">
        <div className="mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-300"><Sparkles className="h-4 w-4" /> Mise à disposition</span>
          <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">Votre chauffeur privé, selon votre agenda.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Choisissez une durée et un véhicule précis. Le prix et la disponibilité sont confirmés immédiatement.</p>
        </div>
      </section>

      <div className="mx-auto -mt-12 grid max-w-6xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-[1.25fr_.75fr]">
        <section className="space-y-5">
          <div className="rounded-3xl bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-6">
            <h2 className="font-black">1. Quand et pour combien de temps ?</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="rounded-2xl border border-slate-200 p-3"><span className="flex items-center gap-2 text-xs font-bold text-slate-500"><CalendarClock className="h-4 w-4" /> Début de prestation</span><input type="datetime-local" value={pickupTime} min={initialTime} onChange={(event) => setPickupTime(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold outline-none" /></label>
              <label className="rounded-2xl border border-slate-200 p-3"><span className="flex items-center gap-2 text-xs font-bold text-slate-500"><Users className="h-4 w-4" /> Passagers</span><select value={passengers} onChange={(event) => setPassengers(Number(event.target.value))} className="mt-2 w-full bg-transparent text-sm font-bold outline-none">{Array.from({ length: 11 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value} passager{value > 1 ? "s" : ""}</option>)}</select></label>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {durations.map((item) => <button key={item.value} type="button" onClick={() => setDuration(item.value)} className={`rounded-2xl border p-3 text-left transition ${duration === item.value ? "border-amber-400 bg-amber-50 ring-2 ring-amber-300" : "border-slate-200"}`}><Clock3 className="h-4 w-4 text-amber-700" /><b className="mt-2 block text-xs sm:text-sm">{item.title}</b><span className="text-[11px] text-slate-500">{item.detail}</span></button>)}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-3"><div><h2 className="font-black">2. Choisissez votre véhicule</h2><p className="mt-1 text-xs text-slate-500">Uniquement les véhicules libres sur ce créneau.</p></div><span className="text-xs font-bold text-slate-400">{offers.length} disponible{offers.length > 1 ? "s" : ""}</span></div>
            {loading ? <div className="flex justify-center py-16"><BrandedLoader /></div> : offers.length === 0 ? <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">Aucun véhicule ne correspond à ce créneau.</div> : <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {offers.map((offer) => <button key={offer.id} type="button" onClick={() => setSelected(offer)} className={`overflow-hidden rounded-3xl border bg-white p-2 text-left transition ${selected?.id === offer.id ? "border-amber-400 ring-2 ring-amber-300" : "border-slate-200 hover:border-slate-300"}`}><VehicleVisual offer={offer} /><div className="p-3"><div className="flex items-start justify-between gap-2"><div><h3 className="font-black">{offer.brand} {offer.model}</h3><p className="text-xs text-slate-500">{offer.seats} places · {offer.luggageCapacity || "Confort premium"}</p></div>{selected?.id === offer.id ? <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400"><Check className="h-4 w-4" /></span> : null}</div><p className="mt-3 text-lg font-black">{formatFcfa(vipPrice(offer, duration))}</p></div></button>)}
            </div>}
          </div>
        </section>

        <aside className="h-fit rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-200 lg:sticky lg:top-20 sm:p-6">
          <h2 className="font-black">3. Finalisez</h2>
          <div className="mt-4"><AddressAutocomplete label="Lieu de prise en charge" placeholder="Hôtel, bureau, domicile…" value={pickup} textValue={pickupText} onSelect={(place) => { setPickup(place); setPickupText(place.address); }} onClear={() => { setPickup(null); setPickupText(""); }} showMyLocation accent="pickup" /></div>
          <label className="mt-3 block"><span className="text-xs font-bold text-slate-500">Téléphone joignable</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+221 77 000 00 00" className="mt-1 min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-amber-400" /></label>
          <label className="mt-3 block"><span className="text-xs font-bold text-slate-500">Instructions facultatives</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Programme, arrêts prévus, accueil VIP…" rows={3} className="mt-1 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:border-amber-400" /></label>
          {selected ? <div className="mt-5 rounded-2xl bg-[#07111f] p-4 text-white"><div className="flex items-center justify-between"><span className="text-sm text-slate-300">{duration} h avec chauffeur</span><b>{formatFcfa(vipPrice(selected, duration))}</b></div><div className="mt-2 flex items-center justify-between text-xs text-slate-400"><span>{vipIncludedKm(selected, duration)} km inclus</span><span>Puis {formatFcfa(selected.extraKmRateFcfa)}/km</span></div><div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-emerald-300"><BadgeCheck className="h-4 w-4" /> Véhicule bloqué après confirmation</div></div> : null}
          {error ? <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p> : null}
          {simulationMessage ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{simulationMessage}</p> : null}
          <button type="button" onClick={() => void reserve()} disabled={!selected || !pickup || submitting} className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl bg-amber-400 px-5 font-black text-[#07111f] disabled:opacity-45">{submitting ? "Confirmation…" : selected ? `Réserver · ${formatFcfa(vipPrice(selected, duration))}` : "Choisissez un véhicule"}</button>
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Paiement Wave sécurisé. Carburant, péages et parkings hors forfait.</p>
        </aside>
      </div>
    </main>
  );
}
