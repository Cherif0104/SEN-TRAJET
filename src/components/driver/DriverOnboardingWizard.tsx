"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  CarFront,
  Check,
  FileCheck2,
  FileText,
  LoaderCircle,
  ShieldCheck,
  Upload
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type {
  DriverDocument,
  DriverDocumentKind,
  DriverOnboardingStatus,
  DriverProfile,
  RideClass
} from "@/lib/types";
import {
  eligibleRideClasses,
  modelsForBrand,
  rideClassLabel,
  VEHICLE_BRANDS,
  VEHICLE_COLORS,
  VEHICLE_YEARS
} from "@/lib/vehicleCatalog";

type VehicleForm = {
  brand: string;
  model: string;
  year: string;
  plate: string;
  color: string;
  seats: string;
};

type DriverForm = {
  fullName: string;
  licenseNumber: string;
  licenseIssuedAt: string;
  licenseExpiresAt: string;
  birthDate: string;
  yearsExperience: string;
};

type VehicleRow = {
  ride_class: RideClass;
  brand: string;
  model: string;
  vehicle_year: number | null;
  plate: string;
  color: string | null;
  seats: number;
};

const requiredDocuments: Array<{
  kind: DriverDocumentKind;
  title: string;
  hint: string;
  icon: typeof FileText;
}> = [
  { kind: "identity_front", title: "Pièce d’identité · recto", hint: "CNI ou passeport, face avant lisible", icon: FileText },
  { kind: "identity_back", title: "Pièce d’identité · verso", hint: "Face arrière complète et sans reflet", icon: FileText },
  { kind: "driver_license_front", title: "Permis · recto", hint: "Photo, identité et numéro lisibles", icon: BadgeCheck },
  { kind: "driver_license_back", title: "Permis · verso", hint: "Catégories et dates visibles", icon: BadgeCheck },
  { kind: "vehicle_registration", title: "Carte grise", hint: "Document du véhicule déclaré", icon: CarFront },
  { kind: "vehicle_insurance", title: "Assurance véhicule", hint: "Attestation en cours de validité", icon: ShieldCheck }
];

const steps = ["Identité", "Véhicule", "Documents", "Validation"];

function friendlyError(reason: unknown) {
  const raw = reason instanceof Error ? reason.message : "Une erreur est survenue.";
  if (/required_documents_missing/i.test(raw)) return "Ajoutez les quatre documents obligatoires avant l’envoi.";
  if (/invalid_driver_onboarding_data/i.test(raw)) return "Vérifiez vos informations personnelles et celles du véhicule.";
  if (/approved_profile_locked/i.test(raw)) return "Ce dossier est déjà validé et ne peut plus être modifié.";
  if (/payload too large|maximum allowed size|file size/i.test(raw)) return "Le fichier dépasse la taille maximale de 10 Mo.";
  if (/mime|content type/i.test(raw)) return "Utilisez un fichier PDF, JPEG, PNG ou WebP.";
  return raw;
}

