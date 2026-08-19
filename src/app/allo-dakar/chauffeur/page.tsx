"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlloDakarShell } from "@/components/allo-dakar/AlloDakarShell";
import { useAuth } from "@/hooks/useAuth";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import {
  addAlloDakarVehicle,
  cancelAlloDakarDeparture,
  confirmAlloDakarRideRequest,
  formatSubscriptionPeriod,
  getActiveSubscription,
  getMyAlloDakarDriver,
  getVehicleGreyCardSignedUrl,
  hasActiveSubscription,
  listAlloDakarCorridors,
  listAlloDakarDeparturesForDriver,
  listAlloDakarBookingsForDeparture,
  listAlloDakarSubscriptions,
  listAlloDakarVehicles,
  listOpenAlloDakarRideRequests,
  publishAlloDakarDeparture,
  registerAlloDakarDriver,
  uploadVehicleGreyCard,
  type AlloDakarBooking,
  type AlloDakarCorridor,
  type AlloDakarDeparture,
  type AlloDakarDriver,
  type AlloDakarRideRequest,
  type AlloDakarSubscription,
  type AlloDakarVehicle,
} from "@/lib/alloDakarOps";

const PICKUP_MODE_LABEL: Record<string, string> = {
  domicile: "Domicile (porte-à-porte)",
  point_relais: "Point relais",
};

const DRIVER_STATUS_LABEL: Record<string, string> = {
  en_attente: "En attente de validation SentraJet",
  actif: "Actif",
  suspendu: "Suspendu",
  rejete: "Rejeté",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AlloDakarShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">{children}</div>
    </AlloDakarShell>
  );
}

