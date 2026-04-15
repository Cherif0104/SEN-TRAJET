import { supabase } from "@/lib/supabase";

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
};

export async function addVehicle(driverId: string, vehicle: VehicleInsert) {
  const { data, error } = await supabase
    .from("vehicles")
    .insert({ ...vehicle, driver_id: driverId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export type VehicleUpdate = Partial<VehicleInsert>;

export async function updateVehicle(
  driverId: string,
  vehicleId: string,
  updates: VehicleUpdate
) {
  const { data, error } = await supabase
    .from("vehicles")
    .update(updates)
    .eq("id", vehicleId)
    .eq("driver_id", driverId)
    .select()
    .single();
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

export async function uploadDocument(
  driverId: string,
  docType: "permis" | "carte_grise" | "assurance" | "photo_identite",
  fileUrl: string
) {
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

/** Supprime un document chauffeur (l’utilisateur peut ensuite en téléverser un nouveau). */
export async function deleteDocument(
  driverId: string,
  docType: "permis" | "carte_grise" | "assurance" | "photo_identite"
): Promise<void> {
  const { error } = await supabase
    .from("driver_documents")
    .delete()
    .eq("driver_id", driverId)
    .eq("doc_type", docType);
  if (error) throw error;
}

export async function getDriverNotificationPreferences(driverId: string): Promise<DriverNotificationPreferences | null> {
  const { data, error } = await supabase
    .from("driver_notification_preferences")
    .select("*")
    .eq("driver_id", driverId)
    .maybeSingle();
  if (error && !String(error.message).includes("does not exist")) throw error;
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
  if (error && !String(error.message).includes("does not exist")) throw error;
  return (data as DriverNotificationPreferences | null) ?? null;
}
