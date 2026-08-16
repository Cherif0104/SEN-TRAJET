import { supabase } from "@/lib/supabase";
import { listBusinessRules, ruleNumber } from "@/lib/engines/businessRules";

export type ConflictCheck = {
  vehicleId: string;
  hasConflict: boolean;
  conflictingBookingIds: string[];
  bufferMinutes: number;
};

/**
 * Vérifie qu'un véhicule n'a pas déjà une mission dans la fenêtre
 * [pickup - buffer, pickup + buffer] (défaut 90 min).
 */
export async function checkVehicleConflict(params: {
  vehicleId: string;
  pickupAt: Date;
  excludeBookingId?: string;
}): Promise<ConflictCheck> {
  const rules = await listBusinessRules("dispatch");
  const bufferMinutes = ruleNumber(rules, "dispatch", "conflict_buffer_minutes", 90);
  const start = new Date(params.pickupAt.getTime() - bufferMinutes * 60_000).toISOString();
  const end = new Date(params.pickupAt.getTime() + bufferMinutes * 60_000).toISOString();

  const { data: assignments, error } = await supabase
    .from("dispatch_assignments")
    .select(
      `id, vehicle_id, service_order:service_orders(
        id, booking_id,
        booking:bookings(id, pickup_time, status)
      )`
    )
    .eq("vehicle_id", params.vehicleId);

  if (error) {
    return {
      vehicleId: params.vehicleId,
      hasConflict: false,
      conflictingBookingIds: [],
      bufferMinutes,
    };
  }

  const conflictingBookingIds: string[] = [];
  for (const row of assignments ?? []) {
    const order = Array.isArray(row.service_order) ? row.service_order[0] : row.service_order;
    const booking = order?.booking
      ? Array.isArray(order.booking)
        ? order.booking[0]
        : order.booking
      : null;
    if (!booking?.pickup_time) continue;
    if (params.excludeBookingId && booking.id === params.excludeBookingId) continue;
    if (["annulee_client", "annulee_sentrajet", "terminee", "remboursee"].includes(String(booking.status))) {
      continue;
    }
    const t = new Date(booking.pickup_time).getTime();
    if (t >= new Date(start).getTime() && t <= new Date(end).getTime()) {
      conflictingBookingIds.push(String(booking.id));
    }
  }

  return {
    vehicleId: params.vehicleId,
    hasConflict: conflictingBookingIds.length > 0,
    conflictingBookingIds,
    bufferMinutes,
  };
}

export async function listAvailableVehiclesForSlot(pickupAt: Date) {
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, brand, model, plate_number, seats, status, category")
    .in("status", ["available", "Disponible"]);

  const rows = vehicles ?? [];
  const results = await Promise.all(
    rows.map(async (v) => {
      const conflict = await checkVehicleConflict({ vehicleId: v.id, pickupAt });
      return { ...v, conflict };
    })
  );
  return results.filter((v) => !v.conflict.hasConflict);
}
