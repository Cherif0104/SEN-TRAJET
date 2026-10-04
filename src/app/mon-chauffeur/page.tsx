"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CarFront,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Languages,
  MapPin,
  Phone,
  Radar,
  ShieldCheck,
  Star,
  UserRound,
  WalletCards,
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
  const [step, setStep] = useState(1);
  const restoredMission = useRef(false);

  useEffect(() => {
    if (!name && profile?.full_name) setName(profile.full_name);
    if (!phone && profile?.phone) setPhone(profile.phone);
  }, [name, phone, profile]);

  useEffect(() => {
    if (restoredMission.current) return;
    restoredMission.current = true;
    const missionId = new URLSearchParams(window.location.search).get("mission");
    if (!missionId) return;
    setSubmitting(true);
    void getMyDriverRequest(missionId)
      .then(setMission)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Mission introuvable."),
      )
      .finally(() => setSubmitting(false));
  }, []);

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

  const canContinue = step === 1 ? Boolean(pickup && startsAt) : true;

  return (
    <main className="min-h-screen bg-[#f5f4f0] pb-28 text-[#07111f]">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[#f5f4f0]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-xl items-center gap-3 px-4">
          <Link href={step > 1 && !mission ? "#" : "/compte"} onClick={(event) => { if (step > 1 && !mission) { event.preventDefault(); setStep(step - 1); } }} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm" aria-label="Retour"><ArrowLeft className="h-5 w-5" /></Link>
          <Logo className="flex-1 [&_img]:!h-7" />
          <Link href="/mon-chauffeur/pro" className="rounded-full bg-[#07111f] px-3 py-2 text-[11px] font-extrabold text-white">Espace chauffeur</Link>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 pt-5">
        {!mission ? (
          <>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((item) => <span key={item} className={`h-1.5 flex-1 rounded-full ${item <= step ? "bg-amber-400" : "bg-slate-200"}`} />)}
            </div>
            <p className="mt-3 text-xs font-bold text-slate-500">Étape {step} sur 3</p>

            {step === 1 ? (
              <section className="mt-3">
                <h1 className="text-3xl font-black leading-tight tracking-tight">Quand avez-vous besoin d’un chauffeur ?</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">Il conduit votre propre véhicule, pour quelques heures ou plusieurs jours.</p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  {missionTypes.map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setMissionType(value)} className={`min-h-14 rounded-2xl border px-3 text-left text-sm font-extrabold transition ${missionType === value ? "border-[#07111f] bg-[#07111f] text-white shadow-lg" : "border-slate-200 bg-white"}`}>{label}</button>
                  ))}
                </div>
                <div className="mt-5 rounded-3xl bg-white p-3 shadow-sm">
                  <AddressAutocomplete label="Prise en charge" placeholder="Domicile, bureau, hôtel…" value={pickup} textValue={pickupText} onSelect={(place) => { setPickup(place); setPickupText(place.address); }} onClear={() => { setPickup(null); setPickupText(""); }} showMyLocation accent="pickup" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="rounded-2xl bg-white p-4 shadow-sm"><span className="flex items-center gap-2 text-xs font-bold text-slate-500"><CalendarClock className="h-4 w-4 text-amber-600" /> Début</span><input type="datetime-local" value={startsAt} min={initialStart} onChange={(event) => setStartsAt(event.target.value)} className="mt-2 w-full bg-transparent text-xs font-extrabold outline-none" /></label>
                  <label className="rounded-2xl bg-white p-4 shadow-sm"><span className="flex items-center gap-2 text-xs font-bold text-slate-500"><Clock3 className="h-4 w-4 text-amber-600" /> Durée</span><select value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value))} className="mt-2 w-full bg-transparent text-xs font-extrabold outline-none"><option value={2}>2 heures</option><option value={4}>4 heures</option><option value={8}>1 journée</option><option value={16}>2 journées</option><option value={40}>5 journées</option><option value={160}>1 mois</option></select></label>
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="mt-3">
                <h1 className="text-3xl font-black leading-tight tracking-tight">Parlez-nous de votre véhicule</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">Nous proposerons uniquement des chauffeurs qui maîtrisent sa catégorie et sa transmission.</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {["citadine", "berline", "suv", "van", "minibus", "bus", "utilitaire"].map((type) => <button key={type} type="button" onClick={() => setVehicleType(type)} className={`flex min-h-20 flex-col justify-between rounded-2xl border p-4 text-left ${vehicleType === type ? "border-amber-400 bg-amber-50 ring-2 ring-amber-400" : "border-slate-200 bg-white"}`}><CarFront className="h-5 w-5" /><span className="text-sm font-extrabold capitalize">{type}</span></button>)}
                </div>
                <div className="mt-5">
                  <p className="text-xs font-extrabold text-slate-500">Transmission</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">{["manuelle", "automatique"].map((item) => <button key={item} type="button" onClick={() => setTransmission(item)} className={`min-h-12 rounded-2xl text-sm font-extrabold capitalize ${transmission === item ? "bg-[#07111f] text-white" : "bg-white"}`}>{item}</button>)}</div>
                </div>
                <label className="mt-5 block rounded-2xl bg-white p-4"><span className="flex items-center gap-2 text-xs font-bold text-slate-500"><Languages className="h-4 w-4 text-amber-600" /> Langue souhaitée</span><select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-extrabold outline-none"><option value="">Sans préférence</option><option>Français</option><option>Wolof</option><option>Anglais</option><option>Arabe</option></select></label>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="mt-3">
                <h1 className="text-3xl font-black leading-tight tracking-tight">Vérifiez votre demande</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">Le système cherchera immédiatement le meilleur profil disponible.</p>
                <div className="mt-6 overflow-hidden rounded-3xl bg-[#07111f] text-white shadow-xl">
                  <div className="p-5"><p className="text-xs font-bold text-white/50">Votre mission</p><h2 className="mt-1 text-xl font-black capitalize text-white">{missionType.replaceAll("_", " ")} · {vehicleType}</h2></div>
                  <div className="grid gap-3 border-t border-white/10 p-5 text-sm">
                    <p className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" /><span>{pickup?.address}</span></p>
                    <p className="flex items-center gap-3"><CalendarClock className="h-5 w-5 text-amber-400" /><span>{new Date(startsAt).toLocaleString("fr-FR")} · {durationHours} h</span></p>
                    <p className="flex items-center gap-3"><CarFront className="h-5 w-5 text-amber-400" /><span className="capitalize">{vehicleType} · {transmission}</span></p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  <label className="rounded-2xl bg-white p-4"><span className="text-xs font-bold text-slate-500">Votre nom</span><input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full bg-transparent text-sm font-extrabold outline-none" /></label>
                  <label className="rounded-2xl bg-white p-4"><span className="flex items-center gap-2 text-xs font-bold text-slate-500"><Phone className="h-4 w-4" /> Téléphone</span><input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" className="mt-1 w-full bg-transparent text-sm font-extrabold outline-none" /></label>
                  <label className="rounded-2xl bg-white p-4"><span className="text-xs font-bold text-slate-500">Budget maximum · facultatif</span><input type="number" min={3000} step={500} value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Ex. 10 000 FCFA" className="mt-1 w-full bg-transparent text-sm font-extrabold outline-none" /></label>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Consignes particulières…" className="resize-none rounded-2xl bg-white p-4 text-sm outline-none" />
                </div>
              </section>
            ) : null}

            {error ? <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p> : null}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
              <div className="mx-auto max-w-xl">
                {step < 3 ? <button type="button" disabled={!canContinue} onClick={() => { setError(null); setStep(step + 1); }} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 font-black text-[#07111f] disabled:opacity-40">Continuer <ChevronRight className="h-5 w-5" /></button> : <button type="button" onClick={() => void searchDriver()} disabled={submitting || !pickup} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#07111f] px-5 font-black text-white disabled:opacity-40">{submitting ? <><Radar className="h-5 w-5 animate-spin" /> Recherche en cours…</> : "Trouver mon chauffeur"}</button>}
                <p className="mt-2 text-center text-[10px] font-semibold text-slate-400"><ShieldCheck className="mr-1 inline h-3 w-3" /> Chauffeurs contrôlés · paiement sécurisé</p>
              </div>
            </div>
          </>
        ) : (
          <section className="pt-3">
            <p className="text-xs font-black uppercase tracking-[.18em] text-amber-700">Demande {mission.reference}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{mission.assigned_driver ? "Votre chauffeur est trouvé" : "Nous cherchons pour vous"}</h1>
            {!mission.assigned_driver ? <div className="mt-8 rounded-[2rem] bg-[#07111f] p-8 text-center text-white shadow-xl"><span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10"><Radar className="h-10 w-10 animate-pulse text-amber-400" /></span><p className="mt-5 text-lg font-black text-white">Matching en temps réel</p><p className="mt-2 text-sm leading-6 text-white/60">Nous vérifions compétences, disponibilité, tarif et expérience.</p></div> : <div className="mt-6 overflow-hidden rounded-[2rem] bg-[#07111f] p-5 text-white shadow-xl"><div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-[#07111f]"><UserRound className="h-7 w-7" /></span><div><h2 className="text-xl font-black text-white">{mission.assigned_driver.full_name}</h2><p className="mt-1 flex items-center gap-1 text-xs text-emerald-300"><BadgeCheck className="h-4 w-4" /> Profil contrôlé par SentraJet</p></div></div><div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center text-xs"><div><Star className="mx-auto h-4 w-4 text-amber-400" /><b className="mt-1 block">{mission.assigned_driver.average_rating || "Nouveau"}</b></div><div><Clock3 className="mx-auto h-4 w-4 text-amber-400" /><b className="mt-1 block">{mission.assigned_driver.years_experience} ans</b></div><div><CheckCircle2 className="mx-auto h-4 w-4 text-amber-400" /><b className="mt-1 block">{mission.assigned_driver.completed_jobs} missions</b></div></div></div>}
            <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">Statut</span><b className="rounded-full bg-amber-100 px-3 py-1 text-xs capitalize text-amber-900">{mission.status.replaceAll("_", " ")}</b></div>{mission.amount_fcfa ? <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><span className="flex items-center gap-2 text-sm text-slate-500"><WalletCards className="h-4 w-4" /> Total SentraJet</span><b>{formatFcfa(mission.amount_fcfa)}</b></div> : null}</div>
            {mission.status === "chauffeur_propose" ? <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-900">Le chauffeur a 5 minutes pour répondre. En cas de refus, un autre profil sera recherché automatiquement.</p> : null}
            {mission.status === "en_attente_paiement" ? <button type="button" onClick={() => void pay()} disabled={paying} className="mt-4 min-h-14 w-full rounded-2xl bg-amber-400 px-4 font-black text-[#07111f] disabled:opacity-50">{paying ? "Ouverture de Wave…" : `Payer SentraJet · ${formatFcfa(mission.amount_fcfa ?? 0)}`}</button> : null}
            {simulationMessage ? <p className="mt-3 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800">{simulationMessage}</p> : null}
            {error ? <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p> : null}
            <p className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Le paiement est encaissé uniquement par SentraJet. Vos coordonnées restent protégées avant confirmation.</p>
          </section>
        )}
      </div>
    </main>
  );
}
