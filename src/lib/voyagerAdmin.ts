import { supabase } from "@/lib/supabase";

export type VoyagerOperatorAdmin = {
  id: string;
  display_name: string;
  legal_name: string;
  operator_kind: string;
  status: string;
  contact_phone: string;
};

export type VoyagerLineAdmin = {
  id: string;
  operator_id: string;
  origin_city: string;
  destination_city: string;
  boarding_point: string;
  arrival_point: string;
  is_active: boolean;
  operator?: { display_name: string } | null;
};

export async function listVoyagerOperatorsAdmin(): Promise<VoyagerOperatorAdmin[]> {
  const { data, error } = await supabase
    .from("voyager_operators")
    .select("id, display_name, legal_name, operator_kind, status, contact_phone")
    .order("display_name");
  if (error) throw error;
  return (data ?? []) as VoyagerOperatorAdmin[];
}

export async function createVoyagerOperator(input: {
  displayName: string;
  legalName: string;
  kind: string;
  phone: string;
}): Promise<void> {
  const { error } = await supabase.from("voyager_operators").insert({
    display_name: input.displayName.trim(),
    legal_name: input.legalName.trim(),
    operator_kind: input.kind,
    contact_phone: input.phone.trim(),
    status: "actif",
  });
  if (error) throw error;
}

export async function listVoyagerLinesAdmin(): Promise<VoyagerLineAdmin[]> {
  const { data, error } = await supabase
    .from("voyager_lines")
    .select(
      "id, operator_id, origin_city, destination_city, boarding_point, arrival_point, is_active, operator:voyager_operators(display_name)",
    )
    .order("origin_city");
  if (error) throw error;
  return (data ?? []) as unknown as VoyagerLineAdmin[];
}

export async function createVoyagerLine(input: {
  operatorId: string;
  originCity: string;
  destinationCity: string;
  boardingPoint: string;
  arrivalPoint: string;
}): Promise<void> {
  const { error } = await supabase.from("voyager_lines").insert({
    operator_id: input.operatorId,
    origin_city: input.originCity.trim(),
    destination_city: input.destinationCity.trim(),
    boarding_point: input.boardingPoint.trim(),
    arrival_point: input.arrivalPoint.trim(),
  });
  if (error) throw error;
}

export async function createVoyagerDeparture(input: {
  lineId: string;
  departureAt: string;
  vehicleType: string;
  vehicleLabel?: string;
  seats: number;
  priceFcfa: number;
}): Promise<void> {
  const { error } = await supabase.from("voyager_departures").insert({
    line_id: input.lineId,
    departure_at: new Date(input.departureAt).toISOString(),
    vehicle_type: input.vehicleType,
    vehicle_label: input.vehicleLabel?.trim() || null,
    seats_total: input.seats,
    seats_available: input.seats,
    price_per_seat_fcfa: input.priceFcfa,
    status: "publie",
  });
  if (error) throw error;
}
