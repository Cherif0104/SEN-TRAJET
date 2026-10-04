"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, CalendarDays, Car, ChevronLeft, ChevronRight, Gauge, MapPin, ShieldCheck, Users } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { useAuth } from "@/hooks/useAuth";
import {
  addDaysInputValue,
  createRentalBooking,
  getRentalListing,
  quoteRental,
  todayInputValue,
  type RentalListing,
} from "@/lib/rentalMarketplace";
import { formatFcfa } from "@/lib/sentrajetPricing";

export function RentalDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const today = useMemo(() => todayInputValue(), []);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(() => addDaysInputValue(today, 2));
  const [listing, setListing] = useState<RentalListing | null>(null);
  const [pickup, setPickup] = useState("Agence SentraJet Dakar");
  const [returnLocation, setReturnLocation] = useState("Agence SentraJet Dakar");
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const start = query.get("start") || today;
    const end = query.get("end") || addDaysInputValue(start, 2);
    setStartDate(start);
    setEndDate(end);
    void getRentalListing(id, start, end)
      .then((row) => {
        setListing(row);
        setPickup(row.pickupLocation);
        setReturnLocation(row.pickupLocation);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Véhicule introuvable."))
      .finally(() => setLoading(false));
  }, [id, today]);

  useEffect(() => {
    if (!listing) return;
    void getRentalListing(id, startDate, endDate)
      .then(setListing)
      .catch(() => undefined);
    // `listing` n'est qu'une garde ; l'ajouter relancerait l'effet après chaque réponse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endDate, id, startDate]); // vérification dynamique des dates

  const photos = useMemo(() => {
    if (!listing) return [];
    return Array.from(new Set([listing.vehicle.photoUrl, ...listing.vehicle.photoUrls].filter(Boolean))) as string[];
  }, [listing]);
  const quote = listing ? quoteRental(listing, startDate, endDate) : null;

  async function reserve() {
    if (!listing || !quote) return;
    setError(null);
    if (!user) {
      const next = `/flotte/${listing.id}?start=${startDate}&end=${endDate}`;
      router.push(`/connexion?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!listing.available) {
      setError("Ce véhicule n’est plus disponible sur cette période.");
      return;
    }
    setSubmitting(true);
    try {
      const booking = await createRentalBooking({
        listingId: listing.id,
        startDate,
        endDate,
        pickupLocation: pickup,
        returnLocation,
        phone: profile?.phone ?? undefined,
      });
      router.push(`/flotte/reservation/${booking.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Réservation impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f9]">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Link href={`/flotte?start=${startDate}&end=${endDate}`} className="mb-5 inline-flex items-center gap-1 text-sm font-bold text-slate-600"><ChevronLeft className="h-4 w-4" /> Retour aux véhicules</Link>
        {loading ? <div className="flex justify-center py-24"><BrandedLoader /></div> : !listing ? (
          <div className="rounded-3xl bg-white p-10 text-center"><p className="font-bold text-slate-700">{error || "Véhicule introuvable."}</p></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.45fr_.75fr]">
            <div className="min-w-0">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a2d49] to-[#c99b21]">
                {photos.length ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={photos[photoIndex]} alt="" className="h-72 w-full object-cover sm:h-[470px]" /></> : <div className="flex h-72 items-center justify-center text-white sm:h-[470px]"><Car className="h-20 w-20 opacity-80" /></div>}
                {photos.length > 1 ? <><button onClick={() => setPhotoIndex((photoIndex - 1 + photos.length) % photos.length)} className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white" aria-label="Photo précédente"><ChevronLeft /></button><button onClick={() => setPhotoIndex((photoIndex + 1) % photos.length)} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white" aria-label="Photo suivante"><ChevronRight /></button></> : null}
              </div>
              <div className="mt-5 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#081426] px-3 py-1 text-xs font-bold text-white">{listing.vehicle.category || "Confort"}</span>{listing.vehicle.isVerified ? <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"><BadgeCheck className="h-4 w-4" /> Certifié SentraJet</span> : null}</div>
                <h1 className="mt-3 text-3xl font-black text-[#081426]">{listing.vehicle.brand} {listing.vehicle.model}</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">{listing.vehicle.tagline || "Un véhicule contrôlé, préparé et remis par SentraJet."}</p>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[[Users, `${listing.vehicle.seats || "—"} places`], [Gauge, listing.rentalMode === "with_driver" ? "Avec chauffeur" : "Avec ou sans chauffeur"], [ShieldCheck, `${listing.includedKmPerDay} km/j inclus`], [MapPin, listing.city]].map(([Icon, label]) => { const ItemIcon = Icon as typeof Users; return <div key={String(label)} className="rounded-2xl bg-slate-50 p-3"><ItemIcon className="h-5 w-5 text-amber-600" /><p className="mt-2 text-xs font-bold text-slate-700">{String(label)}</p></div>; })}
                </div>
              </div>
            </div>

            <aside className="h-fit rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-200 lg:sticky lg:top-5">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Réservation immédiate</p>
              <p className="mt-1 text-2xl font-black text-[#081426]">{formatFcfa(listing.dailyRateFcfa)} <span className="text-sm font-semibold text-slate-500">/ jour</span></p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <label className="rounded-2xl border border-slate-200 p-3"><span className="flex items-center gap-1 text-[11px] font-bold text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> Départ</span><input type="date" min={today} value={startDate} onChange={(e) => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }} className="mt-1 w-full text-sm font-bold outline-none" /></label>
                <label className="rounded-2xl border border-slate-200 p-3"><span className="text-[11px] font-bold text-slate-500">Retour</span><input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full text-sm font-bold outline-none" /></label>
              </div>
              <label className="mt-3 block rounded-2xl border border-slate-200 p-3"><span className="text-[11px] font-bold text-slate-500">Lieu de retrait</span><input value={pickup} onChange={(e) => setPickup(e.target.value)} className="mt-1 w-full text-sm font-bold outline-none" /></label>
              <label className="mt-3 block rounded-2xl border border-slate-200 p-3"><span className="text-[11px] font-bold text-slate-500">Lieu de retour</span><input value={returnLocation} onChange={(e) => setReturnLocation(e.target.value)} className="mt-1 w-full text-sm font-bold outline-none" /></label>
              {quote ? <div className="mt-5 space-y-2 border-t border-slate-100 pt-5 text-sm"><div className="flex justify-between text-slate-600"><span>{formatFcfa(quote.dailyRateFcfa)} × {quote.totalDays} jour{quote.totalDays > 1 ? "s" : ""}</span><b>{formatFcfa(quote.subtotalFcfa)}</b></div><div className="flex justify-between text-slate-600"><span>Caution remboursable</span><b>{formatFcfa(quote.depositFcfa)}</b></div><div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-black text-[#081426]"><span>Total à payer</span><span>{formatFcfa(quote.totalFcfa)}</span></div></div> : null}
              {!listing.available ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">Déjà réservé sur cette période. Modifiez les dates.</p> : null}
              {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p> : null}
              <button onClick={() => void reserve()} disabled={!listing.available || submitting || authLoading} className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl bg-amber-400 px-5 font-black text-[#081426] disabled:opacity-50">{submitting ? "Blocage du véhicule…" : user ? "Réserver ce véhicule" : "Se connecter et réserver"}</button>
              <p className="mt-3 text-center text-[11px] leading-4 text-slate-500">Le véhicule est bloqué à la création. Le tarif est recalculé et sécurisé côté serveur.</p>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
