import { supabase } from "@/lib/supabase";
import { isMissingSchemaObjectError } from "@/lib/postgrestErrors";

export type ProfileUpdate = {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  city?: string;
  role?:
    | "client"
    | "driver"
    | "partner"
    | "admin"
    | "super_admin"
    | "commercial"
    | "trainer"
    | "regional_manager"
    | "partner_manager"
    | "partner_operator"
    | "rental_owner";
  partner_id?: string | null;
};

export type DriverNotificationPreferences = {
  driver_id: string;
  notify_new_requests: boolean;
  notify_matching_trips: boolean;
  max_notifications_per_day: number;
  digest_enabled: boolean;
  updated_at?: string;
};

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: ProfileUpdate) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDriverVehicles(driverId: string) {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type VehicleInsert = {
  brand: string;
  model: string;
  year?: number;
  plate_number: string;
  category?: "standard" | "confort" | "premium" | "utilitaire";
  seats?: number;
  air_conditioning?: boolean;
  /** Taxonomie transport (enum Postgres `transport_vehicle_category`) */
  transport_vehicle_category?: string;
  /** Classe de service affichée client (enum Postgres `service_class_level`) */
  service_class?: string;
  /** Galerie par emplacement : clé → liste d’URLs */
  vehicle_photo_urls?: Record<string, string[]>;
};

function legacyVehiclePayload(driverId: string, vehicle: VehicleInsert) {
  return {
    driver_id: driverId,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    plate_number: vehicle.plate_number,
    category: vehicle.category,
    seats: vehicle.seats,
    air_conditioning: vehicle.air_conditioning,
  };
}

export async function addVehicle(driverId: string, vehicle: VehicleInsert) {
  const full = { ...vehicle, driver_id: driverId };
  let { data, error } = await supabase.from("vehicles").insert(full).select().single();
  if (error && isMissingSchemaObjectError(error)) {
    const r = await supabase
      .from("vehicles")
      .insert(legacyVehiclePayload(driverId, vehicle))
      .select()
      .single();
    data = r.data;
    error = r.error;
  }
  if (error) throw error;
  return data;
}

export type VehicleUpdate = Partial<VehicleInsert>;

export async function updateVehicle(
  driverId: string,
  vehicleId: string,
  updates: VehicleUpdate
) {
  let { data, error } = await supabase
    .from("vehicles")
    .update(updates)
    .eq("id", vehicleId)
    .eq("driver_id", driverId)
    .select()
    .single();
  if (error && isMissingSchemaObjectError(error)) {
    const { transport_vehicle_category: _t, service_class: _s, vehicle_photo_urls: _p, ...rest } =
      updates as VehicleUpdate & Record<string, unknown>;
    const r = await supabase
      .from("vehicles")
      .update(rest)
      .eq("id", vehicleId)
      .eq("driver_id", driverId)
      .select()
      .single();
    data = r.data;
    error = r.error;
  }
  if (error) throw error;
  return data;
}

export async function deleteVehicle(driverId: string, vehicleId: string): Promise<void> {
  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", vehicleId)
    .eq("driver_id", driverId);
  if (error) throw error;
}

export async function getDriverDocuments(driverId: string) {
  const { data, error } = await supabase
    .from("driver_documents")
    .select("*")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type DriverDocumentFileRow = {
  id: string;
  driver_id: string;
  doc_type: string;
  file_url: string;
  created_at: string;
};

export async function getDriverDocumentFiles(driverId: string): Promise<DriverDocumentFileRow[]> {
  const { data, error } = await supabase
    .from("driver_document_files")
    .select("id, driver_id, doc_type, file_url, created_at")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: true });
  if (error) {
    if (String(error.message || "").includes("does not exist")) return [];
    if (isMissingSchemaObjectError(error)) return [];
    throw error;
  }
  return (data as DriverDocumentFileRow[]) ?? [];
}

