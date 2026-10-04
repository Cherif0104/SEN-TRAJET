"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CarFront,
  CheckCircle2,
  Clock3,
  Languages,
  Radar,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import {
  AddressAutocomplete,
  type SelectedPlace,
} from "@/components/booking/AddressAutocomplete";
import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/hooks/useAuth";
import {
  createMyDriverRequest,
  getMyDriverRequest,
  startMyDriverPayment,
  type MyDriverRequest,
} from "@/lib/myDriverService";
import { formatFcfa } from "@/lib/sentrajetPricing";

function defaultStart() {
  const date = new Date(Date.now() + 60 * 60_000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

const missionTypes = [
  ["ponctuelle", "Quelques heures"],
  ["journee", "Une journée"],
  ["soiree", "Soirée"],
  ["recurrente", "Besoin régulier"],
  ["recrutement", "Recrutement"],
] as const;

export default function MyDriverPage() {
  const { profile } = useAuth();
  const initialStart = useMemo(defaultStart, []);
  const [pickup, setPickup] = useState<SelectedPlace | null>(null);
  const [pickupText, setPickupText] = useState("");
  const [startsAt, setStartsAt] = useState(initialStart);
  const [durationHours, setDurationHours] = useState(8);
  const [missionType, setMissionType] = useState("journee");
  const [vehicleType, setVehicleType] = useState("berline");
  const [transmission, setTransmission] = useState("manuelle");
  const [language, setLanguage] = useState("");
  const [budget, setBudget] = useState("");
  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [mission, setMission] = useState<MyDriverRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!name && profile?.full_name) setName(profile.full_name);
    if (!phone && profile?.phone) setPhone(profile.phone);
  }, [name, phone, profile]);

  useEffect(() => {
    if (
      !mission ||
      ["confirmee", "terminee", "annulee", "aucun_chauffeur"].includes(mission.status)
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      void getMyDriverRequest(mission.id)
        .then(setMission)
        .catch(() => undefined);
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [mission]);

  async function searchDriver() {
    if (!pickup) {
      setError("Sélectionnez le lieu de prise en charge dans les suggestions.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 9 || !name.trim()) {
      setError("Indiquez votre nom et un téléphone joignable.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSimulationMessage(null);
    try {
      const result = await createMyDriverRequest({
        clientName: name,
        clientPhone: phone,
        pickupAddress: pickup.address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        startsAt: new Date(startsAt).toISOString(),
        durationHours,
        missionType,
        vehicleType,
        transmission,
        requiredLanguage: language || undefined,
        notes,
        maxBudgetFcfa: budget ? Number(budget) : null,
      });
      setMission(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Recherche impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  async function pay() {
    if (!mission) return;
    setPaying(true);
    setError(null);
    try {
      const payment = await startMyDriverPayment(mission.id);
      if (payment.checkoutUrl) {
        window.location.assign(payment.checkoutUrl);
        return;
      }
      setSimulationMessage(
        "Mission confirmée en mode démonstration. En production, le paiement est encaissé par SentraJet.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Paiement impossible.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f5f8] text-[#07111f]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/compte" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Logo className="flex-1 [&_img]:!h-7" />
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-900">
            Mon Chauffeur
          </span>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#07111f] px-4 pb-20 pt-8 text-white sm:pb-24 sm:pt-12">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet-500/15" />
        <div className="relative mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
            <Sparkles className="h-4 w-4" /> Votre voiture, notre chauffeur
          </span>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
            Un chauffeur vérifié, exactement quand vous en avez besoin.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Pour quelques heures, une journée, un remplacement ou un recrutement. SentraJet
            sélectionne le profil compatible et encaisse le paiement en toute sécurité.
          </p>
        </div>
      </section>

      <div className="mx-auto -mt-12 grid max-w-6xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-[1.2fr_.8fr]">
        <section className="space-y-5">
          <div className="rounded-3xl bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">1 · Votre besoin</p>
            <h2 className="mt-1 text-lg font-black">Quel type de mission ?</h2>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {missionTypes.map(([value, label]) => (
                <button key={value} type="button" onClick={() => setMissionType(value)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${missionType === value ? "bg-[#07111f] text-white" : "bg-slate-100 text-slate-600"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <AddressAutocomplete
                label="Lieu de prise en charge"
                placeholder="Domicile, bureau, hôtel…"
                value={pickup}
                textValue={pickupText}
                onSelect={(place) => {
                  setPickup(place);
                  setPickupText(place.address);
                }}
                onClear={() => {
                  setPickup(null);
                  setPickupText("");
                }}
                showMyLocation
                accent="pickup"
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="rounded-2xl border border-slate-200 p-3">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><CalendarClock className="h-4 w-4" /> Début</span>
                <input type="datetime-local" value={startsAt} min={initialStart} onChange={(event) => setStartsAt(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold outline-none" />
              </label>
              <label className="rounded-2xl border border-slate-200 p-3">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><Clock3 className="h-4 w-4" /> Durée</span>
                <select value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value))} className="mt-2 w-full bg-transparent text-sm font-bold outline-none">
                  <option value={2}>2 heures</option>
                  <option value={4}>4 heures</option>
                  <option value={8}>1 journée · 8 h</option>
                  <option value={16}>2 journées</option>
                  <option value={40}>5 journées</option>
                  <option value={160}>Mission longue · 1 mois</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">2 · Votre véhicule</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="rounded-2xl border border-slate-200 p-3">
                <span className="text-xs font-bold text-slate-500">Type</span>
                <select value={vehicleType} onChange={(event) => setVehicleType(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold outline-none">
                  {["citadine", "berline", "suv", "van", "minibus", "bus", "utilitaire"].map((type) => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
                </select>
              </label>
              <label className="rounded-2xl border border-slate-200 p-3">
                <span className="text-xs font-bold text-slate-500">Transmission</span>
                <select value={transmission} onChange={(event) => setTransmission(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold outline-none">
                  <option value="manuelle">Manuelle</option>
                  <option value="automatique">Automatique</option>
                </select>
              </label>
              <label className="rounded-2xl border border-slate-200 p-3">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><Languages className="h-4 w-4" /> Langue souhaitée</span>
                <select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold outline-none">
                  <option value="">Sans préférence</option>
                  <option>Français</option>
                  <option>Wolof</option>
                  <option>Anglais</option>
                  <option>Arabe</option>
                </select>
              </label>
              <label className="rounded-2xl border border-slate-200 p-3">
                <span className="text-xs font-bold text-slate-500">Budget maximum</span>
                <input type="number" min={3000} step={500} value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Facultatif" className="mt-2 w-full bg-transparent text-sm font-bold outline-none" />
              </label>
            </div>
            <label className="mt-3 block">
              <span className="text-xs font-bold text-slate-500">Consignes</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Programme, tenue, expérience particulière…" className="mt-1 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:border-violet-400" />
            </label>
          </div>
        </section>

        <aside className="h-fit rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-200 sm:p-6 lg:sticky lg:top-20">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">3 · Matching SentraJet</p>
          <h2 className="mt-1 text-lg font-black">Trouvez votre chauffeur</h2>
          {mission ? (
            <div className="mt-4">
              {mission.assigned_driver ? (
                <div className="overflow-hidden rounded-2xl bg-[#07111f] p-4 text-white">
                  <div className="flex items-center gap-3">
                    {mission.assigned_driver.photo_url ? (
                      <Image src={mission.assigned_driver.photo_url} alt="" width={52} height={52} className="h-13 w-13 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-13 w-13 items-center justify-center rounded-full bg-white/10"><UserRound className="h-6 w-6" /></span>
                    )}
                    <div>
                      <p className="font-black text-white">{mission.assigned_driver.full_name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-emerald-300"><BadgeCheck className="h-3.5 w-3.5" /> Dossier SentraJet vérifié</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center text-xs">
                    <div><Star className="mx-auto h-4 w-4 text-amber-300" /><b className="mt-1 block">{mission.assigned_driver.average_rating || "Nouveau"}</b></div>
                    <div><Clock3 className="mx-auto h-4 w-4 text-violet-300" /><b className="mt-1 block">{mission.assigned_driver.years_experience} ans</b></div>
                    <div><CheckCircle2 className="mx-auto h-4 w-4 text-emerald-300" /><b className="mt-1 block">{mission.assigned_driver.completed_jobs} missions</b></div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-violet-50 p-5 text-center">
                  <Radar className="mx-auto h-8 w-8 animate-pulse text-violet-700" />
                  <p className="mt-2 font-black">Recherche en cours</p>
                  <p className="mt-1 text-xs text-slate-500">Les profils disponibles sont classés automatiquement.</p>
                </div>
              )}
              <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-3"><span>Statut</span><b>{mission.status.replaceAll("_", " ")}</b></div>
                {mission.amount_fcfa ? <div className="mt-2 flex justify-between gap-3"><span>Total SentraJet</span><b>{formatFcfa(mission.amount_fcfa)}</b></div> : null}
              </div>
              {mission.status === "chauffeur_propose" ? <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">Le chauffeur dispose de 5 minutes pour accepter la mission. Sinon, le système en propose un autre.</p> : null}
              {mission.status === "en_attente_paiement" ? (
                <button type="button" onClick={() => void pay()} disabled={paying} className="mt-4 min-h-14 w-full rounded-2xl bg-amber-400 px-4 font-black text-[#07111f] disabled:opacity-50">
                  {paying ? "Ouverture de Wave…" : `Payer SentraJet · ${formatFcfa(mission.amount_fcfa ?? 0)}`}
                </button>
              ) : null}
              {simulationMessage ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{simulationMessage}</p> : null}
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[["Permis", ShieldCheck], ["Tarif", Sparkles], ["Disponibilité", Radar]].map(([label, Icon]) => {
                  const Component = Icon as typeof ShieldCheck;
                  return <div key={String(label)} className="rounded-2xl bg-slate-50 p-3 text-center"><Component className="mx-auto h-5 w-5 text-violet-700" /><span className="mt-2 block text-[10px] font-black">{String(label)}</span></div>;
                })}
              </div>
              <label className="mt-4 block"><span className="text-xs font-bold text-slate-500">Votre nom</span><input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none" /></label>
              <label className="mt-3 block"><span className="text-xs font-bold text-slate-500">Téléphone</span><input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" className="mt-1 min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none" /></label>
              <button type="button" onClick={() => void searchDriver()} disabled={submitting || !pickup} className="mt-5 min-h-14 w-full rounded-2xl bg-violet-700 px-4 font-black text-white disabled:opacity-40">
                {submitting ? "Matching en cours…" : "Trouver mon chauffeur"}
              </button>
            </>
          )}
          {error ? <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p> : null}
          <p className="mt-4 flex items-start gap-2 text-[11px] leading-4 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Vous payez exclusivement SentraJet. Les coordonnées privées sont communiquées après confirmation.</p>
          <Link href="/mon-chauffeur/pro" className="mt-4 block text-center text-xs font-black text-violet-700 underline">Je suis chauffeur sans véhicule</Link>
        </aside>
      </div>
    </main>
  );
}
