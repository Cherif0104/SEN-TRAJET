"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, BriefcaseBusiness, Clock3, ShieldCheck, UserRound, WalletCards } from "lucide-react";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import {
  grantMyDriverWeeklySubscription,
  getMyDriverDocumentSignedUrl,
  listAdminMyDriverProfiles,
  listAdminMyDriverRequests,
  listAdminMyDriverSubscriptions,
  updateAdminMyDriverProfile,
  type MyDriverProfile,
  type MyDriverRequest,
  type MyDriverSubscription,
} from "@/lib/myDriverService";
import { formatFcfa } from "@/lib/sentrajetPricing";

type Tab = "chauffeurs" | "missions" | "abonnements";

export default function AdminMyDriverPage() {
  const [tab, setTab] = useState<Tab>("chauffeurs");
  const [profiles, setProfiles] = useState<MyDriverProfile[]>([]);
  const [missions, setMissions] = useState<MyDriverRequest[]>([]);
  const [subscriptions, setSubscriptions] = useState<MyDriverSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const [profileRows, missionRows, subscriptionRows] = await Promise.all([
        listAdminMyDriverProfiles(),
        listAdminMyDriverRequests(),
        listAdminMyDriverSubscriptions(),
      ]);
      setProfiles(profileRows);
      setMissions(missionRows);
      setSubscriptions(subscriptionRows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );

  async function changeStatus(
    profile: MyDriverProfile,
    status: MyDriverProfile["status"],
  ) {
    const reason =
      status === "rejete"
        ? window.prompt("Motif du rejet", "Document incomplet ou illisible") || undefined
        : undefined;
    try {
      await updateAdminMyDriverProfile(profile.id, status, reason);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Mise à jour impossible.");
    }
  }

  async function openDocument(path: string | null) {
    if (!path) return;
    try {
      window.open(await getMyDriverDocumentSignedUrl(path), "_blank", "noopener,noreferrer");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Document indisponible.");
    }
  }

  if (loading) return <BrandedLoader />;

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Nouvelle activité</p>
      <h1 className="mt-2 text-3xl font-black">Mon Chauffeur</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        Validation des chauffeurs sans véhicule, dispatch des missions, paiements encaissés par
        SentraJet et abonnement de 1 000 FCFA par semaine après l’essai gratuit.
      </p>
      {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="mt-6 flex gap-2 overflow-x-auto">
        {([
          ["chauffeurs", `Chauffeurs (${profiles.length})`],
          ["missions", `Missions (${missions.length})`],
          ["abonnements", `Abonnements (${subscriptions.length})`],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setTab(value)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${tab === value ? "bg-[#07111f] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "chauffeurs" ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {profiles.map((profile) => (
            <article key={profile.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100"><UserRound className="h-6 w-6 text-violet-700" /></span>
                <div className="min-w-0 flex-1"><h2 className="font-black">{profile.full_name}</h2><p className="text-xs text-slate-500">{profile.city} · {profile.phone}</p></div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${profile.status === "verifie" ? "bg-emerald-100 text-emerald-800" : profile.status === "rejete" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{profile.status.replaceAll("_", " ")}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-slate-50 p-3"><b>Permis {profile.license_categories.join(", ")}</b><span className="mt-1 block text-slate-500">{profile.license_number}</span></div>
                <div className="rounded-xl bg-slate-50 p-3"><b>{profile.years_experience} ans</b><span className="mt-1 block text-slate-500">{profile.languages.join(", ")}</span></div>
                <div className="rounded-xl bg-slate-50 p-3"><b>{formatFcfa(profile.hourly_rate_fcfa)}/h</b><span className="mt-1 block text-slate-500">Tarif déclaré</span></div>
                <div className="rounded-xl bg-slate-50 p-3"><b>{formatFcfa(profile.daily_rate_fcfa)}/jour</b><span className="mt-1 block text-slate-500">{profile.vehicle_skills.join(", ")}</span></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.license_document_url ? <button type="button" onClick={() => void openDocument(profile.license_document_url)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">Voir permis</button> : null}
                {profile.id_document_url ? <button type="button" onClick={() => void openDocument(profile.id_document_url)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">Voir identité</button> : null}
                {profile.cv_url ? <button type="button" onClick={() => void openDocument(profile.cv_url)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">Voir CV</button> : null}
                {profile.status !== "verifie" ? <button type="button" onClick={() => void changeStatus(profile, "verifie")} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white"><BadgeCheck className="mr-1 inline h-4 w-4" /> Valider</button> : null}
                {profile.status !== "rejete" ? <button type="button" onClick={() => void changeStatus(profile, "rejete")} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-700">Rejeter</button> : null}
                {profile.status === "verifie" ? <button type="button" onClick={() => void changeStatus(profile, "suspendu")} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">Suspendre</button> : null}
                <button type="button" onClick={() => void grantMyDriverWeeklySubscription(profile.id).then(reload)} className="rounded-xl bg-violet-100 px-3 py-2 text-xs font-black text-violet-800"><WalletCards className="mr-1 inline h-4 w-4" /> + 7 jours · 1 000 F</button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "missions" ? (
        <div className="mt-5 grid gap-3">
          {missions.map((mission) => (
            <article key={mission.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[10px] font-black uppercase tracking-widest text-violet-700">{mission.reference}</p><h2 className="mt-1 font-black">{mission.mission_type.replaceAll("_", " ")} · {mission.vehicle_type}</h2><p className="mt-1 text-xs text-slate-500">{mission.pickup_address} · {new Date(mission.starts_at).toLocaleString("fr-FR")}</p></div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{mission.status.replaceAll("_", " ")}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <span><Clock3 className="mr-1 inline h-4 w-4" />{mission.duration_hours} h</span>
                <span><BriefcaseBusiness className="mr-1 inline h-4 w-4" />{mission.assigned_driver?.full_name || "Recherche en cours"}</span>
                {mission.amount_fcfa ? <b className="text-emerald-700">{formatFcfa(mission.amount_fcfa)} encaissés par SentraJet</b> : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "abonnements" ? (
        <div className="mt-5 grid gap-3">
          {subscriptions.map((subscription) => (
            <article key={subscription.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100"><WalletCards className="h-5 w-5 text-violet-700" /></span>
              <div className="min-w-0 flex-1"><h2 className="font-black">{profileById.get(subscription.driver_profile_id)?.full_name || "Chauffeur"}</h2><p className="text-xs text-slate-500">{subscription.plan.replaceAll("_", " ")} · jusqu’au {new Date(subscription.ends_at).toLocaleDateString("fr-FR")}</p></div>
              <div className="text-right"><b>{subscription.amount_fcfa ? formatFcfa(subscription.amount_fcfa) : "Gratuit"}</b><p className="text-[10px] text-slate-500">{subscription.status}</p></div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl bg-violet-50 p-4 text-sm text-violet-950"><ShieldCheck className="mr-2 inline h-5 w-5" />Les coordonnées privées du client et du chauffeur restent dans SentraJet jusqu’à la confirmation de la mission.</div>
    </div>
  );
}
