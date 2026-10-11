"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  CarFront,
  Check,
  Crosshair,
  FileCheck2,
  FileText,
  LoaderCircle,
  MapPin,
  ScanFace,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type {
  DriverDocument,
  DriverDocumentKind,
  DriverProfile,
  Place,
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

type PersonalForm = {
  fullName: string;
  phone: string;
  birthDate: string;
  region: string;
  baseLat: number | null;
  baseLng: number | null;
};

type LicenseForm = {
  number: string;
  issuedAt: string;
  expiresAt: string;
};

type VehicleForm = {
  brand: string;
  model: string;
  year: string;
  plate: string;
  color: string;
  seats: string;
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

type DocumentDefinition = {
  kind: DriverDocumentKind;
  title: string;
  hint: string;
  icon: typeof FileText;
  capture: "user" | "environment";
};

type StoredDraft = {
  version: 1;
  step: number;
  personal: PersonalForm;
  license: LicenseForm;
  vehicle: VehicleForm;
  savedAt: string;
};

const LICENSE_DOCUMENTS: DocumentDefinition[] = [
  { kind: "driver_license_front", title: "Permis · recto", hint: "Photo, nom et numéro bien visibles", icon: BadgeCheck, capture: "environment" },
  { kind: "driver_license_back", title: "Permis · verso", hint: "Catégories et dates sans reflet", icon: BadgeCheck, capture: "environment" }
];

const VEHICLE_DOCUMENTS: DocumentDefinition[] = [
  { kind: "vehicle_registration", title: "Carte grise", hint: "Toutes les mentions du véhicule", icon: FileText, capture: "environment" },
  { kind: "vehicle_insurance", title: "Assurance", hint: "Attestation en cours de validité", icon: ShieldCheck, capture: "environment" },
  { kind: "vehicle_photo", title: "Photo du véhicule", hint: "Vue extérieure complète et nette", icon: CarFront, capture: "environment" }
];

const IDENTITY_DOCUMENTS: DocumentDefinition[] = [
  { kind: "identity_front", title: "Identité · recto", hint: "CNI ou passeport, face avant", icon: FileText, capture: "environment" },
  { kind: "identity_back", title: "Identité · verso", hint: "Face arrière complète", icon: FileText, capture: "environment" },
  { kind: "profile_photo", title: "Photo du visage", hint: "Visage seul, de face et bien éclairé", icon: ScanFace, capture: "user" }
];

const REQUIRED_DOCUMENTS = [
  ...LICENSE_DOCUMENTS,
  ...VEHICLE_DOCUMENTS,
  ...IDENTITY_DOCUMENTS
];

const STEP_LABELS = [
  "Profil",
  "Permis",
  "Photos permis",
  "Véhicule",
  "Documents véhicule",
  "Identité",
  "Validation"
];

function expiryAfterTenYears(issuedAt: string) {
  if (!issuedAt) return "";
  const date = new Date(`${issuedAt}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCFullYear(date.getUTCFullYear() + 10);
  return date.toISOString().slice(0, 10);
}

function experienceFromIssueDate(issuedAt: string) {
  if (!issuedAt) return 0;
  const issue = new Date(`${issuedAt}T00:00:00Z`);
  const now = new Date();
  let years = now.getUTCFullYear() - issue.getUTCFullYear();
  if (
    now.getUTCMonth() < issue.getUTCMonth()
    || (now.getUTCMonth() === issue.getUTCMonth() && now.getUTCDate() < issue.getUTCDate())
  ) years -= 1;
  return Math.max(0, Math.min(years, 60));
}

function latestAdultBirthDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function isAdult(birthDate: string) {
  return Boolean(birthDate) && birthDate <= latestAdultBirthDate();
}

function friendlyError(reason: unknown) {
  const raw = reason instanceof Error
    ? reason.message
    : reason && typeof reason === "object" && "message" in reason
      ? String(reason.message)
      : "Une erreur est survenue.";
  const errors: Array<[RegExp, string]> = [
    [/invalid_full_name/i, "Renseignez vos nom et prénom tels qu’ils figurent sur vos pièces."],
    [/invalid_phone/i, "Renseignez un numéro de téléphone sénégalais valide."],
    [/driver_underage/i, "Le chauffeur doit avoir au moins 18 ans."],
    [/operating_region_required/i, "Autorisez la localisation pour définir votre région d’activité."],
    [/invalid_license_number/i, "Vérifiez le numéro de votre permis."],
    [/invalid_license_issue_date/i, "La date d’obtention du permis est incorrecte."],
    [/invalid_license_validity/i, "La date d’expiration doit correspondre aux 10 ans de validité du permis."],
    [/license_expired/i, "Ce permis est arrivé à expiration. Renouvelez-le avant l’inscription."],
    [/invalid_vehicle_year/i, "Sélectionnez une année de véhicule valide."],
    [/invalid_vehicle_reference/i, "Sélectionnez la marque et le modèle du véhicule."],
    [/invalid_vehicle_plate/i, "Vérifiez le numéro d’immatriculation."],
    [/invalid_vehicle_color/i, "Sélectionnez la couleur du véhicule."],
    [/invalid_vehicle_capacity/i, "Vérifiez le nombre de places."],
    [/required_documents_missing/i, "Ajoutez toutes les photos obligatoires avant l’envoi."],
    [/driver_information_incomplete/i, "Certaines informations obligatoires sont encore incomplètes."],
    [/approved_profile_locked/i, "Ce dossier est déjà validé et ne peut plus être modifié."],
    [/payload too large|maximum allowed size|file size/i, "La photo dépasse la taille maximale de 10 Mo."],
    [/mime|content type/i, "Utilisez une photo JPEG, PNG, WebP ou un PDF."],
    [/failed to fetch|network|load failed/i, "Connexion momentanément impossible. Vérifiez votre réseau puis réessayez."]
  ];
  return errors.find(([pattern]) => pattern.test(raw))?.[1] ?? raw;
}

async function validateImageQuality(file: File) {
  if (!file.type.startsWith("image/")) return;
  if (typeof createImageBitmap !== "function") return;
  const image = await createImageBitmap(file);
  const valid = image.width >= 720 && image.height >= 480;
  image.close();
  if (!valid) throw new Error("image_resolution_too_low");
}

function readDraft(userId: string): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(`sentrajet:driver-draft:${userId}`);
    if (!raw) return null;
    const value = JSON.parse(raw) as StoredDraft;
    if (
      value.version !== 1
      || !Number.isInteger(value.step)
      || value.step < 0
      || value.step >= STEP_LABELS.length
    ) return null;
    return value;
  } catch {
    return null;
  }
}

export function DriverOnboardingWizard() {
  const { user, profile } = useAuth();
  const locationAttempted = useRef(false);
  const [step, setStep] = useState(0);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [personal, setPersonal] = useState<PersonalForm>({
    fullName: "",
    phone: "",
    birthDate: "",
    region: "",
    baseLat: null,
    baseLng: null
  });
  const [license, setLicense] = useState<LicenseForm>({
    number: "",
    issuedAt: "",
    expiresAt: ""
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
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [draftReady, setDraftReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [uploading, setUploading] = useState<DriverDocumentKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function detectRegion(silent = false) {
    if (!navigator.geolocation) {
      if (!silent) setError("La géolocalisation n’est pas disponible sur cet appareil.");
      return;
    }
    setLocating(true);
    if (!silent) setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        void fetch(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`)
          .then((response) => response.json())
          .then((data: { place?: Place }) => {
            const place = data.place;
            setPersonal((current) => ({
              ...current,
              region: place?.region || place?.label || "Sénégal",
              baseLat: latitude,
              baseLng: longitude
            }));
          })
          .catch(() => {
            setPersonal((current) => ({
              ...current,
              region: "Sénégal",
              baseLat: latitude,
              baseLng: longitude
            }));
          })
          .finally(() => setLocating(false));
      },
      (reason) => {
        setLocating(false);
        if (!silent) {
          setError(reason.code === 1
            ? "Autorisez la localisation pour définir votre région d’activité."
            : "Position indisponible. Réessayez dans un endroit dégagé.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 }
    );
  }

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function load() {
      setLoading(true);
      const { data: driverData, error: driverError } = await supabase
        .from("driver_profiles")
        .select("id, user_id, status, onboarding_status, is_online, accepted_services, license_number, license_issued_at, license_expires_at, birth_date, address, operating_region, base_lat, base_lng, years_experience, submitted_at, rejection_reason, verification_score, verification_method, verification_details, automated_verified_at")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (driverError || !driverData) {
        if (active) setError(driverError ? friendlyError(driverError) : "Profil chauffeur introuvable. Reconnectez-vous puis réessayez.");
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

      const documentRows = (documentData as DriverDocument[] | null) ?? [];
      const previewEntries = await Promise.all(
        documentRows
          .filter((document) => document.mime_type.startsWith("image/"))
          .map(async (document) => {
            const { data } = await supabase.storage
              .from("sentrajet-driver-documents")
              .createSignedUrl(document.storage_path, 3600);
            return [document.kind, data?.signedUrl || ""] as const;
          })
      );

      if (!active) return;
      const storedDraft = readDraft(user!.id);
      const serverPersonal: PersonalForm = {
        fullName: profile?.full_name ?? "",
        phone: profile?.phone ?? "",
        birthDate: driverProfile.birth_date ?? "",
        region: driverProfile.operating_region ?? "",
        baseLat: driverProfile.base_lat ?? null,
        baseLng: driverProfile.base_lng ?? null
      };
      const serverLicense: LicenseForm = {
        number: driverProfile.license_number ?? "",
        issuedAt: driverProfile.license_issued_at ?? "",
        expiresAt: driverProfile.license_expires_at ?? ""
      };
      setDriver(driverProfile);
      setPersonal(storedDraft?.personal ?? serverPersonal);
      setLicense(storedDraft?.license ?? serverLicense);
      if (vehicleData) {
        const row = vehicleData as VehicleRow;
        const serverVehicle: VehicleForm = {
          brand: row.brand,
          model: row.model,
          year: row.vehicle_year ? String(row.vehicle_year) : "",
          plate: row.plate,
          color: row.color ?? "",
          seats: String(row.seats)
        };
        setVehicle(storedDraft?.vehicle ?? serverVehicle);
      } else if (storedDraft) {
        setVehicle(storedDraft.vehicle);
      }
      setDocuments(documentRows);
      setPreviews(Object.fromEntries(previewEntries.filter(([, url]) => Boolean(url))));
      if (storedDraft && driverProfile.onboarding_status !== "submitted" && driverProfile.onboarding_status !== "approved") {
        setStep(storedDraft.step);
      }
      setDraftReady(true);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [profile?.full_name, profile?.phone, user]);

  useEffect(() => {
    if (loading || personal.region || locationAttempted.current) return;
    locationAttempted.current = true;
    void detectRegion(true);
  }, [loading, personal.region]);

  useEffect(() => {
    if (!user || !draftReady) return;
    const key = `sentrajet:driver-draft:${user.id}`;
    if (driver?.onboarding_status === "submitted" || driver?.onboarding_status === "approved") {
      window.localStorage.removeItem(key);
      return;
    }
    const draft: StoredDraft = {
      version: 1,
      step,
      personal,
      license,
      vehicle,
      savedAt: new Date().toISOString()
    };
    window.localStorage.setItem(key, JSON.stringify(draft));
  }, [draftReady, driver?.onboarding_status, license, personal, step, user, vehicle]);

  const completedDocuments = useMemo(
    () => REQUIRED_DOCUMENTS.filter(({ kind }) => documents.some((document) => document.kind === kind)).length,
    [documents]
  );

  async function persistDetails() {
    const { error: saveError } = await supabase.rpc("save_driver_onboarding", {
      p_full_name: personal.fullName.trim(),
      p_phone: personal.phone.trim(),
      p_birth_date: personal.birthDate,
      p_operating_region: personal.region,
      p_base_lat: personal.baseLat,
      p_base_lng: personal.baseLng,
      p_license_number: license.number.trim(),
      p_license_issued_at: license.issuedAt,
      p_license_expires_at: license.expiresAt,
      p_years_experience: experienceFromIssueDate(license.issuedAt),
      p_brand: vehicle.brand,
      p_model: vehicle.model,
      p_vehicle_year: Number(vehicle.year),
      p_plate: vehicle.plate.trim(),
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
      setError("La photo dépasse la taille maximale de 10 Mo.");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setError("Utilisez une photo JPEG, PNG, WebP ou un PDF.");
      return;
    }
    if ((kind === "profile_photo" || kind === "vehicle_photo") && !file.type.startsWith("image/")) {
      setError("Prenez une photo directement avec l’appareil.");
      return;
    }

    setUploading(kind);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
    const path = `${user.id}/${kind}/${crypto.randomUUID()}-${safeName}`;

    try {
      await validateImageQuality(file);
      const { error: uploadError } = await supabase.storage
        .from("sentrajet-driver-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      // Read from the server instead of relying on React state: returning from
      // the mobile camera can reload the page and leave that state stale.
      const { data: existingDocument, error: existingDocumentError } = await supabase
        .from("driver_documents")
        .select("id, storage_path")
        .eq("driver_id", driver.id)
        .eq("kind", kind)
        .maybeSingle();
      if (existingDocumentError) throw existingDocumentError;

      if (existingDocument) {
        const { error: deleteRowError } = await supabase
          .from("driver_documents")
          .delete()
          .eq("id", existingDocument.id);
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

      if (existingDocument) {
        await supabase.storage.from("sentrajet-driver-documents").remove([existingDocument.storage_path]);
      }
      if (file.type.startsWith("image/")) {
        const { data: signed } = await supabase.storage
          .from("sentrajet-driver-documents")
          .createSignedUrl(path, 3600);
        if (signed?.signedUrl) {
          setPreviews((current) => ({ ...current, [kind]: signed.signedUrl }));
        }
      }
      setDocuments((current) => [
        ...current.filter((document) => document.kind !== kind),
        data as DriverDocument
      ]);
    } catch (reason) {
      await supabase.storage.from("sentrajet-driver-documents").remove([path]);
      setError(
        reason instanceof Error && reason.message === "image_resolution_too_low"
          ? "Photo trop petite. Reprenez-la avec une résolution d’au moins 720 × 480."
          : friendlyError(reason)
      );
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
      const { data: verifiedDriver, error: verificationError } = await supabase
        .from("driver_profiles")
        .select("status, onboarding_status, submitted_at, verification_score, verification_method, verification_details, automated_verified_at")
        .eq("id", driver?.id ?? "")
        .single();
      if (verificationError) throw verificationError;
      if (user) window.localStorage.removeItem(`sentrajet:driver-draft:${user.id}`);
      setDriver((current) =>
        current ? { ...current, ...verifiedDriver } as DriverProfile : current
      );
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setBusy(false);
    }
  }

  function renderDocuments(definitions: DocumentDefinition[]) {
    return (
      <div className="document-list compact">
        {definitions.map(({ kind, title, hint, icon: Icon, capture }) => {
          const document = documents.find((item) => item.kind === kind);
          return (
            <label className={`document-tile ${document ? "complete" : ""}`} key={kind}>
              <span className={`document-icon ${previews[kind] ? "photo" : ""}`}>
                {previews[kind] ? <img src={previews[kind]} alt="" /> : document ? <Check /> : <Icon />}
              </span>
              <span><strong>{title}</strong><small>{document?.original_name ?? hint}</small></span>
              <span className="document-action">
                {uploading === kind ? <LoaderCircle className="spin" /> : document ? "Refaire" : <Camera />}
              </span>
              <input
                type="file"
                accept="image/*"
                capture={capture}
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
    );
  }

  function goBack() {
    setError(null);
    setStep((current) => Math.max(0, current - 1));
  }

  if (loading) {
    return <div className="driver-loading"><LoaderCircle className="spin" color="var(--gold)" /><p>Préparation du dossier sécurisé…</p></div>;
  }

  if (driver?.onboarding_status === "submitted" || driver?.onboarding_status === "approved") {
    const approved = driver.onboarding_status === "approved";
    return (
      <section className="driver-status-screen safe-top safe-bottom">
        <BrandLogo inverse />
        <div className="driver-status-card">
          <span className="status-orb"><FileCheck2 /></span>
          <p className="onboarding-eyebrow">{approved ? "Compte activé" : "Contrôles en cours"}</p>
          <h1>{approved ? "Vous êtes prêt à conduire." : "Votre dossier a bien été transmis."}</h1>
          <p>
            {approved
              ? `Le contrôle interne de complétude et de cohérence a réussi${driver.verification_score !== null ? ` avec ${driver.verification_score}/100` : ""}.`
              : `Votre score interne est de ${driver.verification_score ?? 0}/100. Une vérification complémentaire est nécessaire.`}
          </p>
          <Link className="primary-button gold" href="/driver">Accéder à mon espace <ArrowRight size={18} /></Link>
        </div>
      </section>
    );
  }

  const progress = ((step + 1) / STEP_LABELS.length) * 100;
  const adultBirthDate = latestAdultBirthDate();
  const birthDateError = personal.birthDate && !isAdult(personal.birthDate)
    ? "Vous devez avoir au moins 18 ans pour devenir chauffeur."
    : null;

  return (
    <section className="driver-wizard-v2">
      <header className="driver-wizard-bar safe-top">
        <Link href="/driver" aria-label="Retour à l’espace chauffeur"><ArrowLeft size={20} /></Link>
        <BrandLogo compact inverse />
        <span title="Brouillon enregistré"><Check size={12} /> {step + 1}/{STEP_LABELS.length}</span>
      </header>
      <div className="wizard-progress-track"><i style={{ width: `${progress}%` }} /></div>

      <div className="wizard-fixed-body">
        <div className="wizard-fixed-heading">
          <p className="onboarding-eyebrow">{STEP_LABELS[step]}</p>
          <h1>
            {step === 0 ? "Vos informations"
              : step === 1 ? "Votre permis"
                : step === 2 ? "Photographiez le permis"
                  : step === 3 ? "Votre véhicule"
                    : step === 4 ? "Contrôle du véhicule"
                      : step === 5 ? "Vérification d’identité"
                        : "Vérifiez et envoyez"}
          </h1>
          <p>
            {step === 0 ? "Les données essentielles de votre compte chauffeur."
              : step === 1 ? "L’expiration est calculée automatiquement sur 10 ans."
                : step === 2 ? "Deux photos nettes, sans reflet ni partie coupée."
                  : step === 3 ? "La classe de service sera déterminée automatiquement."
                    : step === 4 ? "Les documents doivent correspondre au véhicule déclaré."
                      : step === 5 ? "Les fichiers et les données déclarées sont contrôlés avant l’activation."
                        : "Un score interne supérieur à 98/100 active le compte ; sinon, le dossier reste à vérifier."}
          </p>
        </div>

        <div className="wizard-fixed-content">
          {driver?.onboarding_status === "rejected" && driver.rejection_reason ? (
            <div className="review-alert"><strong>Correction demandée</strong><p>{driver.rejection_reason}</p></div>
          ) : null}

          {step === 0 ? (
            <>
              <div className="field"><label>Nom et prénom</label><input value={personal.fullName} onChange={(event) => setPersonal({ ...personal, fullName: event.target.value })} autoComplete="name" /></div>
              <div className="form-grid">
                <div className="field"><label>Téléphone</label><input value={personal.phone} onChange={(event) => setPersonal({ ...personal, phone: event.target.value })} type="tel" autoComplete="tel" placeholder="+221 77 000 00 00" /></div>
                <div className="field">
                  <label>Date de naissance</label>
                  <input
                    type="date"
                    max={adultBirthDate}
                    value={personal.birthDate}
                    aria-invalid={Boolean(birthDateError)}
                    aria-describedby={birthDateError ? "birth-date-error" : undefined}
                    onChange={(event) => setPersonal({ ...personal, birthDate: event.target.value })}
                  />
                  {birthDateError ? <small className="field-error" id="birth-date-error">{birthDateError}</small> : null}
                </div>
              </div>
              <button type="button" className={`region-card ${personal.region ? "detected" : ""}`} onClick={() => void detectRegion()}>
                <span>{locating ? <LoaderCircle className="spin" /> : <MapPin />}</span>
                <div><small>Région d’activité</small><strong>{locating ? "Détection…" : personal.region || "Détecter ma région"}</strong></div>
                <Crosshair />
              </button>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="field"><label>Numéro du permis</label><input value={license.number} onChange={(event) => setLicense({ ...license, number: event.target.value.toUpperCase() })} placeholder="Ex. SN-123456" /></div>
              <div className="form-grid">
                <div className="field"><label>Obtenu le</label><input type="date" max={new Date().toISOString().slice(0, 10)} value={license.issuedAt} onChange={(event) => setLicense({ number: license.number, issuedAt: event.target.value, expiresAt: expiryAfterTenYears(event.target.value) })} /></div>
                <div className="field"><label>Expire le</label><input type="date" value={license.expiresAt} readOnly /></div>
              </div>
              <div className="automatic-check"><Sparkles /><div><strong>Calcul automatique</strong><small>Validité réglementaire de 10 ans et expérience calculée depuis l’obtention.</small></div></div>
            </>
          ) : null}

          {step === 2 ? renderDocuments(LICENSE_DOCUMENTS) : null}

          {step === 3 ? (
            <>
              <div className="vehicle-preview" style={{ color: VEHICLE_COLORS.find((item) => item.value === vehicle.color)?.hex || "var(--gold)" }}>
                <CarFront />
                <div><strong>{vehicle.brand || "Marque"} {vehicle.model}</strong><small>{vehicle.year || "Année"} · {vehicle.plate || "Immatriculation"}</small></div>
              </div>
              <div className="form-grid">
                <div className="field"><label>Marque</label><select value={vehicle.brand} onChange={(event) => setVehicle({ ...vehicle, brand: event.target.value, model: "" })}><option value="">Choisir</option>{VEHICLE_BRANDS.map((brand) => <option value={brand} key={brand}>{brand}</option>)}</select></div>
                <div className="field"><label>Modèle</label><select value={vehicle.model} disabled={!vehicle.brand} onChange={(event) => setVehicle({ ...vehicle, model: event.target.value })}><option value="">Choisir</option>{modelsForBrand(vehicle.brand).map((model) => <option value={model} key={model}>{model}</option>)}</select></div>
              </div>
              <div className="form-grid">
                <div className="field"><label>Année</label><select value={vehicle.year} onChange={(event) => setVehicle({ ...vehicle, year: event.target.value })}><option value="">Choisir</option>{VEHICLE_YEARS.map((year) => <option value={year} key={year}>{year}</option>)}</select></div>
                <div className="field"><label>Immatriculation</label><input value={vehicle.plate} onChange={(event) => setVehicle({ ...vehicle, plate: event.target.value.toUpperCase() })} placeholder="DK 0000 AA" /></div>
              </div>
              <div className="vehicle-colors compact">
                {VEHICLE_COLORS.map((color) => <button type="button" key={color.value} className={vehicle.color === color.value ? "selected" : ""} aria-label={color.value} onClick={() => setVehicle({ ...vehicle, color: color.value })}><i style={{ background: color.hex }} /><span>{color.value}</span></button>)}
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <div className="form-grid">
                <div className="field"><label>Nombre de places</label><select value={vehicle.seats} onChange={(event) => setVehicle({ ...vehicle, seats: event.target.value })}>{[2, 3, 4, 5, 6, 7, 8, 9].map((seats) => <option value={seats} key={seats}>{seats} places</option>)}</select></div>
                <div className="eligibility-mini"><small>Classes estimées</small><strong>{vehicle.year ? eligibleRideClasses(Number(vehicle.year)).map(rideClassLabel).join(" · ") : "À calculer"}</strong></div>
              </div>
              {renderDocuments(VEHICLE_DOCUMENTS)}
            </>
          ) : null}

          {step === 5 ? (
            <>
              <div className="kyc-notice"><ScanFace /><div><strong>Contrôle automatique interne</strong><small>Nous contrôlons la qualité, la présence et la cohérence technique. L’authenticité documentaire, l’OCR et la preuve de vie nécessiteront toujours un prestataire KYC certifié.</small></div></div>
              {renderDocuments(IDENTITY_DOCUMENTS)}
            </>
          ) : null}

          {step === 6 ? (
            <>
              <div className="summary-card compact">
                <SummaryLine label="Chauffeur" value={`${personal.fullName} · ${personal.phone}`} />
                <SummaryLine label="Région" value={personal.region} />
                <SummaryLine label="Permis" value={`${license.number} · valide jusqu’au ${license.expiresAt}`} />
                <SummaryLine label="Véhicule" value={`${vehicle.brand} ${vehicle.model} · ${vehicle.year} · ${vehicle.color}`} />
                <SummaryLine label="Documents" value={`${completedDocuments}/${REQUIRED_DOCUMENTS.length} photos sécurisées`} />
              </div>
              <div className="consent-note"><ShieldCheck /><p>Je certifie que ces informations sont exactes et j’autorise leur contrôle sécurisé.</p></div>
            </>
          ) : null}
        </div>

        {error ? <div className="wizard-error error" role="alert">{error}</div> : null}

        <div className="wizard-fixed-actions safe-bottom">
          {step > 0 ? <button className="secondary-button" type="button" disabled={busy || uploading !== null} onClick={goBack}>Retour</button> : null}
          <button
            className={step === 6 ? "primary-button gold" : "primary-button"}
            type="button"
            disabled={
              busy || uploading !== null
              || (step === 0 && (!personal.fullName.trim() || !personal.phone.trim() || !isAdult(personal.birthDate) || !personal.region || personal.baseLat === null || personal.baseLng === null))
              || (step === 1 && (!license.number.trim() || !license.issuedAt || !license.expiresAt))
              || (step === 2 && LICENSE_DOCUMENTS.some(({ kind }) => !documents.some((document) => document.kind === kind)))
              || (step === 3 && (!vehicle.brand || !vehicle.model || !vehicle.year || !vehicle.plate || !vehicle.color))
              || (step === 4 && VEHICLE_DOCUMENTS.some(({ kind }) => !documents.some((document) => document.kind === kind)))
              || (step === 5 && IDENTITY_DOCUMENTS.some(({ kind }) => !documents.some((document) => document.kind === kind)))
              || (step === 6 && completedDocuments < REQUIRED_DOCUMENTS.length)
            }
            onClick={() => {
              if (step === 3) void saveDetails(4);
              else if (step === 6) void submitApplication();
              else setStep((current) => Math.min(STEP_LABELS.length - 1, current + 1));
            }}
          >
            {busy ? "Vérification…" : step === 6 ? "Envoyer mon dossier" : "Continuer"} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div><small>{label}</small><strong>{value || "À compléter"}</strong></div>;
}
