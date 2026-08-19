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
  formatSubscriptionPeriod,
  getActiveSubscription,
  getMyAlloDakarDriver,
  hasActiveSubscription,
  listAlloDakarCorridors,
  listAlloDakarDeparturesForDriver,
  listAlloDakarBookingsForDeparture,
  listAlloDakarSubscriptions,
  listAlloDakarVehicles,
  publishAlloDakarDeparture,
  registerAlloDakarDriver,
  type AlloDakarBooking,
  type AlloDakarCorridor,
  type AlloDakarDeparture,
  type AlloDakarDriver,
  type AlloDakarSubscription,
  type AlloDakarVehicle,
} from "@/lib/alloDakarOps";

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

  const [depCorridor, setDepCorridor] = useState("");
  const [depVehicle, setDepVehicle] = useState("");
  const [depDate, setDepDate] = useState("");
  const [depTime, setDepTime] = useState("");
  const [depPrice, setDepPrice] = useState("");

  async function reload() {
    if (!user) return;
    setLoading(true);
    try {
      const d = await getMyAlloDakarDriver(user.id);
      setDriver(d);
      const c = await listAlloDakarCorridors();
      setCorridors(c);
      if (d) {
        const [v, s, dep] = await Promise.all([
          listAlloDakarVehicles(d.id),
          listAlloDakarSubscriptions(d.id),
          listAlloDakarDeparturesForDriver(d.id),
        ]);
        setVehicles(v);
        setSubscriptions(s);
        setDepartures(dep);
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
        seatsTotal: Math.max(1, vehicle.seats_total - 1),
      });
      setDepDate("");
      setDepTime("");
      setDepPrice("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de publier ce départ.");
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
            <b>{v.brand} {v.model}</b> · {v.plate_number} · {v.seats_total} places (dont chauffeur)
            {!v.is_verified ? <span className="ml-2 text-xs text-amber-700">Vérification en cours</span> : null}
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
            <input type="number" className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm" placeholder="Prix par place (FCFA)" value={depPrice} onChange={(e) => setDepPrice(e.target.value)} required />
            <button type="submit" className="col-span-2 rounded-xl bg-[#1f6b4a] px-3 py-2 text-sm font-bold text-white">Publier ce départ</button>
          </form>
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
                  {new Date(dep.departure_at).toLocaleString("fr-FR")} · {formatFcfa(dep.price_per_seat_fcfa)}/place ·{" "}
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
                    <span>{b.client_full_name} ({b.client_phone}) · {b.seats_booked} place{b.seats_booked > 1 ? "s" : ""}</span>
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