/** Ajoute une pièce (photo/PDF) et met à jour l’entrée agrégée pour le statut. */
export async function addDriverDocumentFile(
  driverId: string,
  docType: "permis" | "carte_grise" | "assurance" | "photo_identite",
  fileUrl: string
) {
  const { error: ins } = await supabase.from("driver_document_files").insert({
    driver_id: driverId,
    doc_type: docType,
    file_url: fileUrl,
  });
  if (ins) {
    if (isMissingSchemaObjectError(ins)) {
      const { data, error } = await supabase
        .from("driver_documents")
        .upsert(
          { driver_id: driverId, doc_type: docType, file_url: fileUrl, status: "pending" },
          { onConflict: "driver_id,doc_type" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    throw ins;
  }
  const { data, error } = await supabase
    .from("driver_documents")
    .upsert(
      { driver_id: driverId, doc_type: docType, file_url: fileUrl, status: "pending" },
      { onConflict: "driver_id,doc_type" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDriverDocumentFile(
  driverId: string,
  fileId: string
): Promise<void> {
  const { data: row, error: selErr } = await supabase
    .from("driver_document_files")
    .select("doc_type")
    .eq("id", fileId)
    .eq("driver_id", driverId)
    .maybeSingle();
  if (selErr) {
    if (isMissingSchemaObjectError(selErr)) return;
    throw selErr;
  }
  if (!row?.doc_type) return;

  const { error: del } = await supabase
    .from("driver_document_files")
    .delete()
    .eq("id", fileId)
    .eq("driver_id", driverId);
  if (del && !isMissingSchemaObjectError(del)) throw del;

  const { data: remaining, error: listErr } = await supabase
    .from("driver_document_files")
    .select("file_url, created_at")
    .eq("driver_id", driverId)
    .eq("doc_type", row.doc_type)
    .order("created_at", { ascending: false });
  if (listErr) {
    if (isMissingSchemaObjectError(listErr)) return;
    throw listErr;
  }
  const latest = remaining?.[0]?.file_url as string | undefined;
  if (latest) {
    const { error: up } = await supabase
      .from("driver_documents")
      .upsert(
        { driver_id: driverId, doc_type: row.doc_type, file_url: latest, status: "pending" },
        { onConflict: "driver_id,doc_type" }
      );
    if (up) throw up;
  } else {
    const { error: rm } = await supabase
      .from("driver_documents")
      .delete()
      .eq("driver_id", driverId)
      .eq("doc_type", row.doc_type);
    if (rm) throw rm;
  }
}

export async function uploadDocument(
  driverId: string,
  docType: "permis" | "carte_grise" | "assurance" | "photo_identite",
  fileUrl: string
) {
  return addDriverDocumentFile(driverId, docType, fileUrl);
}

/** Supprime toutes les pièces d’un type + la ligne de statut. */
export async function deleteDocument(
  driverId: string,
  docType: "permis" | "carte_grise" | "assurance" | "photo_identite"
): Promise<void> {
  const { error: f } = await supabase
    .from("driver_document_files")
    .delete()
    .eq("driver_id", driverId)
    .eq("doc_type", docType);
  if (f && !isMissingSchemaObjectError(f)) throw f;
  const { error } = await supabase
    .from("driver_documents")
    .delete()
    .eq("driver_id", driverId)
    .eq("doc_type", docType);
  if (error) throw error;
}

export async function appendVehiclePhoto(
  driverId: string,
  vehicleId: string,
  slotKey: string,
  publicUrl: string
): Promise<void> {
  const { data: row, error } = await supabase
    .from("vehicles")
    .select("vehicle_photo_urls")
    .eq("id", vehicleId)
    .eq("driver_id", driverId)
    .single();
  if (error) {
    if (isMissingSchemaObjectError(error)) return;
    throw error;
  }
  const cur = (row?.vehicle_photo_urls as Record<string, string[]> | null) || {};
  const next = { ...cur, [slotKey]: [...(cur[slotKey] || []), publicUrl] };
  const { error: u } = await supabase
    .from("vehicles")
    .update({ vehicle_photo_urls: next })
    .eq("id", vehicleId)
    .eq("driver_id", driverId);
  if (u && !isMissingSchemaObjectError(u)) throw u;
}

export async function removeVehiclePhotoAt(
  driverId: string,
  vehicleId: string,
  slotKey: string,
  index: number
): Promise<void> {
  const { data: row, error } = await supabase
    .from("vehicles")
    .select("vehicle_photo_urls")
    .eq("id", vehicleId)
    .eq("driver_id", driverId)
    .single();
  if (error) {
    if (isMissingSchemaObjectError(error)) return;
    throw error;
  }
  const cur = (row?.vehicle_photo_urls as Record<string, string[]> | null) || {};
  const arr = [...(cur[slotKey] || [])];
  if (index < 0 || index >= arr.length) return;
  arr.splice(index, 1);
  const next = { ...cur };
  if (arr.length) next[slotKey] = arr;
  else delete next[slotKey];
  const { error: u } = await supabase
    .from("vehicles")
    .update({ vehicle_photo_urls: next })
    .eq("id", vehicleId)
    .eq("driver_id", driverId);
  if (u && !isMissingSchemaObjectError(u)) throw u;
}

export async function getDriverNotificationPreferences(driverId: string): Promise<DriverNotificationPreferences | null> {
  const { data, error } = await supabase
    .from("driver_notification_preferences")
    .select("*")
    .eq("driver_id", driverId)
    .maybeSingle();
  if (error && !String(error.message).includes("does not exist") && !isMissingSchemaObjectError(error))
    throw error;
  return (data as DriverNotificationPreferences | null) ?? null;
}

export async function upsertDriverNotificationPreferences(
  prefs: DriverNotificationPreferences
): Promise<DriverNotificationPreferences | null> {
  const { data, error } = await supabase
    .from("driver_notification_preferences")
    .upsert(prefs, { onConflict: "driver_id" })
    .select("*")
    .maybeSingle();
  if (error && !String(error.message).includes("does not exist") && !isMissingSchemaObjectError(error))
    throw error;
  return (data as DriverNotificationPreferences | null) ?? null;
}
