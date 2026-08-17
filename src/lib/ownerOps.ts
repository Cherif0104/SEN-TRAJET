import { supabase } from "@/lib/supabase";

export type OwnerRecord = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  matricule: string | null;
  partner_kind: string | null;
  committed_amount_fcfa: number | null;
};

export async function getMyOwnerRecord(userId: string): Promise<OwnerRecord | null> {
  const { data, error } = await supabase
    .from("vehicle_owners")
    .select("id, full_name, company_name, phone, email, status, matricule, partner_kind, committed_amount_fcfa")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as OwnerRecord | null) ?? null;
}

export type OwnerVehicleContract = {
  id: string;
  vehicle_id: string | null;
  vehicle_label: string;
  monthly_amount_fcfa: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  terms_summary: string | null;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    plate_number: string;
    category: string;
    seats: number | null;
    status: string;
    photo_url: string | null;
  } | null;
};

export async function listMyVehicleContracts(ownerId: string): Promise<OwnerVehicleContract[]> {
  const { data, error } = await supabase
    .from("vehicle_exploitation_contracts")
    .select(
      `id, vehicle_id, vehicle_label, monthly_amount_fcfa, start_date, end_date, status, terms_summary,
       vehicle:vehicles(id, brand, model, plate_number, category, seats, status, photo_url)`
    )
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as Record<string, unknown>;
    const vehicleRaw = r.vehicle;
    const vehicle = Array.isArray(vehicleRaw) ? vehicleRaw[0] : vehicleRaw;
    return {
      id: String(r.id),
      vehicle_id: (r.vehicle_id as string | null) ?? null,
      vehicle_label: String(r.vehicle_label ?? ""),
      monthly_amount_fcfa: Number(r.monthly_amount_fcfa ?? 0),
      start_date: (r.start_date as string | null) ?? null,
      end_date: (r.end_date as string | null) ?? null,
      status: String(r.status),
      terms_summary: (r.terms_summary as string | null) ?? null,
      vehicle: vehicle ? (vehicle as OwnerVehicleContract["vehicle"]) : null,
    };
  });
}

export type OwnerVehicleMission = {
  booking_id: string;
  vehicle_id: string;
  pickup: string;
  dropoff: string;
  pickup_time: string;
  status: string;
  distance_km: number | null;
  service_type: string;
};

/** Utilisation opérationnelle du véhicule — jamais de client, téléphone ou prix commercial. */
export async function listOwnerVehicleMissions(vehicleId?: string): Promise<OwnerVehicleMission[]> {
  const { data, error } = await supabase.rpc("list_owner_vehicle_missions", { _vehicle_id: vehicleId ?? null });
  if (error) throw error;
  return (data ?? []) as OwnerVehicleMission[];
}
