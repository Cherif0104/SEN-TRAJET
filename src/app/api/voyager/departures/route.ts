import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function relation(value: unknown): Row | null {
  if (!value) return null;
  return (Array.isArray(value) ? value[0] : value) as Row | null;
}

async function authenticatedUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const {
    data: { user },
  } = await getSupabaseAdmin().auth.getUser(token);
  return user ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

    const admin = getSupabaseAdmin();
    await admin.rpc("expire_voyager_bookings");
    const origin = request.nextUrl.searchParams.get("origin")?.trim();
    const destination = request.nextUrl.searchParams.get("destination")?.trim();
    const date = request.nextUrl.searchParams.get("date")?.trim();

    let query = admin
      .from("voyager_departures")
      .select(
        `id, departure_at, vehicle_type, vehicle_label, seats_total,
         seats_available, price_per_seat_fcfa, notes,
         line:voyager_lines!inner(
           id, origin_city, destination_city, region_label,
           boarding_point, arrival_point, is_active,
           operator:voyager_operators!inner(id, display_name, operator_kind, status)
         )`
      )
      .in("status", ["publie", "complet"])
      .gt("departure_at", new Date().toISOString())
      .gt("seats_available", 0)
      .eq("line.is_active", true)
      .eq("line.operator.status", "actif")
      .order("departure_at", { ascending: true })
      .limit(100);
    if (origin) query = query.ilike("line.origin_city", `%${origin}%`);
    if (destination) query = query.ilike("line.destination_city", `%${destination}%`);
    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      if (Number.isFinite(start.getTime())) {
        query = query
          .gte("departure_at", start.toISOString())
          .lt("departure_at", end.toISOString());
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    const departures = (data ?? []).flatMap((raw) => {
      const row = raw as Row;
      const line = relation(row.line);
      const operator = relation(line?.operator);
      if (!line || !operator) return [];
      return [{
        id: String(row.id),
        departureAt: String(row.departure_at),
        vehicleType: String(row.vehicle_type),
        vehicleLabel: row.vehicle_label ? String(row.vehicle_label) : null,
        seatsTotal: Number(row.seats_total),
        seatsAvailable: Number(row.seats_available),
        pricePerSeatFcfa: Number(row.price_per_seat_fcfa),
        notes: row.notes ? String(row.notes) : null,
        line: {
          id: String(line.id),
          originCity: String(line.origin_city),
          destinationCity: String(line.destination_city),
          regionLabel: line.region_label ? String(line.region_label) : null,
          boardingPoint: String(line.boarding_point),
          arrivalPoint: String(line.arrival_point),
          operator: {
            id: String(operator.id),
            displayName: String(operator.display_name),
            operatorKind: String(operator.operator_kind),
          },
        },
      }];
    });
    return NextResponse.json({ departures });
  } catch (error) {
    console.error("[voyager-departures]", error);
    return NextResponse.json({ error: "Impossible de charger les départs." }, { status: 503 });
  }
}
