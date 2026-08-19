"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlloDakarShell } from "@/components/allo-dakar/AlloDakarShell";
import { formatFcfa } from "@/lib/sentrajetPricing";
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
import { supabase } from "@/lib/supabase";

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
    } catch (err) {
      setReqError(err instanceof Error ? err.message : "Impossible d’envoyer cette demande.");
    } finally {
      setReqSubmitting(false);
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
                <span className="text-sm font-bold text-[#1f6b4a]">
                  {formatFcfa(dep.price_per_seat_fcfa)}<span className="font-normal text-neutral-500">/place</span>
                </span>
              </div>
              <p className="mt-1 text-sm text-neutral-600">
                {new Date(dep.departure_at).toLocaleString("fr-FR")} · {dep.vehicle?.brand} {dep.vehicle?.model} · {dep.seats_available} place{dep.seats_available > 1 ? "s" : ""} restante{dep.seats_available > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-neutral-400">
                Chauffeur {dep.driver?.full_name}{dep.driver?.garage_name ? ` · Garage ${dep.driver.garage_name}` : ""}
                {dep.price_domicile_fcfa ? ` · Domicile disponible (${formatFcfa(dep.price_domicile_fcfa)})` : ""}
              </p>
              <button
                type="button"
                className="mt-3 w-full rounded-xl bg-[#1f6b4a] px-4 py-2.5 text-sm font-bold text-white"
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

        <div className="mt-4 rounded-2xl border border-dashed border-[#1f6b4a]/40 bg-[#1f6b4a]/5 p-4 text-center">
          {reqSent ? (
            <p className="text-sm font-semibold text-[#1f6b4a]">
              Demande envoyée ! Un chauffeur qui passe par ce corridor pourra vous confirmer directement.
            </p>
          ) : showRequestForm ? (
            <form onSubmit={handleCreateRequest} className="space-y-3 text-left">
              <h4 className="text-sm font-bold text-neutral-900">Publier un besoin de trajet</h4>
              {reqError ? <p className="text-sm text-red-600">{reqError}</p> : null}
              <select className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" value={reqCorridorId} onChange={(e) => setReqCorridorId(e.target.value)} required>
                <option value="">Choisir un corridor</option>
                {corridors.map((c) => (
                  <option key={c.id} value={c.id}>{c.origin_city} → {c.destination_city}</option>
                ))}
              </select>
              <input type="date" className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" value={reqDate} onChange={(e) => setReqDate(e.target.value)} required />
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" placeholder="Nom complet" value={reqName} onChange={(e) => setReqName(e.target.value)} required />
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" placeholder="Téléphone" value={reqPhone} onChange={(e) => setReqPhone(e.target.value)} required />
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-neutral-500">Nombre de places</label>
                <input type="number" min={1} max={10} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" value={reqSeats} onChange={(e) => setReqSeats(Math.max(1, Number(e.target.value) || 1))} />
              </div>
              <div className="flex gap-2">
                <button type="button" className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${reqPickupMode === "point_relais" ? "border-[#1f6b4a] bg-[#1f6b4a] text-white" : "border-neutral-300 text-neutral-700"}`} onClick={() => setReqPickupMode("point_relais")}>
                  Point relais
                </button>
                <button type="button" className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${reqPickupMode === "domicile" ? "border-[#1f6b4a] bg-[#1f6b4a] text-white" : "border-neutral-300 text-neutral-700"}`} onClick={() => setReqPickupMode("domicile")}>
                  Domicile
                </button>
              </div>
              <input
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm"
                placeholder={reqPickupMode === "domicile" ? "Adresse de prise en charge" : "Point de rendez-vous souhaité (optionnel)"}
                value={reqPickupDetail}
                onChange={(e) => setReqPickupDetail(e.target.value)}
                required={reqPickupMode === "domicile"}
              />
              <div className="flex gap-2">
                <button type="button" className="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold" onClick={() => setShowRequestForm(false)}>
                  Annuler
                </button>
                <button type="submit" className="flex-1 rounded-xl bg-[#1f6b4a] px-4 py-2.5 text-sm font-bold text-white" disabled={reqSubmitting}>
                  {reqSubmitting ? "Envoi…" : "Publier ma demande"}
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-sm text-neutral-600">Vous ne trouvez pas de départ qui correspond ?</p>
              <button type="button" className="mt-2 rounded-xl border border-[#1f6b4a] px-4 py-2 text-sm font-semibold text-[#1f6b4a]" onClick={() => setShowRequestForm(true)}>
                Publier mon besoin de trajet
              </button>
            </>
          )}
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
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-neutral-500">Prise en charge</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${pickupMode === "point_relais" ? "border-[#1f6b4a] bg-[#1f6b4a] text-white" : "border-neutral-300 text-neutral-700"}`}
                        onClick={() => setPickupMode("point_relais")}
                      >
                        Point relais · {formatFcfa(selected.price_per_seat_fcfa)}
                      </button>
                      {selected.price_domicile_fcfa ? (
                        <button
                          type="button"
                          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${pickupMode === "domicile" ? "border-[#1f6b4a] bg-[#1f6b4a] text-white" : "border-neutral-300 text-neutral-700"}`}
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
