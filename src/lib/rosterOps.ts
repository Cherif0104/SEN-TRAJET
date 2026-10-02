import { supabase } from "@/lib/supabase";

export type DriverShiftStatus = "travail" | "repos";

export type DriverShift = {
  id: string;
  driver_id: string;
  shift_date: string;
  status: DriverShiftStatus;
  note: string | null;
  driver?: { id: string; full_name: string; status: string } | null;
};

export async function listDriverShifts(startDate: string, endDate: string): Promise<DriverShift[]> {
  const { data, error } = await supabase
    .from("driver_shifts")
    .select("id, driver_id, shift_date, status, note, driver:drivers(id, full_name, status)")
    .gte("shift_date", startDate)
    .lte("shift_date", endDate)
    .order("shift_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    driver: Array.isArray(row.driver) ? row.driver[0] ?? null : row.driver,
  })) as DriverShift[];
}

export async function generateRoster(startDate: string, weeks: number): Promise<number> {
  const { data, error } = await supabase.rpc("generate_driver_roster", {
    p_start_date: startDate,
    p_weeks: weeks,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function setDriverShiftStatus(params: {
  driverId: string;
  shiftDate: string;
  status: DriverShiftStatus;
  note?: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from("driver_shifts")
    .upsert(
      {
        driver_id: params.driverId,
        shift_date: params.shiftDate,
        status: params.status,
        note: params.note ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "driver_id,shift_date" }
    );
  if (error) throw error;
}

export type AutoDispatchResult = {
  ok: boolean;
  reason?: string;
  driver_id?: string;
  vehicle_id?: string;
  min_seats?: number;
};

export async function triggerAutoDispatch(bookingId: string): Promise<AutoDispatchResult> {
  const { data, error } = await supabase.rpc("auto_dispatch_booking", { p_booking_id: bookingId });
  if (error) throw error;
  return data as AutoDispatchResult;
}
