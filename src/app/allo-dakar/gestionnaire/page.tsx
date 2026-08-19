"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlloDakarShell } from "@/components/allo-dakar/AlloDakarShell";
import { useAuth } from "@/hooks/useAuth";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import {
  addDriverToGarage,
  getMyGarage,
  listAllAlloDakarBookings,
  listAllAlloDakarDepartures,
  listGarageDrivers,
  registerGarage,
  type AlloDakarBooking,
  type AlloDakarDeparture,
  type AlloDakarDriver,
  type AlloDakarGarage,
} from "@/lib/alloDakarOps";

const GARAGE_STATUS_LABEL: Record<string, string> = {
  en_attente: "En attente de validation SentraJet",
  actif: "Actif",
  suspendu: "Suspendu",
};

const DRIVER_STATUS_LABEL: Record<string, string> = {
  en_attente: "En attente",
  actif: "Actif",
  suspendu: "Suspendu",
  rejete: "Rejeté",
};

export default function AlloDakarGestionnairePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [garage, setGarage] = useState<AlloDakarGarage | null>(null);
  const [drivers, setDrivers] = useState<AlloDakarDriver[]>([]);
  const [departures, setDepartures] = useState<AlloDakarDeparture[]>([]);
  const [bookings, setBookings] = useState<AlloDakarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const [dFullName, setDFullName] = useState("");
  const [dPhone, setDPhone] = useState("");
  const [dIdCard, setDIdCard] = useState("");

  async function reload() {
    if (!user) return;
    setLoading(true);
    try {
      const g = await getMyGarage(user.id);
      setGarage(g);
      if (g) {
        const [d, dep, b] = await Promise.all([
          listGarageDrivers(g.id),
          listAllAlloDakarDepartures().catch(() => []),
          listAllAlloDakarBookings().catch(() => []),
        ]);
        setDrivers(d);
        setDepartures(dep);
        setBookings(b);
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
      router.replace("/connexion?next=" + encodeURIComponent("/allo-dakar/gestionnaire"));
      return;
    }
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim() || !phone.trim()) return;
    try {
      await registerGarage({ managerUserId: user.id, name, phone, city: city || null });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer votre garage.");
    }
  }

  async function handleAddDriver(e: React.FormEvent) {
    e.preventDefault();
    if (!garage || !dFullName.trim() || !dPhone.trim()) return;
    try {
      await addDriverToGarage({ garageId: garage.id, fullName: dFullName, phone: dPhone, idCardNumber: dIdCard || null });
      setDFullName("");
      setDPhone("");
      setDIdCard("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d’ajouter ce chauffeur.");
    }
  }

  if (authLoading || loading) return <BrandedLoader fullScreen />;

  if (!garage) {
    return (
      <AlloDakarShell>
        <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
          <h1 className="text-xl font-bold text-neutral-900">Devenir gestionnaire de garage Allo Dakar</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Regroupez vos chauffeurs sous un même garage, suivez leurs départs et leurs réservations
            depuis un tableau de bord unique.
          </p>
          <form onSubmit={handleRegister} className="mt-6 space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Nom du garage</label>
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Téléphone</label>
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 …" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Ville</label>
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Kaolack, Thiès…" />
            </div>
            <button type="submit" className="w-full rounded-2xl bg-[#1f6b4a] px-4 py-3 text-sm font-bold text-white">
              Créer mon garage
            </button>
          </form>
          <p className="mt-4 text-xs text-neutral-500">
            Vous êtes un chauffeur individuel, sans garage ?{" "}
            <a href="/allo-dakar/chauffeur" className="font-semibold text-[#1f6b4a] underline">Rejoignez Allo Dakar directement</a>.
          </p>
        </div>
      </AlloDakarShell>
    );
  }

  const totalRevenue = bookings.reduce((sum, b) => sum + (b.payment_status === "paid" ? b.driver_payout_fcfa : 0), 0);
  const activeDrivers = drivers.filter((d) => d.status === "actif").length;

  return (
    <AlloDakarShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-xl font-bold text-neutral-900">{garage.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {garage.city ? `${garage.city} · ` : ""}{GARAGE_STATUS_LABEL[garage.status] ?? garage.status}
        </p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        {garage.status === "en_attente" ? (
          <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Votre garage est en cours de vérification par l’équipe SentraJet.
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
            <p className="text-lg font-extrabold text-neutral-900">{drivers.length}</p>
            <p className="text-xs text-neutral-500">Chauffeurs</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
            <p className="text-lg font-extrabold text-neutral-900">{activeDrivers}</p>
            <p className="text-xs text-neutral-500">Actifs</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
            <p className="text-lg font-extrabold text-[#1f6b4a]">{formatFcfa(totalRevenue)}</p>
            <p className="text-xs text-neutral-500">Reversé (payé)</p>
          </div>
        </div>

        <h2 className="mt-8 text-base font-bold text-neutral-900">Mes chauffeurs</h2>
        <div className="mt-3 space-y-2">
          {drivers.map((d) => (
            <div key={d.id} className="rounded-xl border border-neutral-200 bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <b>{d.full_name}</b>
                <span className="text-xs font-semibold text-neutral-500">{DRIVER_STATUS_LABEL[d.status] ?? d.status}</span>
              </div>
              <p className="text-neutral-500">{d.phone}</p>
            </div>
          ))}
          {!drivers.length ? <p className="text-sm text-neutral-500">Aucun chauffeur rattaché pour le moment.</p> : null}
        </div>

        <form onSubmit={handleAddDriver} className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-neutral-200 bg-white p-3">
          <input className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm" placeholder="Nom complet du chauffeur" value={dFullName} onChange={(e) => setDFullName(e.target.value)} required />
          <input className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" placeholder="Téléphone" value={dPhone} onChange={(e) => setDPhone(e.target.value)} required />
          <input className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" placeholder="N° CNI (optionnel)" value={dIdCard} onChange={(e) => setDIdCard(e.target.value)} />
          <button type="submit" className="col-span-2 rounded-xl bg-[#1f6b4a] px-3 py-2 text-sm font-bold text-white">Ajouter ce chauffeur</button>
        </form>
        <p className="mt-2 text-xs text-neutral-400">
          Le chauffeur ajouté devra être validé par SentraJet avant de pouvoir publier des départs.
          Les accès corridor restent gérés directement par SentraJet.
        </p>

        <h2 className="mt-8 text-base font-bold text-neutral-900">Départs de mes chauffeurs</h2>
        <div className="mt-3 space-y-2">
          {departures.map((dep) => (
            <div key={dep.id} className="rounded-xl border border-neutral-200 bg-white p-3 text-sm">
              <b>{dep.corridor?.origin_city} → {dep.corridor?.destination_city}</b>
              <div className="text-neutral-500">
                {new Date(dep.departure_at).toLocaleString("fr-FR")} · {dep.driver?.full_name} ·{" "}
                {dep.seats_available}/{dep.seats_total} places restantes · {dep.status}
              </div>
            </div>
          ))}
          {!departures.length ? <p className="text-sm text-neutral-500">Aucun départ publié par vos chauffeurs pour le moment.</p> : null}
        </div>
      </div>
    </AlloDakarShell>
  );
}