export function DriverOnboardingWizard() {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [driverForm, setDriverForm] = useState<DriverForm>({
    fullName: "",
    licenseNumber: "",
    licenseIssuedAt: "",
    licenseExpiresAt: "",
    birthDate: "",
    yearsExperience: "0"
  });
  const [vehicle, setVehicle] = useState<VehicleForm>({
    brand: "",
    model: "",
    year: "",
    plate: "",
    color: "",
    seats: "4"
  });
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<DriverDocumentKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function load() {
      setLoading(true);
      const { data: driverData, error: driverError } = await supabase
        .from("driver_profiles")
        .select("id, user_id, status, onboarding_status, is_online, accepted_services, license_number, license_issued_at, license_expires_at, birth_date, address, years_experience, submitted_at, rejection_reason")
        .eq("user_id", user!.id)
        .single();
      if (driverError) {
        if (active) setError(friendlyError(driverError));
        if (active) setLoading(false);
        return;
      }

      const driverProfile = driverData as DriverProfile;
      const [{ data: vehicleData }, { data: documentData }] = await Promise.all([
        supabase
          .from("vehicles")
          .select("ride_class, brand, model, vehicle_year, plate, color, seats")
          .eq("driver_id", driverProfile.id)
          .order("created_at")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("driver_documents")
          .select("id, driver_id, kind, storage_path, original_name, mime_type, file_size, status, rejection_reason")
          .eq("driver_id", driverProfile.id)
          .order("created_at")
      ]);

      if (!active) return;
      setDriver(driverProfile);
      setDriverForm({
        fullName: profile?.full_name ?? "",
        licenseNumber: driverProfile.license_number ?? "",
        licenseIssuedAt: driverProfile.license_issued_at ?? "",
        licenseExpiresAt: driverProfile.license_expires_at ?? "",
        birthDate: driverProfile.birth_date ?? "",
        yearsExperience: String(driverProfile.years_experience ?? 0)
      });
      if (vehicleData) {
        const row = vehicleData as VehicleRow;
        setVehicle({
          brand: row.brand,
          model: row.model,
          year: row.vehicle_year ? String(row.vehicle_year) : "",
          plate: row.plate,
          color: row.color ?? "",
          seats: String(row.seats)
        });
      }
      setDocuments((documentData as DriverDocument[] | null) ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [profile?.full_name, user]);

  const completedDocuments = useMemo(
    () => requiredDocuments.filter(({ kind }) => documents.some((document) => document.kind === kind)).length,
    [documents]
  );

  async function persistDetails() {
    const { error: saveError } = await supabase.rpc("save_driver_onboarding", {
      p_full_name: driverForm.fullName,
      p_license_number: driverForm.licenseNumber,
      p_license_issued_at: driverForm.licenseIssuedAt,
      p_license_expires_at: driverForm.licenseExpiresAt,
      p_birth_date: driverForm.birthDate,
      p_years_experience: Number(driverForm.yearsExperience),
      p_brand: vehicle.brand,
      p_model: vehicle.model,
      p_vehicle_year: Number(vehicle.year),
      p_plate: vehicle.plate,
      p_color: vehicle.color,
      p_seats: Number(vehicle.seats)
    });
    if (saveError) throw saveError;
  }

  async function saveDetails(nextStep: number) {
    setError(null);
    setBusy(true);
    try {
      await persistDetails();
      setStep(nextStep);
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function uploadDocument(kind: DriverDocumentKind, file: File) {
    if (!user || !driver) return;
    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError("Le fichier dépasse la taille maximale de 10 Mo.");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setError("Utilisez un fichier PDF, JPEG, PNG ou WebP.");
      return;
    }

    setUploading(kind);
    const oldDocument = documents.find((document) => document.kind === kind);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
    const path = `${user.id}/${kind}/${crypto.randomUUID()}-${safeName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("sentrajet-driver-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      if (oldDocument) {
        const { error: deleteRowError } = await supabase
          .from("driver_documents")
          .delete()
          .eq("id", oldDocument.id);
        if (deleteRowError) throw deleteRowError;
      }

      const { data, error: insertError } = await supabase
        .from("driver_documents")
        .insert({
          driver_id: driver.id,
          kind,
          storage_path: path,
          original_name: file.name,
          mime_type: file.type,
          file_size: file.size,
          status: "draft"
        })
        .select("id, driver_id, kind, storage_path, original_name, mime_type, file_size, status, rejection_reason")
        .single();
      if (insertError) throw insertError;

      if (oldDocument) {
        await supabase.storage.from("sentrajet-driver-documents").remove([oldDocument.storage_path]);
      }
      setDocuments((current) => [
        ...current.filter((document) => document.kind !== kind),
        data as DriverDocument
      ]);
    } catch (reason) {
      await supabase.storage.from("sentrajet-driver-documents").remove([path]);
      setError(friendlyError(reason));
    } finally {
      setUploading(null);
    }
  }

  async function submitApplication() {
    setError(null);
    setBusy(true);
    try {
      await persistDetails();
      const { error: submitError } = await supabase.rpc("submit_driver_onboarding");
      if (submitError) throw submitError;
      setDriver((current) =>
        current ? { ...current, onboarding_status: "submitted", submitted_at: new Date().toISOString() } : current
      );
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="driver-loading">
        <LoaderCircle className="spin" color="var(--gold)" />
        <p>Préparation de votre dossier sécurisé…</p>
      </div>
    );
  }

  if (driver?.onboarding_status === "submitted" || driver?.onboarding_status === "approved") {
    const approved = driver.onboarding_status === "approved";
    return (
      <section className="driver-status-screen safe-top safe-bottom">
        <BrandLogo inverse />
        <div className="driver-status-card">
          <span className="status-orb"><FileCheck2 /></span>
          <p className="onboarding-eyebrow">{approved ? "Compte activé" : "Dossier transmis"}</p>
          <h1>{approved ? "Vous êtes prêt à conduire." : "Notre équipe vérifie votre dossier."}</h1>
          <p>
            {approved
              ? "Votre véhicule et vos justificatifs ont été validés."
              : "Vous recevrez une notification dès que la revue sera terminée. Vos documents restent privés."}
          </p>
          <Link className="primary-button gold" href="/driver">
            Accéder à mon espace <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="driver-wizard safe-bottom">
      <header className="driver-hero safe-top">
        <div className="driver-hero-top">
          <Link href="/driver" aria-label="Retour à l’espace chauffeur"><ArrowLeft size={20} /></Link>
          <BrandLogo compact inverse />
          <span className="secure-badge"><ShieldCheck size={14} /> Privé</span>
        </div>
        <p className="onboarding-eyebrow">Activation chauffeur</p>
        <h1>Votre espace professionnel commence ici.</h1>
        <p>Un parcours guidé pour vérifier votre identité, votre véhicule et vous confier des courses.</p>
        <div className="onboarding-progress" aria-label={`Étape ${step + 1} sur ${steps.length}`}>
          {steps.map((label, index) => (
            <div key={label} className={index === step ? "active" : index < step ? "done" : ""}>
              <span>{index < step ? <Check size={13} /> : index + 1}</span>
              <small>{label}</small>
            </div>
          ))}
        </div>
      </header>

      <div className="wizard-body">
        {driver?.onboarding_status === "rejected" && driver.rejection_reason ? (
          <div className="review-alert">
            <strong>Correction demandée</strong>
            <p>{driver.rejection_reason}</p>
          </div>
        ) : null}

        {step === 0 ? (
          <div className="wizard-step">
            <StepHeading number="01" title="Faisons connaissance" text="Ces informations permettent de vérifier votre aptitude professionnelle." />
            <div className="field">
              <label>Nom et prénom</label>
              <input value={driverForm.fullName} onChange={(event) => setDriverForm({ ...driverForm, fullName: event.target.value })} placeholder="Nom complet tel qu’indiqué sur vos pièces" autoComplete="name" />
            </div>
            <div className="field">
              <label>Numéro de permis</label>
              <input value={driverForm.licenseNumber} onChange={(event) => setDriverForm({ ...driverForm, licenseNumber: event.target.value })} placeholder="Ex. SN-123456" />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Permis obtenu le</label>
                <input type="date" value={driverForm.licenseIssuedAt} onChange={(event) => setDriverForm({ ...driverForm, licenseIssuedAt: event.target.value })} />
              </div>
              <div className="field">
                <label>Expire le</label>
                <input type="date" value={driverForm.licenseExpiresAt} onChange={(event) => setDriverForm({ ...driverForm, licenseExpiresAt: event.target.value })} />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Date de naissance</label>
                <input type="date" value={driverForm.birthDate} onChange={(event) => setDriverForm({ ...driverForm, birthDate: event.target.value })} />
              </div>
              <div className="field">
                <label>Expérience</label>
                <input type="number" min="0" max="60" value={driverForm.yearsExperience} onChange={(event) => setDriverForm({ ...driverForm, yearsExperience: event.target.value })} />
              </div>
            </div>
            <button className="primary-button" type="button" disabled={!driverForm.fullName.trim() || !driverForm.licenseNumber.trim() || !driverForm.licenseIssuedAt || !driverForm.licenseExpiresAt || !driverForm.birthDate} onClick={() => setStep(1)}>
              Continuer <ArrowRight size={18} />
            </button>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="wizard-step">
            <StepHeading number="02" title="Votre véhicule" text="Déclarez le véhicule principal utilisé pour recevoir les missions." />
            <div className="form-grid">
              <div className="field">
                <label>Marque</label>
                <select value={vehicle.brand} onChange={(event) => setVehicle({ ...vehicle, brand: event.target.value, model: "" })}>
                  <option value="">Choisir</option>
                  {VEHICLE_BRANDS.map((brand) => <option value={brand} key={brand}>{brand}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Modèle</label>
                <select value={vehicle.model} disabled={!vehicle.brand} onChange={(event) => setVehicle({ ...vehicle, model: event.target.value })}>
                  <option value="">Choisir</option>
                  {modelsForBrand(vehicle.brand).map((model) => <option value={model} key={model}>{model}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Année</label>
                <select value={vehicle.year} onChange={(event) => setVehicle({ ...vehicle, year: event.target.value })}>
                  <option value="">Choisir</option>
                  {VEHICLE_YEARS.map((year) => <option value={year} key={year}>{year}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Places</label>
                <input type="number" min="1" max="60" value={vehicle.seats} onChange={(event) => setVehicle({ ...vehicle, seats: event.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Immatriculation</label>
              <input value={vehicle.plate} onChange={(event) => setVehicle({ ...vehicle, plate: event.target.value.toUpperCase() })} placeholder="DK 0000 AA" />
            </div>
            <div className="field">
              <label>Couleur</label>
              <div className="vehicle-colors">
                {VEHICLE_COLORS.map((color) => (
                  <button type="button" key={color.value} className={vehicle.color === color.value ? "selected" : ""} aria-label={color.value} onClick={() => setVehicle({ ...vehicle, color: color.value })}>
                    <i style={{ background: color.hex }} /><span>{color.value}</span>
                  </button>
                ))}
              </div>
            </div>
            {vehicle.year ? (
              <div className="eligibility-preview">
                <ShieldCheck />
                <div>
                  <strong>Classes estimées</strong>
                  <span>{eligibleRideClasses(Number(vehicle.year)).map(rideClassLabel).join(" · ")}</span>
                  <small>Attribution finale après contrôle du modèle, de l’état et des documents.</small>
                </div>
              </div>
            ) : null}
            <div className="wizard-actions">
              <button className="secondary-button" type="button" onClick={() => setStep(0)}>Retour</button>
              <button className="primary-button" type="button" disabled={busy || !vehicle.brand || !vehicle.model || !vehicle.year || !vehicle.plate || !vehicle.color} onClick={() => void saveDetails(2)}>
                {busy ? "Enregistrement…" : "Enregistrer et continuer"}
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="wizard-step">
            <StepHeading number="03" title="Contrôle documentaire" text="Photographiez chaque face sans reflet. Les données sont rapprochées de votre identité avant la revue finale." />
            <div className="document-list">
              {requiredDocuments.map(({ kind, title, hint, icon: Icon }) => {
                const document = documents.find((item) => item.kind === kind);
                return (
                  <label className={`document-tile ${document ? "complete" : ""}`} key={kind}>
                    <span className="document-icon">{document ? <Check /> : <Icon />}</span>
                    <span>
                      <strong>{title}</strong>
                      <small>{document?.original_name ?? hint}</small>
                    </span>
                    <span className="document-action">
                      {uploading === kind ? <LoaderCircle className="spin" /> : document ? "Remplacer" : <Upload />}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      capture="environment"
                      disabled={uploading !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadDocument(kind, file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                );
              })}
            </div>
            <div className="document-count"><FileCheck2 size={18} /> {completedDocuments}/{requiredDocuments.length} documents obligatoires ajoutés</div>
            <div className="wizard-actions">
              <button className="secondary-button" type="button" onClick={() => setStep(1)}>Retour</button>
              <button className="primary-button" type="button" disabled={completedDocuments < requiredDocuments.length} onClick={() => setStep(3)}>
                Vérifier mon dossier
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="wizard-step">
            <StepHeading number="04" title="Prêt pour la vérification" text="Relisez vos éléments. Après l’envoi, l’équipe SentraJet contrôle chaque justificatif." />
            <div className="summary-card">
              <SummaryLine label="Permis" value={driverForm.licenseNumber} />
              <SummaryLine label="Véhicule" value={`${vehicle.brand} ${vehicle.model}`} />
              <SummaryLine label="Immatriculation" value={vehicle.plate} />
              <SummaryLine label="Année et couleur" value={`${vehicle.year} · ${vehicle.color}`} />
              <SummaryLine label="Classes estimées" value={eligibleRideClasses(Number(vehicle.year)).map(rideClassLabel).join(" · ")} />
              <SummaryLine label="Documents" value={`${completedDocuments} fichiers sécurisés`} />
            </div>
            <div className="consent-note">
              <ShieldCheck size={20} />
              <p>En envoyant ce dossier, vous certifiez l’exactitude des informations. Aucun paiement n’est demandé pour la validation.</p>
            </div>
            <div className="wizard-actions">
              <button className="secondary-button" type="button" onClick={() => setStep(2)}>Modifier</button>
              <button className="primary-button gold" type="button" disabled={busy || completedDocuments < requiredDocuments.length} onClick={() => void submitApplication()}>
                {busy ? "Envoi sécurisé…" : "Envoyer pour validation"}
              </button>
            </div>
          </div>
        ) : null}

        {error ? <div className="error" role="alert">{error}</div> : null}
      </div>
    </section>
  );
}

function StepHeading({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="step-heading">
      <span>{number}</span>
      <div><h2>{title}</h2><p>{text}</p></div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div><small>{label}</small><strong>{value || "À compléter"}</strong></div>;
}
