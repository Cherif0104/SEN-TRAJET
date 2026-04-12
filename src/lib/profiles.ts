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
