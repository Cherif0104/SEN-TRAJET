"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlloDakarShell } from "@/components/allo-dakar/AlloDakarShell";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import {
  bookAlloDakarSeats,
  createAlloDakarWaveCheckout,
  listAlloDakarCorridors,
  searchAlloDakarDepartures,
  type AlloDakarCorridor,
  type AlloDakarDeparture,
} from "@/lib/alloDakarOps";

export default function AlloDakarPage() {
  const [corridors, setCorridors] = useState<AlloDakarCorridor[]>([]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departures, setDepartures] = useState<AlloDakarDeparture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AlloDakarDeparture | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [seats, setSeats] = useState(1);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);
  const [payLink, setPayLink] = useState<string | null>(null);

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

  useEffect(() => {
    void listAlloDakarCorridors()
      .then(setCorridors)
      .finally(() => setLoading(false));
    void runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !name.trim() || !phone.trim()) return;
    setBooking(true);
    setBookingError(null);
    try {
      const result = await bookAlloDakarSeats({
        departureId: selected.id,
        clientFullName: name,
        clientPhone: phone,
        seats,
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

  if (loading) return <BrandedLoader fullScreen />;

  return (
    <AlloDakarShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">Voyagez d’une ville à l’autre</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Réservez une place chez un chauffeur partenaire vérifié — départs, prix et places disponibles en temps réel.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <select className="rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" value={origin} onChange={(e) => setOrigin(e.target.value)}>
            <option value="">Départ (toutes villes)</option>
            {origins.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className="rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" value={destination} onChange={(e) => setDestination(e.target.value)}>
            <option value="">Arrivée (toutes villes)</option>
            {destinations.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            type="button"
            className="col-span-2 rounded-xl bg-[#1f6b4a] px-4 py-2.5 text-sm font-bold text-white"
            onClick={() => void runSearch()}
            disabled={searching}
          >
            {searching ? "Recherche…" : "Rechercher"}
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {departures.map((dep) => (
            <div key={dep.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <b>{dep.corridor?.origin_city} → {dep.corridor?.destination_city}</b>
                <span className="text-sm font-bold text-[#1f6b4a]">{formatFcfa(dep.price_per_seat_fcfa)}<span className="font-normal text-neutral-500">/place</span></span>
              </div>
              <p className="mt-1 text-sm text-neutral-600">
                {new Date(dep.departure_at).toLocaleString("fr-FR")} · {dep.vehicle?.brand} {dep.vehicle?.model} · {dep.seats_available} place{dep.seats_available > 1 ? "s" : ""} restante{dep.seats_available > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-neutral-400">Chauffeur {dep.driver?.full_name}{dep.driver?.garage_name ? ` · Garage ${dep.driver.garage_name}` : ""}</p>
              <button
                type="button"
                className="mt-3 w-full rounded-xl bg-[#1f6b4a] px-4 py-2.5 text-sm font-bold text-white"
                onClick={() => {
                  setSelected(dep);
                  setConfirmedRef(null);
                  setPayLink(null);
                  setBookingError(null);
                }}
              >
                Réserver
              </button>
            </div>
          ))}
          {!departures.length ? (
            <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
              Aucun départ disponible pour cette recherche pour le moment.
            </p>
          ) : null}
        </div>

        <p className="mt-6 text-xs text-neutral-400">
          Vous êtes chauffeur et souhaitez publier vos trajets ?{" "}
          <Link href="/allo-dakar/chauffeur" className="font-semibold text-[#1f6b4a] underline">
            Rejoindre Allo Dakar
          </Link>
          {" "}· Vous gérez plusieurs chauffeurs ?{" "}
          <Link href="/allo-dakar/gestionnaire" className="font-semibold text-[#1f6b4a] underline">
            Ouvrir un espace garage
          </Link>
        </p>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-6">
            {confirmedRef ? (
              <>
                <h3 className="text-lg font-bold text-neutral-900">Réservation confirmée</h3>
                <p className="mt-2 text-sm text-neutral-600">Référence {confirmedRef}. Le chauffeur vous contactera avant le départ.</p>
                {payLink ? (
                  <a href={payLink} target="_blank" rel="noreferrer" className="mt-4 block rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-bold text-white">
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
                <h3 className="text-lg font-bold text-neutral-900">
                  {selected.corridor?.origin_city} → {selected.corridor?.destination_city}
                </h3>
                <p className="text-sm text-neutral-600">{new Date(selected.departure_at).toLocaleString("fr-FR")}</p>
                {bookingError ? <p className="mt-2 text-sm text-red-600">{bookingError}</p> : null}
                <div className="mt-4 space-y-3">
                  <input className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" placeholder="Nom complet" value={name} onChange={(e) => setName(e.target.value)} required />
                  <input className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
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
                </div>
                <p className="mt-3 text-sm font-bold text-neutral-900">
                  Total : {formatFcfa(selected.price_per_seat_fcfa * seats)}
                </p>
                <div className="mt-4 flex gap-2">
                  <button type="button" className="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold" onClick={() => setSelected(null)} disabled={booking}>
                    Annuler
                  </button>
                  <button type="submit" className="flex-1 rounded-xl bg-[#1f6b4a] px-4 py-2.5 text-sm font-bold text-white" disabled={booking}>
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
