"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  Clock3,
  FileCheck2,
  Power,
  ShieldCheck,
  Upload,
  WalletCards,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { useAuth } from "@/hooks/useAuth";
import {
  getMyDriverProfile,
  listMyDriverAssignments,
  registerMyDriverProfile,
  respondMyDriverAssignment,
  setMyDriverAvailability,
  startMyDriverSubscriptionPayment,
  uploadMyDriverDocument,
  type MyDriverAssignment,
  type MyDriverProfile,
  type MyDriverSubscription,
} from "@/lib/myDriverService";
import { formatFcfa } from "@/lib/sentrajetPricing";

const vehicleOptions = ["citadine", "berline", "suv", "van", "minibus", "bus", "utilitaire"];
const languageOptions = ["Français", "Wolof", "Anglais", "Arabe"];

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function MyDriverProPage() {
  const { profile: accountProfile } = useAuth();
  const [profile, setProfile] = useState<MyDriverProfile | null>(null);
  const [subscriptions, setSubscriptions] = useState<MyDriverSubscription[]>([]);
  const [assignments, setAssignments] = useState<MyDriverAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState(accountProfile?.full_name ?? "");
  const [phone, setPhone] = useState(accountProfile?.phone ?? "");
  const [city, setCity] = useState("Dakar");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [experience, setExperience] = useState(2);
  const [languages, setLanguages] = useState(["Français", "Wolof"]);
  const [vehicles, setVehicles] = useState(["citadine", "berline"]);
  const [transmissions, setTransmissions] = useState(["manuelle"]);
  const [hourlyRate, setHourlyRate] = useState(1500);
  const [dailyRate, setDailyRate] = useState(7000);
  const [bio, setBio] = useState("");
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const [profileData, assignmentRows] = await Promise.all([
        getMyDriverProfile(),
        listMyDriverAssignments().catch(() => []),
      ]);
      setProfile(profileData.profile);
      setSubscriptions(profileData.subscriptions);
      setAssignments(assignmentRows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function upload(kind: "cv" | "permis" | "identite" | "photo", file: File) {
    setUploading(kind);
    setError(null);
    try {
      const path = await uploadMyDriverDocument(kind, file);
      setDocuments((current) => ({ ...current, [kind]: path }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Envoi impossible.");
    } finally {
      setUploading(null);
    }
  }

  async function submitApplication(event: React.FormEvent) {
    event.preventDefault();
    if (!documents.permis || !documents.identite || !documents.cv) {
      setError("Ajoutez votre permis, votre pièce d’identité et votre CV.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await registerMyDriverProfile({
        fullName,
        phone,
        city,
        licenseNumber,
        licenseCategories: ["B"],
        yearsExperience: experience,
        languages,
        vehicleSkills: vehicles,
        transmissionSkills: transmissions,
        bio,
        hourlyRateFcfa: hourlyRate,
        dailyRateFcfa: dailyRate,
        cvUrl: documents.cv,
        licenseDocumentUrl: documents.permis,
        idDocumentUrl: documents.identite,
        photoUrl: documents.photo,
      });
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Candidature impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  async function setAvailability(value: boolean) {
    try {
      setProfile(await setMyDriverAvailability(value));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Disponibilité non modifiée.");
    }
  }

  async function respond(id: string, accept: boolean) {
    try {
      await respondMyDriverAssignment(id, accept);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Réponse impossible.");
    }
  }

  async function subscribe() {
    setSubmitting(true);
    setError(null);
    try {
      const payment = await startMyDriverSubscriptionPayment();
      if (payment.checkoutUrl) {
        window.location.assign(payment.checkoutUrl);
        return;
      }
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Paiement indisponible.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <BrandedLoader fullScreen />;

  const activeSubscription = subscriptions.find(
    (item) => item.status === "actif" && new Date(item.ends_at).getTime() > Date.now(),
  );

  return (
    <main className="min-h-screen bg-[#f3f5f8] text-[#07111f]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link href="/mon-chauffeur" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100" aria-label="Retour"><ArrowLeft className="h-5 w-5" /></Link>
          <Logo className="flex-1 [&_img]:!h-7" />
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-900">Espace chauffeur</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {!profile ? (
          <>
            <div className="rounded-3xl bg-[#07111f] p-6 text-white sm:p-8">
              <p className="text-xs font-black uppercase tracking-widest text-violet-300">Mon Chauffeur Pro</p>
              <h1 className="mt-2 text-3xl font-black text-white">Travaillez même sans posséder de véhicule.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">Créez votre passeport professionnel. Les premiers mois sont gratuits, puis l’accès aux missions coûte 1 000 FCFA par semaine.</p>
            </div>
            <form onSubmit={submitApplication} className="mt-6 grid gap-5 lg:grid-cols-2">
              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-black">Identité professionnelle</h2>
                <div className="mt-4 grid gap-3">
                  <input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nom complet" className="input-base" />
                  <input required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Téléphone / WhatsApp" className="input-base" />
                  <input required value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ville" className="input-base" />
                  <input required value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} placeholder="Numéro de permis" className="input-base" />
                  <label className="text-xs font-bold text-slate-500">Années d’expérience<input type="number" min={0} max={60} value={experience} onChange={(event) => setExperience(Number(event.target.value))} className="input-base mt-1" /></label>
                  <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} placeholder="Expérience, références, spécialités…" className="input-base resize-none" />
                </div>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-black">Documents contrôlés</h2>
                <div className="mt-4 grid gap-3">
                  {([
                    ["permis", "Permis de conduire"],
                    ["identite", "CNI ou passeport"],
                    ["cv", "CV professionnel"],
                    ["photo", "Photo de profil"],
                  ] as const).map(([kind, label]) => (
                    <label key={kind} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 ${documents[kind] ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">{documents[kind] ? <Check className="h-5 w-5 text-emerald-700" /> : <Upload className="h-5 w-5 text-violet-700" />}</span>
                      <span className="flex-1 text-sm font-black">{uploading === kind ? "Envoi…" : label}</span>
                      <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploading != null} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(kind, file); }} />
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-black">Compétences</h2>
                <p className="mt-4 text-xs font-bold text-slate-500">Véhicules maîtrisés</p>
                <div className="mt-2 flex flex-wrap gap-2">{vehicleOptions.map((item) => <button key={item} type="button" onClick={() => setVehicles(toggle(vehicles, item))} className={`rounded-full px-3 py-2 text-xs font-black ${vehicles.includes(item) ? "bg-violet-700 text-white" : "bg-slate-100"}`}>{item}</button>)}</div>
                <p className="mt-4 text-xs font-bold text-slate-500">Transmissions</p>
                <div className="mt-2 flex gap-2">{["manuelle", "automatique"].map((item) => <button key={item} type="button" onClick={() => setTransmissions(toggle(transmissions, item))} className={`rounded-full px-3 py-2 text-xs font-black ${transmissions.includes(item) ? "bg-[#07111f] text-white" : "bg-slate-100"}`}>{item}</button>)}</div>
                <p className="mt-4 text-xs font-bold text-slate-500">Langues</p>
                <div className="mt-2 flex flex-wrap gap-2">{languageOptions.map((item) => <button key={item} type="button" onClick={() => setLanguages(toggle(languages, item))} className={`rounded-full px-3 py-2 text-xs font-black ${languages.includes(item) ? "bg-emerald-700 text-white" : "bg-slate-100"}`}>{item}</button>)}</div>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-black">Vos tarifs</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold text-slate-500">Tarif horaire<input type="number" min={500} step={500} value={hourlyRate} onChange={(event) => setHourlyRate(Number(event.target.value))} className="input-base mt-1" /></label>
                  <label className="text-xs font-bold text-slate-500">Tarif journalier<input type="number" min={3000} step={500} value={dailyRate} onChange={(event) => setDailyRate(Number(event.target.value))} className="input-base mt-1" /></label>
                </div>
                <div className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm text-violet-950"><ShieldCheck className="mr-2 inline h-5 w-5" />Le client paie SentraJet. Votre rémunération est enregistrée dans chaque mission.</div>
                {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
                <button type="submit" disabled={submitting || !vehicles.length || !transmissions.length} className="mt-5 min-h-14 w-full rounded-2xl bg-violet-700 px-4 font-black text-white disabled:opacity-40">{submitting ? "Envoi du dossier…" : "Envoyer ma candidature"}</button>
              </section>
            </form>
          </>
        ) : (
          <>
            <div className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
              <section className="rounded-3xl bg-[#07111f] p-6 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-xs text-white/50">Bonjour</p><h1 className="mt-1 text-2xl font-black text-white">{profile.full_name}</h1><p className="mt-2 text-sm text-white/60">{profile.city} · {profile.years_experience} ans d’expérience</p></div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${profile.status === "verifie" ? "bg-emerald-400 text-emerald-950" : "bg-amber-300 text-amber-950"}`}>{profile.status.replaceAll("_", " ")}</span>
                </div>
                {profile.status === "verifie" ? <button type="button" onClick={() => void setAvailability(!profile.is_available)} className={`mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl font-black ${profile.is_available ? "bg-emerald-400 text-emerald-950" : "bg-white/10 text-white"}`}><Power className="h-5 w-5" />{profile.is_available ? "En ligne · missions activées" : "Me mettre en ligne"}</button> : <p className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-white/70">Votre dossier est examiné par SentraJet. La mise en ligne sera disponible après validation.</p>}
              </section>
              <section className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3"><WalletCards className="h-6 w-6 text-violet-700" /><div><p className="text-xs text-slate-500">Accès aux missions</p><h2 className="font-black">{activeSubscription ? activeSubscription.plan.replaceAll("_", " ") : "Abonnement requis"}</h2></div></div>
                {activeSubscription ? <p className="mt-4 text-sm text-slate-600">Actif jusqu’au {new Date(activeSubscription.ends_at).toLocaleDateString("fr-FR")}{activeSubscription.amount_fcfa ? ` · ${formatFcfa(activeSubscription.amount_fcfa)}` : " · gratuit"}</p> : <><p className="mt-4 text-sm text-amber-700">L’abonnement hebdomadaire est de 1 000 FCFA après la période gratuite.</p>{profile.status === "verifie" ? <button type="button" disabled={submitting} onClick={() => void subscribe()} className="mt-4 min-h-11 w-full rounded-xl bg-violet-700 px-4 text-sm font-black text-white disabled:opacity-50">{submitting ? "Ouverture de Wave…" : "Activer 7 jours · 1 000 FCFA"}</button> : null}</>}
              </section>
            </div>

            <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-violet-700">Dispatch automatique</p><h2 className="mt-1 text-xl font-black">Mes propositions de mission</h2></div><BriefcaseBusiness className="h-7 w-7 text-violet-700" /></div>
              <div className="mt-5 grid gap-3">
                {assignments.map((assignment) => (
                  <article key={assignment.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{assignment.request?.mission_type.replaceAll("_", " ")} · {assignment.request?.vehicle_type}</h3><p className="mt-1 text-xs text-slate-500">{assignment.request?.pickup_address}</p><p className="mt-1 text-xs text-slate-500">{assignment.request ? new Date(assignment.request.starts_at).toLocaleString("fr-FR") : ""} · {assignment.request?.duration_hours} h</p></div>{assignment.request?.driver_payout_fcfa ? <b className="text-emerald-700">{formatFcfa(assignment.request.driver_payout_fcfa)}</b> : null}</div>
                    {assignment.status === "proposee" ? <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => void respond(assignment.id, false)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold">Refuser</button><button type="button" onClick={() => void respond(assignment.id, true)} className="rounded-xl bg-violet-700 px-3 py-3 text-sm font-black text-white">Accepter</button></div> : <p className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-700"><FileCheck2 className="h-4 w-4" /> Mission acceptée · paiement client en attente</p>}
                  </article>
                ))}
                {!assignments.length ? <div className="rounded-2xl bg-slate-50 p-8 text-center"><Clock3 className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-2 text-sm font-semibold text-slate-500">Aucune proposition active. Mettez-vous en ligne pour recevoir des missions.</p></div> : null}
              </div>
            </section>
            {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
          </>
        )}
      </div>
    </main>
  );
}