export default function AlloDakarDriverSpace() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [driver, setDriver] = useState<AlloDakarDriver | null>(null);
  const [vehicles, setVehicles] = useState<AlloDakarVehicle[]>([]);
  const [corridors, setCorridors] = useState<AlloDakarCorridor[]>([]);
  const [subscriptions, setSubscriptions] = useState<AlloDakarSubscription[]>([]);
  const [departures, setDepartures] = useState<AlloDakarDeparture[]>([]);
  const [bookingsByDeparture, setBookingsByDeparture] = useState<Record<string, AlloDakarBooking[]>>({});
  const [expandedDeparture, setExpandedDeparture] = useState<string | null>(null);
  const [openRequests, setOpenRequests] = useState<AlloDakarRideRequest[]>([]);
  const [confirmingRequestId, setConfirmingRequestId] = useState<string | null>(null);
  const [confirmDepartureId, setConfirmDepartureId] = useState("");
  const [confirmingBusy, setConfirmingBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [idCard, setIdCard] = useState("");
  const [garage, setGarage] = useState("");

  const [vPlate, setVPlate] = useState("");
  const [vBrand, setVBrand] = useState("");
  const [vModel, setVModel] = useState("");
  const [vSeats, setVSeats] = useState(7);
  const [uploadingVehicleId, setUploadingVehicleId] = useState<string | null>(null);
  const [greyCardLinks, setGreyCardLinks] = useState<Record<string, string>>({});

  const [depCorridor, setDepCorridor] = useState("");
  const [depVehicle, setDepVehicle] = useState("");
  const [depDate, setDepDate] = useState("");
  const [depTime, setDepTime] = useState("");
  const [depPrice, setDepPrice] = useState("");
  const [depPriceDomicile, setDepPriceDomicile] = useState("");

  async function reload() {
    if (!user) return;
    setLoading(true);
    try {
      const d = await getMyAlloDakarDriver(user.id);
      setDriver(d);
      const c = await listAlloDakarCorridors();
      setCorridors(c);
      if (d) {
        const [v, s, dep, reqs] = await Promise.all([
          listAlloDakarVehicles(d.id),
          listAlloDakarSubscriptions(d.id),
          listAlloDakarDeparturesForDriver(d.id),
          listOpenAlloDakarRideRequests().catch(() => []),
        ]);
        setVehicles(v);
        setSubscriptions(s);
        setDepartures(dep);
        setOpenRequests(reqs);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/connexion?next=" + encodeURIComponent("/allo-dakar/chauffeur"));
      return;
    }
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !fullName.trim() || !phone.trim()) return;
    try {
      await registerAlloDakarDriver({ userId: user.id, fullName, phone, idCardNumber: idCard || null, garageName: garage || null });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de créer votre profil.");
    }
  }

  async function handleAddVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!driver || !vPlate.trim()) return;
    try {
      await addAlloDakarVehicle({ alloDakarDriverId: driver.id, plateNumber: vPlate, brand: vBrand || null, model: vModel || null, seatsTotal: vSeats });
      setVPlate("");
      setVBrand("");
      setVModel("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d’ajouter ce véhicule.");
    }
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!driver || !depCorridor || !depVehicle || !depDate || !depTime || !depPrice) return;
    const vehicle = vehicles.find((v) => v.id === depVehicle);
    if (!vehicle) return;
    try {
      await publishAlloDakarDeparture({
        alloDakarDriverId: driver.id,
        alloDakarVehicleId: depVehicle,
        corridorId: depCorridor,
        departureAt: new Date(`${depDate}T${depTime}:00`).toISOString(),
        pricePerSeatFcfa: Number(depPrice),
        priceDomicileFcfa: depPriceDomicile ? Number(depPriceDomicile) : null,
        seatsTotal: Math.max(1, vehicle.seats_total - 1),
      });
      setDepDate("");
      setDepTime("");
      setDepPrice("");
      setDepPriceDomicile("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de publier ce départ.");
    }
  }

  async function handleUploadGreyCard(vehicleId: string, file: File) {
    if (!driver) return;
    setUploadingVehicleId(vehicleId);
    try {
      await uploadVehicleGreyCard(vehicleId, driver.id, file);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d’envoyer la carte grise.");
    } finally {
      setUploadingVehicleId(null);
    }
  }

  async function viewGreyCard(path: string) {
    const url = await getVehicleGreyCardSignedUrl(path);
    if (url) setGreyCardLinks((prev) => ({ ...prev, [path]: url }));
  }

  async function handleConfirmRequest(requestId: string) {
    if (!confirmDepartureId) return;
    setConfirmingBusy(true);
    setError(null);
    try {
      await confirmAlloDakarRideRequest(requestId, confirmDepartureId);
      setConfirmingRequestId(null);
      setConfirmDepartureId("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de confirmer cette demande.");
    } finally {
      setConfirmingBusy(false);
    }
  }

  async function toggleBookings(departureId: string) {
    if (expandedDeparture === departureId) {
      setExpandedDeparture(null);
      return;
    }
    setExpandedDeparture(departureId);
    if (!bookingsByDeparture[departureId]) {
      const b = await listAlloDakarBookingsForDeparture(departureId).catch(() => []);
      setBookingsByDeparture((prev) => ({ ...prev, [departureId]: b }));
    }
  }

  if (authLoading || loading) return <BrandedLoader fullScreen />;

  if (!driver) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-neutral-900">Devenir chauffeur SentraJet Allo Dakar</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Publiez vos trajets interurbains (Dakar–Saint-Louis, Dakar–Kaolack…) et remplissez votre véhicule
          avec des passagers vérifiés. Validation SentraJet requise avant votre première publication.
        </p>
        <form onSubmit={handleRegister} className="mt-6 space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Nom complet</label>
            <input className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Téléphone</label>
            <input className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 …" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">N° CNI (optionnel)</label>
            <input className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" value={idCard} onChange={(e) => setIdCard(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Garage d’attache (optionnel)</label>
            <input className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" value={garage} onChange={(e) => setGarage(e.target.value)} />
          </div>
          <button type="submit" className="w-full rounded-2xl bg-[#1f6b4a] px-4 py-3 text-sm font-bold text-white">
            Envoyer ma candidature
          </button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-xl font-bold text-neutral-900">Espace chauffeur Allo Dakar</h1>
      <p className="mt-1 text-sm text-neutral-600">
        {driver.full_name} · {DRIVER_STATUS_LABEL[driver.status] ?? driver.status}
      </p>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      {driver.status === "en_attente" ? (
        <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Votre candidature est en cours de vérification par l’équipe SentraJet. Vous serez notifié dès l’activation.
        </div>
      ) : null}

      <h2 className="mt-8 text-base font-bold text-neutral-900">Mes véhicules</h2>
      <div className="mt-3 space-y-2">
        {vehicles.map((v) => (
          <div key={v.id} className="rounded-xl border border-neutral-200 bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <b>{v.brand} {v.model}</b>
              {v.is_verified ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Validé</span>
              ) : v.rejection_reason ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Rejeté</span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">En attente de validation</span>
              )}
            </div>
            <p className="text-neutral-500">{v.plate_number} · {v.seats_total} places (dont chauffeur)</p>
            {v.rejection_reason ? <p className="mt-1 text-xs text-red-700">Motif : {v.rejection_reason}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {v.grey_card_url ? (
                greyCardLinks[v.grey_card_url] ? (
                  <a href={greyCardLinks[v.grey_card_url]} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#1f6b4a] underline">
                    Voir la carte grise envoyée
                  </a>
                ) : (
                  <button type="button" className="text-xs font-semibold text-[#1f6b4a] underline" onClick={() => void viewGreyCard(v.grey_card_url!)}>
                    Afficher la carte grise envoyée
                  </button>
                )
              ) : (
                <span className="text-xs text-neutral-400">Aucune carte grise envoyée</span>
              )}
              <label className="text-xs font-semibold text-neutral-600 underline" style={{ cursor: "pointer" }}>
                {uploadingVehicleId === v.id ? "Envoi…" : v.grey_card_url ? "Remplacer le document" : "Envoyer la carte grise"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  disabled={uploadingVehicleId === v.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUploadGreyCard(v.id, file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleAddVehicle} className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-neutral-200 bg-white p-3">
        <input className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm" placeholder="Plaque d’immatriculation" value={vPlate} onChange={(e) => setVPlate(e.target.value)} required />
        <input className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" placeholder="Marque" value={vBrand} onChange={(e) => setVBrand(e.target.value)} />
        <input className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" placeholder="Modèle" value={vModel} onChange={(e) => setVModel(e.target.value)} />
        <label className="col-span-2 text-xs text-neutral-500">Nombre de places total (carte grise, chauffeur inclus)</label>
        <input type="number" min={2} max={30} className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm" value={vSeats} onChange={(e) => setVSeats(Number(e.target.value) || 2)} />
        <button type="submit" className="col-span-2 rounded-xl bg-neutral-900 px-3 py-2 text-sm font-bold text-white">Ajouter le véhicule</button>
      </form>

      <h2 className="mt-8 text-base font-bold text-neutral-900">Mes accès corridors</h2>
      <div className="mt-3 space-y-2">
        {corridors.map((c) => {
          const active = getActiveSubscription(subscriptions, c.id);
          return (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 text-sm">
              <span>{c.origin_city} → {c.destination_city}</span>
              <span className={active ? "font-semibold text-emerald-700" : "text-neutral-400"}>
                {active ? formatSubscriptionPeriod(active) : "Pas d’accès — contactez SentraJet"}
              </span>
            </div>
          );
        })}
      </div>

      {driver.status === "actif" && vehicles.length > 0 ? (
        <>
          <h2 className="mt-8 text-base font-bold text-neutral-900">Publier un départ</h2>
          <form onSubmit={handlePublish} className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-neutral-200 bg-white p-3">
            <select className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm" value={depCorridor} onChange={(e) => setDepCorridor(e.target.value)} required>
              <option value="">Corridor…</option>
              {corridors.filter((c) => hasActiveSubscription(subscriptions, c.id)).map((c) => (
                <option key={c.id} value={c.id}>{c.origin_city} → {c.destination_city}</option>
              ))}
            </select>
            <select className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm" value={depVehicle} onChange={(e) => setDepVehicle(e.target.value)} required>
              <option value="">Véhicule…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.brand} {v.model} · {v.plate_number}</option>
              ))}
            </select>
            <input type="date" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" value={depDate} onChange={(e) => setDepDate(e.target.value)} required />
            <input type="time" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" value={depTime} onChange={(e) => setDepTime(e.target.value)} required />
            <input type="number" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" placeholder="Prix point relais (FCFA)" value={depPrice} onChange={(e) => setDepPrice(e.target.value)} required />
            <input type="number" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" placeholder="Prix domicile (FCFA, optionnel)" value={depPriceDomicile} onChange={(e) => setDepPriceDomicile(e.target.value)} />
            <p className="col-span-2 text-xs text-neutral-400">
              Les réservations se ferment automatiquement 30 minutes avant l&apos;heure de départ.
            </p>
            <button type="submit" className="col-span-2 rounded-xl bg-[#1f6b4a] px-3 py-2 text-sm font-bold text-white">Publier ce départ</button>
          </form>
        </>
      ) : null}

      {driver.status === "actif" ? (
        <>
          <h2 className="mt-8 text-base font-bold text-neutral-900">Demandes clients sur mes corridors</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Des clients n&apos;ont pas trouvé de départ correspondant — confirmez-les directement sur l&apos;un de vos
            départs publiés pour compléter votre véhicule.
          </p>
          <div className="mt-3 space-y-2">
            {openRequests
              .filter((r) => hasActiveSubscription(subscriptions, r.corridor_id))
              .map((r) => {
                const eligibleDepartures = departures.filter(
                  (d) => d.corridor_id === r.corridor_id && d.status === "publie" && d.seats_available >= r.seats_needed
                );
                return (
                  <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <b>{r.corridor ? `${r.corridor.origin_city} → ${r.corridor.destination_city}` : "Corridor"}</b>
                        <div className="text-neutral-500">
                          {new Date(r.desired_date).toLocaleDateString("fr-FR")} · {r.seats_needed} place{r.seats_needed > 1 ? "s" : ""} ·{" "}
                          {PICKUP_MODE_LABEL[r.pickup_mode]}
                          {r.pickup_detail ? ` (${r.pickup_detail})` : ""}
                        </div>
                        <div className="text-xs text-neutral-400">{r.client_full_name} · {r.client_phone}</div>
                      </div>
                      {confirmingRequestId !== r.id ? (
                        <button
                          type="button"
                          className="rounded-lg bg-[#1f6b4a] px-3 py-1.5 text-xs font-bold text-white"
                          onClick={() => {
                            setConfirmingRequestId(r.id);
                            setConfirmDepartureId(eligibleDepartures[0]?.id ?? "");
                          }}
                        >
                          Confirmer
                        </button>
                      ) : null}
                    </div>
                    {confirmingRequestId === r.id ? (
                      <div className="mt-2 space-y-2 border-t border-neutral-100 pt-2">
                        {eligibleDepartures.length ? (
                          <>
                            <select
                              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                              value={confirmDepartureId}
                              onChange={(e) => setConfirmDepartureId(e.target.value)}
                            >
                              {eligibleDepartures.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {new Date(d.departure_at).toLocaleString("fr-FR")} · {d.seats_available} places libres
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <button type="button" className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold" onClick={() => setConfirmingRequestId(null)}>
                                Annuler
                              </button>
                              <button
                                type="button"
                                className="flex-1 rounded-lg bg-[#1f6b4a] px-3 py-1.5 text-xs font-bold text-white"
                                disabled={confirmingBusy}
                                onClick={() => void handleConfirmRequest(r.id)}
                              >
                                {confirmingBusy ? "…" : "Valider sur ce départ"}
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-amber-700">
                            Aucun de vos départs publiés n&apos;a assez de places disponibles sur ce corridor. Publiez
                            d&apos;abord un départ.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            {!openRequests.filter((r) => hasActiveSubscription(subscriptions, r.corridor_id)).length ? (
              <p className="text-sm text-neutral-500">Aucune demande client ouverte sur vos corridors pour le moment.</p>
            ) : null}
          </div>
        </>
      ) : null}

      <h2 className="mt-8 text-base font-bold text-neutral-900">Mes départs</h2>
      <div className="mt-3 space-y-2">
        {departures.map((dep) => (
          <div key={dep.id} className="rounded-xl border border-neutral-200 bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <b>{dep.corridor?.origin_city} → {dep.corridor?.destination_city}</b>
                <div className="text-neutral-500">
                  {new Date(dep.departure_at).toLocaleString("fr-FR")} · {formatFcfa(dep.price_per_seat_fcfa)}/place point relais
                  {dep.price_domicile_fcfa ? ` · ${formatFcfa(dep.price_domicile_fcfa)}/place domicile` : ""} ·{" "}
                  {dep.seats_available}/{dep.seats_total} places restantes · {dep.status}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button type="button" className="text-xs font-semibold text-[#1f6b4a] underline" onClick={() => void toggleBookings(dep.id)}>
                  {expandedDeparture === dep.id ? "Masquer" : "Voir réservations"}
                </button>
                {dep.status === "publie" ? (
                  <button type="button" className="text-xs font-semibold text-red-600 underline" onClick={() => void cancelAlloDakarDeparture(dep.id).then(reload)}>
                    Annuler
                  </button>
                ) : null}
              </div>
            </div>
            {expandedDeparture === dep.id ? (
              <div className="mt-2 space-y-1 border-t border-neutral-100 pt-2">
                {(bookingsByDeparture[dep.id] ?? []).map((b) => (
                  <div key={b.id} className="flex justify-between text-xs text-neutral-600">
                    <span>
                      {b.client_full_name} ({b.client_phone}) · {b.seats_booked} place{b.seats_booked > 1 ? "s" : ""} ·{" "}
                      {PICKUP_MODE_LABEL[b.pickup_mode] ?? b.pickup_mode}
                      {b.pickup_detail ? ` — ${b.pickup_detail}` : ""}
                    </span>
                    <span>{b.payment_status} · {b.status}</span>
                  </div>
                ))}
                {!(bookingsByDeparture[dep.id] ?? []).length ? <p className="text-xs text-neutral-400">Aucune réservation pour ce départ.</p> : null}
              </div>
            ) : null}
          </div>
        ))}
        {!departures.length ? <p className="text-sm text-neutral-500">Aucun départ publié pour le moment.</p> : null}
      </div>
    </Shell>
  );
}
