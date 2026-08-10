import { supabase } from "@/lib/supabase";

export type AssignmentStatus =
  | "pending"
  | "assigned"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled";

export type TripAssignment = {
  id: string;
  booking_id: string | null;
  trip_id: string | null;
  driver_id: string;
  vehicle_id: string | null;
  assigned_by: string | null;
  status: AssignmentStatus;
  notes: string | null;
  assigned_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  driver?: { full_name: string | null; phone: string | null } | null;
  booking?: {
    id: string;
    status: string;
    total_fcfa: number;
    passengers: number;
    client_id: string;
  } | null;
  trip?: {
    id: string;
    from_city: string;
    to_city: string;
    departure_time: string;
    price_fcfa: number;
  } | null;
};

export async function listAssignments(options?: {
  status?: AssignmentStatus;
  driverId?: string;
  limit?: number;
}): Promise<TripAssignment[]> {
  let q = supabase
    .from("trip_assignments")
    .select(
      "*, driver:profiles!driver_id(full_name, phone), booking:bookings(id, status, total_fcfa, passengers, client_id), trip:trips(id, from_city, to_city, departure_time, price_fcfa)"
    )
    .order("assigned_at", { ascending: false });

  if (options?.status) q = q.eq("status", options.status);
  if (options?.driverId) q = q.eq("driver_id", options.driverId);
  if (options?.limit) q = q.limit(options.limit);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TripAssignment[];
}

export async function assignDriverToBooking(params: {
  bookingId: string;
  driverId: string;
  vehicleId?: string | null;
  assignedBy: string;
  tripId?: string | null;
  notes?: string | null;
}): Promise<TripAssignment> {
  const { data, error } = await supabase
    .from("trip_assignments")
    .insert({
      booking_id: params.bookingId,
      trip_id: params.tripId ?? null,
      driver_id: params.driverId,
      vehicle_id: params.vehicleId ?? null,
      assigned_by: params.assignedBy,
      status: "assigned",
      notes: params.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  // Aligner le chauffeur sur la réservation (flotte propriétaire)
  await supabase
    .from("bookings")
    .update({ driver_id: params.driverId, status: "confirmed" })
    .eq("id", params.bookingId);

  return data as TripAssignment;
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: AssignmentStatus
): Promise<TripAssignment> {
  const patch: Record<string, unknown> = { status };
  const now = new Date().toISOString();
  if (status === "accepted") patch.accepted_at = now;
  if (status === "in_progress") patch.started_at = now;
  if (status === "completed") patch.completed_at = now;

  const { data, error } = await supabase
    .from("trip_assignments")
    .update(patch)
    .eq("id", assignmentId)
    .select()
    .single();
  if (error) throw error;
  return data as TripAssignment;
}

/** Chauffeurs flotte (ou tous les chauffeurs si employment_type absent / non migré). */
export async function listFleetDrivers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, city, employment_type, created_at")
    .eq("role", "driver")
    .order("full_name", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  const fleet = rows.filter(
    (d) => !d.employment_type || d.employment_type === "platform_fleet"
  );
  // Transition: si aucun chauffeur encore taggé flotte, exposer tous les chauffeurs
  return fleet.length > 0 ? fleet : rows;
}
