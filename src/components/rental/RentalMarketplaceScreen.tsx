"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Car, CheckCircle2, MapPin, Search, ShieldCheck, Users } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import {
  addDaysInputValue,
  listAvailableRentalListings,
  quoteRental,
  todayInputValue,
  type RentalListing,
} from "@/lib/rentalMarketplace";
import { formatFcfa } from "@/lib/sentrajetPricing";

function Photo({ listing }: { listing: RentalListing }) {
  const photo = listing.vehicle.photoUrl || listing.vehicle.photoUrls[0];
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" className="h-44 w-full object-cover sm:h-52" />;
  }
  return (
    <div className="flex h-44 items-center justify-center bg-gradient-to-br from-[#182a45] via-[#0c1728] to-[#d3a829] text-white sm:h-52">
      <Car className="h-14 w-14 opacity-80" />
    </div>
  );
}

export function RentalMarketplaceScreen() {
  const initialStart = useMemo(() => todayInputValue(), []);
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(() => addDaysInputValue(initialStart, 2));
  const [city, setCity] = useState("Dakar");
  const [category, setCategory] = useState("");
  const [seats, setSeats] = useState(0);
  const [listings, setListings] = useState<RentalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function search(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setListings(await listAvailableRentalListings({ startDate, endDate, city, category, seats }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Recherche indisponible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void search();
    // Chargement initial uniquement : l'utilisateur valide ensuite ses critères.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f9]">
      <Header />
      <main className="flex-1">
        <section className="bg-[#081426] px-4 pb-24 pt-9 text-white sm:pb-28 sm:pt-14">
          <div className="mx-auto max-w-6xl">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
              Location instantanée
            </span>
            <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">
              Votre voiture, réservée en quelques minutes.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Choisissez vos dates, comparez le prix total et bloquez immédiatement un véhicule vérifié.
            </p>
          </div>
        </section>

        <div className="mx-auto -mt-16 w-full max-w-6xl px-4 sm:-mt-20 sm:px-6">
          <form onSubmit={search} className="rounded-3xl bg-white p-4 shadow-xl shadow-slate-900/10 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="rounded-2xl border border-slate-200 p-3">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><CalendarDays className="h-4 w-4" /> Départ</span>
                <input type="date" min={initialStart} value={startDate} onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }} className="mt-1 w-full bg-transparent text-sm font-bold outline-none" required />
              </label>
              <label className="rounded-2xl border border-slate-200 p-3">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><CalendarDays className="h-4 w-4" /> Retour</span>
                <input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full bg-transparent text-sm font-bold outline-none" required />
              </label>
              <label className="rounded-2xl border border-slate-200 p-3">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><MapPin className="h-4 w-4" /> Retrait</span>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Dakar" className="mt-1 w-full bg-transparent text-sm font-bold outline-none" />
              </label>
              <label className="rounded-2xl border border-slate-200 p-3">
                <span className="text-xs font-bold text-slate-500">Vos critères</span>
                <div className="mt-1 flex gap-2">
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none">
                    <option value="">Tous types</option><option value="premium">Premium</option><option value="vip">VIP</option><option value="van">Van</option>
                  </select>
                  <select value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="w-20 bg-transparent text-sm font-bold outline-none">
                    <option value={0}>Places</option><option value={4}>4+</option><option value={7}>7+</option><option value={9}>9+</option>
                  </select>
                </div>
              </label>
              <button type="submit" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 font-black text-[#081426] transition hover:bg-amber-300">
                <Search className="h-5 w-5" /> Rechercher
              </button>
            </div>
          </form>

          <div className="mb-16 mt-8">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-widest text-amber-700">Disponibilité réelle</p><h2 className="mt-1 text-2xl font-black text-[#081426]">{loading ? "Recherche…" : `${listings.length} véhicule${listings.length > 1 ? "s" : ""}`}</h2></div>
              <p className="hidden text-sm text-slate-500 sm:block">Prix calculé pour toute la période</p>
            </div>
            {loading ? <div className="flex justify-center py-16"><BrandedLoader /></div> : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>
            ) : listings.length === 0 ? (
              <div className="rounded-3xl bg-white p-10 text-center shadow-sm"><Car className="mx-auto h-10 w-10 text-slate-300" /><h3 className="mt-3 font-black text-slate-900">Aucun véhicule libre sur ces dates</h3><p className="mt-1 text-sm text-slate-500">Essayez une autre période ou élargissez vos critères.</p></div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((listing) => {
                  const quote = quoteRental(listing, startDate, endDate);
                  return (
                    <Link key={listing.id} href={`/flotte/${listing.id}?start=${startDate}&end=${endDate}`} className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl">
                      <div className="relative"><Photo listing={listing} /><div className="absolute left-3 top-3 flex gap-2"><span className="rounded-full bg-[#081426]/90 px-3 py-1 text-xs font-bold text-white">{listing.vehicle.category || "Confort"}</span>{listing.vehicle.isVerified ? <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-xs font-bold text-white"><CheckCircle2 className="h-3 w-3" /> Vérifié</span> : null}</div></div>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black text-[#081426]">{listing.vehicle.brand} {listing.vehicle.model}</h3><p className="mt-1 text-xs text-slate-500">{listing.vehicle.tagline || "Véhicule SentraJet sélectionné"}</p></div><span className="flex shrink-0 items-center gap-1 text-xs font-bold text-slate-600"><Users className="h-4 w-4" /> {listing.vehicle.seats || "—"}</span></div>
                        <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4"><div><p className="text-xs text-slate-500">{quote.totalDays} jour{quote.totalDays > 1 ? "s" : ""} · hors caution</p><p className="text-xl font-black text-[#081426]">{formatFcfa(quote.subtotalFcfa)}</p></div><span className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-[#081426]">Voir & réserver</span></div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mb-14 grid gap-3 rounded-3xl bg-[#081426] p-5 text-white sm:grid-cols-3 sm:p-7">
            {[["Disponibilité garantie", CalendarDays], ["Véhicules contrôlés", ShieldCheck], ["Prix transparent", CheckCircle2]].map(([label, Icon]) => {
              const FeatureIcon = Icon as typeof CalendarDays;
              return <div key={String(label)} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3"><FeatureIcon className="h-5 w-5 text-amber-300" /><span className="text-sm font-bold">{String(label)}</span></div>;
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
