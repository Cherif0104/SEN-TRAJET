import { supabase } from "@/lib/supabase";
import type { Partner } from "@/lib/partners";

export type AdminProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  role: string;
  employment_type?: string | null;
  created_at: string;
};

export async function listProfilesByRole(
  role: string,
  limit = 100
): Promise<AdminProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, city, role, employment_type, created_at")
    .eq("role", role)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AdminProfileRow[];
}

export async function listPartnersAdmin(limit = 100): Promise<Partner[]> {
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Partner[];
}

export async function getAdminOpsCounts() {
  const [drivers, clients, partners, bookings] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "driver"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "client"),
    supabase.from("partners").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
  ]);

  return {
    drivers: drivers.count ?? 0,
    clients: clients.count ?? 0,
    partners: partners.count ?? 0,
    bookings: bookings.count ?? 0,
    errors: [drivers.error, clients.error, partners.error, bookings.error]
      .filter(Boolean)
      .map((e) => e!.message),
  };
}

export async function listRecentBookingsForDispatch(limit = 40) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, status, total_fcfa, passengers, client_id, driver_id, trip_id, partner_id, billed_price_fcfa, created_at, trip:trips(id, from_city, to_city, departure_time, price_fcfa)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
