import { supabase } from "@/lib/supabase";

const REQUIRED_DRIVER_DOCS = ["permis", "carte_grise", "assurance", "photo_identite"] as const;

type ReadinessStepKey = "profile" | "vehicle" | "documents";

export type DriverReadinessStep = {
  key: ReadinessStepKey;
  label: string;
  done: boolean;
  hint?: string;
};

export type DriverPublishingReadiness = {
  ready: boolean;
  completion: number;
  defaultRegion: string | null;
  steps: DriverReadinessStep[];
};

export async function getDriverPublishingReadiness(driverId: string): Promise<DriverPublishingReadiness> {
  const [{ data: profile }, { data: vehicles }, { data: documents }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, city")
      .eq("id", driverId)
      .maybeSingle(),
    supabase
      .from("vehicles")
      .select("brand, model, year, plate_number, seats")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false }),
    supabase
      .from("driver_documents")
      .select("doc_type, file_url")
      .eq("driver_id", driverId),
  ]);

  const hasProfile =
    Boolean(profile?.full_name?.trim()) &&
    Boolean(profile?.phone?.trim()) &&
    Boolean(profile?.city?.trim());

  const hasVehicle = (vehicles ?? []).some((vehicle) => {
    const seats = Number(vehicle.seats ?? 0);
    const year = Number(vehicle.year ?? 0);
    return (
      Boolean(vehicle.brand?.trim()) &&
      Boolean(vehicle.model?.trim()) &&
      Boolean(vehicle.plate_number?.trim()) &&
      seats >= 1 &&
      year >= 1990
    );
  });

  const uploadedDocTypes = new Set(
    (documents ?? [])
      .filter((doc) => Boolean(doc.file_url?.trim()))
      .map((doc) => String(doc.doc_type))
  );
  const hasAllRequiredDocs = REQUIRED_DRIVER_DOCS.every((docType) => uploadedDocTypes.has(docType));

  const steps: DriverReadinessStep[] = [
    {
      key: "profile",
      label: "Profil chauffeur complet (nom, téléphone, région)",
      done: hasProfile,
      hint: hasProfile ? undefined : "Complétez vos informations de contact dans Mon profil.",
    },
    {
      key: "vehicle",
      label: "Véhicule renseigné (marque, modèle, année, plaque, places)",
      done: hasVehicle,
      hint: hasVehicle ? undefined : "Ajoutez au moins un véhicule conforme.",
    },
    {
      key: "documents",
      label: "Documents obligatoires téléversés",
      done: hasAllRequiredDocs,
      hint: hasAllRequiredDocs ? undefined : "Ajoutez permis, carte grise, assurance et photo d'identité.",
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  return {
    ready: completed === steps.length,
    completion: completed / steps.length,
    defaultRegion: profile?.city?.trim() || null,
    steps,
  };
}

