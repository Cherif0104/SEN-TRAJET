"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CarFront,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserRound,
  XCircle
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { DriverDocument, DriverProfile, Profile, RideClass } from "@/lib/types";

type Vehicle = {
  driver_id: string;
  ride_class: RideClass;
  brand: string;
  model: string;
  vehicle_year: number | null;
  eligible_classes: RideClass[];
  plate: string;
  color: string | null;
  seats: number;
};

type Candidate = {
  driver: DriverProfile;
  profile: Profile | null;
  vehicle: Vehicle | null;
  documents: DriverDocument[];
};

const documentLabels: Record<string, string> = {
  identity_front: "Pièce d’identité · recto",
  identity_back: "Pièce d’identité · verso",
  driver_license_front: "Permis · recto",
  driver_license_back: "Permis · verso",
  vehicle_registration: "Carte grise",
  vehicle_insurance: "Assurance véhicule",
  profile_photo: "Photo chauffeur",
  vehicle_photo: "Photo véhicule"
};

export function AdminDriverReview() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadQueue() {
    setLoading(true);
    setError(null);
    const { data: drivers, error: queueError } = await supabase
      .from("driver_profiles")
      .select("id, user_id, status, onboarding_status, is_online, accepted_services, license_number, license_issued_at, license_expires_at, birth_date, address, years_experience, submitted_at, rejection_reason")
      .eq("onboarding_status", "submitted")
      .order("submitted_at", { ascending: true });

    if (queueError) {
      setError(queueError.message);
      setLoading(false);
      return;
    }

    const rows = (drivers as DriverProfile[] | null) ?? [];
    if (!rows.length) {
      setCandidates([]);
      setSelected(null);
      setLoading(false);
      return;
    }

    const driverIds = rows.map((item) => item.id);
    const userIds = rows.map((item) => item.user_id);
    const [{ data: profiles }, { data: vehicles }, { data: documents }] = await Promise.all([
      supabase.from("profiles").select("id, role, full_name, phone, avatar_url").in("id", userIds),
      supabase.from("vehicles").select("driver_id, ride_class, brand, model, vehicle_year, eligible_classes, plate, color, seats").in("driver_id", driverIds),
      supabase
        .from("driver_documents")
        .select("id, driver_id, kind, storage_path, original_name, mime_type, file_size, status, rejection_reason")
        .in("driver_id", driverIds)
    ]);

    const profileRows = (profiles as Profile[] | null) ?? [];
    const vehicleRows = (vehicles as Vehicle[] | null) ?? [];
    const documentRows = (documents as DriverDocument[] | null) ?? [];
    const nextCandidates = rows.map((driver) => ({
      driver,
      profile: profileRows.find((profile) => profile.id === driver.user_id) ?? null,
      vehicle: vehicleRows.find((vehicle) => vehicle.driver_id === driver.id) ?? null,
      documents: documentRows.filter((document) => document.driver_id === driver.id)
    }));
    setCandidates(nextCandidates);
    setSelected((current) => nextCandidates.find((item) => item.driver.id === current?.driver.id) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  async function openCandidate(candidate: Candidate) {
    setSelected(candidate);
    setReason("");
    setError(null);
    const entries = await Promise.all(
      candidate.documents.map(async (document) => {
        const { data, error: signedError } = await supabase.storage
          .from("sentrajet-driver-documents")
          .createSignedUrl(document.storage_path, 900);
        return [document.id, signedError ? "" : data.signedUrl] as const;
      })
    );
    setSignedUrls(Object.fromEntries(entries));
  }

  async function review(action: "approve" | "reject") {
    if (!selected) return;
    if (action === "reject" && reason.trim().length < 5) {
      setError("Précisez le motif de correction en au moins 5 caractères.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: reviewError } = await supabase.rpc("admin_review_driver", {
      p_driver_id: selected.driver.id,
      p_action: action,
      p_reason: action === "reject" ? reason.trim() : "Dossier et justificatifs vérifiés."
    });
    if (reviewError) {
      setError(reviewError.message);
      setBusy(false);
      return;
    }
    setNotice(action === "approve" ? "Chauffeur activé et notifié." : "Corrections demandées au chauffeur.");
    setSelected(null);
    setSignedUrls({});
    setBusy(false);
    await loadQueue();
  }

  async function logout() {
    await signOut();
    router.replace("/");
  }

  return (
    <section className="admin-review safe-bottom">
      <header className="admin-header safe-top">
        <div>
          <BrandLogo compact inverse />
          <p>Centre des opérations</p>
        </div>
        <button type="button" onClick={() => void logout()} aria-label="Se déconnecter"><LogOut size={18} /></button>
      </header>

      <div className="admin-content">
        <div className="admin-title">
          <div>
            <p className="eyebrow">Conformité chauffeurs</p>
            <h1>Dossiers à vérifier</h1>
          </div>
          <button type="button" onClick={() => void loadQueue()} aria-label="Actualiser"><RefreshCw className={loading ? "spin" : ""} size={19} /></button>
        </div>
        <div className="admin-metric">
          <span><Clock3 /></span>
          <div><strong>{candidates.length}</strong><small>demande{candidates.length === 1 ? "" : "s"} en attente</small></div>
          <ShieldCheck />
        </div>
        {notice ? <div className="success">{notice}</div> : null}
        {error ? <div className="error">{error}</div> : null}

        {loading ? (
          <div className="admin-empty"><RefreshCw className="spin" /><p>Synchronisation de la file…</p></div>
        ) : candidates.length ? (
          <div className="admin-queue">
            {candidates.map((candidate) => (
              <button type="button" key={candidate.driver.id} onClick={() => void openCandidate(candidate)}>
                <span className="candidate-avatar"><UserRound /></span>
                <span>
                  <strong>{candidate.profile?.full_name || "Chauffeur"}</strong>
                  <small>{candidate.vehicle ? `${candidate.vehicle.brand} ${candidate.vehicle.model} · ${candidate.vehicle.plate}` : "Véhicule à contrôler"}</small>
                  <em>{candidate.driver.submitted_at ? new Date(candidate.driver.submitted_at).toLocaleDateString("fr-FR") : "Aujourd’hui"}</em>
                </span>
                <ArrowRight size={19} />
              </button>
            ))}
          </div>
        ) : (
          <div className="admin-empty">
            <CheckCircle2 color="var(--green)" />
            <h2>File à jour</h2>
            <p>Aucun dossier chauffeur n’attend de validation.</p>
          </div>
        )}
      </div>

      {selected ? (
        <div className="review-drawer" role="dialog" aria-modal="true" aria-label="Revue du dossier chauffeur">
          <div className="review-drawer-handle" />
          <div className="review-drawer-title">
            <div><p className="eyebrow">Revue complète</p><h2>{selected.profile?.full_name}</h2></div>
            <button type="button" onClick={() => setSelected(null)} aria-label="Fermer"><XCircle /></button>
          </div>

          <div className="review-section">
            <h3><UserRound /> Identité</h3>
            <ReviewLine label="Téléphone" value={selected.profile?.phone || "Non renseigné"} />
            <ReviewLine label="Permis" value={selected.driver.license_number || "Non renseigné"} />
            <ReviewLine label="Validité du permis" value={`${selected.driver.license_issued_at || "—"} → ${selected.driver.license_expires_at || "—"}`} />
            <ReviewLine label="Naissance" value={selected.driver.birth_date || "Non renseignée"} />
            <ReviewLine label="Expérience" value={`${selected.driver.years_experience ?? 0} an(s)`} />
            <ReviewLine label="Adresse" value={selected.driver.address || "Non renseignée"} />
          </div>

          <div className="review-section">
            <h3><CarFront /> Véhicule</h3>
            <ReviewLine label="Modèle" value={selected.vehicle ? `${selected.vehicle.brand} ${selected.vehicle.model} · ${selected.vehicle.vehicle_year || "année inconnue"}` : "Absent"} />
            <ReviewLine label="Plaque" value={selected.vehicle?.plate || "Absente"} />
            <ReviewLine label="Gamme" value={selected.vehicle?.ride_class.replace("_", " ") || "Non définie"} />
            <ReviewLine label="Classes autorisées" value={selected.vehicle?.eligible_classes?.map((item) => item.replace("_", " +")).join(" · ") || "À contrôler"} />
            <ReviewLine label="Capacité" value={`${selected.vehicle?.seats ?? 0} place(s)`} />
          </div>

          <div className="review-section">
            <h3><FileText /> Justificatifs</h3>
            <div className="admin-documents">
              {selected.documents.map((document) => (
                <a key={document.id} href={signedUrls[document.id] || "#"} target="_blank" rel="noreferrer" aria-disabled={!signedUrls[document.id]}>
                  <span><FileText /><strong>{documentLabels[document.kind] ?? document.kind}</strong></span>
                  <ExternalLink size={17} />
                </a>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Motif si correction demandée</label>
            <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Expliquez précisément le document ou l’information à corriger." />
          </div>
          <div className="review-actions">
            <button className="secondary-button reject" type="button" disabled={busy} onClick={() => void review("reject")}>
              <XCircle size={18} /> Demander une correction
            </button>
            <button className="primary-button gold" type="button" disabled={busy || selected.documents.length < 4} onClick={() => void review("approve")}>
              <BadgeCheck size={18} /> Activer le chauffeur
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return <div className="review-line"><small>{label}</small><strong>{value}</strong></div>;
}
