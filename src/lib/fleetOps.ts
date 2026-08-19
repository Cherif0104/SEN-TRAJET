import { supabase } from "@/lib/supabase";

export type FleetMaintenanceRecord = {
  id: string;
  vehicle_id: string;
  maintenance_type: string;
  title: string;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  cost_fcfa: number | null;
  next_due_at: string | null;
  vehicle: { brand: string; model: string; plate_number: string } | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/** Vue transversale de l'entretien flotte — absente jusqu'ici (maintenance visible uniquement véhicule par véhicule). */
export async function listAllMaintenanceRecords(): Promise<FleetMaintenanceRecord[]> {
  const { data, error } = await supabase
    .from("vehicle_maintenance_records")
    .select(
      `id, vehicle_id, maintenance_type, title, status, scheduled_at, completed_at, cost_fcfa, next_due_at,
       vehicle:vehicles(brand, model, plate_number)`
    )
    .order("scheduled_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      vehicle_id: String(r.vehicle_id),
      maintenance_type: String(r.maintenance_type),
      title: String(r.title),
      status: String(r.status),
      scheduled_at: (r.scheduled_at as string | null) ?? null,
      completed_at: (r.completed_at as string | null) ?? null,
      cost_fcfa: r.cost_fcfa == null ? null : Number(r.cost_fcfa),
      next_due_at: (r.next_due_at as string | null) ?? null,
      vehicle: firstRelation(r.vehicle as FleetMaintenanceRecord["vehicle"] | FleetMaintenanceRecord["vehicle"][] | null),
    };
  });
}

export type FleetOwner = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  status: string;
  matricule: string | null;
  partner_kind: string | null;
};

export async function listAllOwners(): Promise<FleetOwner[]> {
  const { data, error } = await supabase
    .from("vehicle_owners")
    .select("id, full_name, company_name, phone, status, matricule, partner_kind")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FleetOwner[];
}

export type ExpiringVehicleDocument = {
  id: string;
  name: string;
  document_type: string;
  expires_at: string;
  vehicle_id: string;
  vehicle_label: string;
};

/** Documents véhicules expirant sous 30 jours — jointure manuelle (entity_documents est polymorphe). */
export async function listExpiringVehicleDocuments(withinDays = 30): Promise<ExpiringVehicleDocument[]> {
  const limitDate = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000).toISOString();
  const { data: docs, error } = await supabase
    .from("entity_documents")
    .select("id, name, document_type, expires_at, entity_id")
    .eq("entity_type", "vehicle")
    .not("expires_at", "is", null)
    .lte("expires_at", limitDate)
    .order("expires_at", { ascending: true });
  if (error) throw error;
  const rows = docs ?? [];
  if (!rows.length) return [];

  const vehicleIds = [...new Set(rows.map((d) => String((d as { entity_id: string }).entity_id)))];
  const { data: vehicles } = await supabase.from("vehicles").select("id, brand, model, plate_number").in("id", vehicleIds);
  const vehicleById = new Map((vehicles ?? []).map((v) => [v.id, v]));

  return rows.map((d) => {
    const row = d as { id: string; name: string; document_type: string; expires_at: string; entity_id: string };
    const vehicle = vehicleById.get(row.entity_id) as { brand: string; model: string; plate_number: string } | undefined;
    return {
      id: row.id,
      name: row.name,
      document_type: row.document_type,
      expires_at: row.expires_at,
      vehicle_id: row.entity_id,
      vehicle_label: vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.plate_number}` : "Véhicule",
    };
  });
}
