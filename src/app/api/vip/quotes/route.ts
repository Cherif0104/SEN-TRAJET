import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type QuoteBody = {
  requesterType?: "particulier" | "conciergerie" | "hotel" | "entreprise" | "evenement";
  organizationName?: string;
  contactPhone?: string;
  pickupLocation?: string;
  startsAt?: string;
  endsAt?: string;
  passengers?: number;
  vehiclePreference?: "optimal" | "minivans" | "bus" | "mixte";
  eventType?: string;
  notes?: string;
};

function externallyRequired(remainingPassengers: number, preference: string) {
  if (remainingPassengers <= 0) return { type: "none", units: 0, nominalSeats: 0 };
  if (preference === "minivans") {
    return { type: "minivan_10_places", units: Math.ceil(remainingPassengers / 10), nominalSeats: 10 };
  }
  if (preference === "bus") {
    return { type: "bus_50_places", units: Math.ceil(remainingPassengers / 50), nominalSeats: 50 };
  }
  if (preference === "mixte" && remainingPassengers > 50) {
    const buses = Math.floor(remainingPassengers / 50);
    const vans = Math.ceil((remainingPassengers - buses * 50) / 10);
    return { type: "mixte", units: buses + vans, buses, minivans: vans, nominalSeats: null };
  }
  return remainingPassengers >= 30
    ? { type: "bus_50_places", units: Math.ceil(remainingPassengers / 50), nominalSeats: 50 }
    : { type: "minivan_10_places", units: Math.ceil(remainingPassengers / 10), nominalSeats: 10 };
}

export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as QuoteBody;
  const passengers = Math.max(1, Number(body.passengers) || 0);
  const startsAt = new Date(body.startsAt ?? "");
  const endsAt = new Date(body.endsAt ?? "");
  const phone = String(body.contactPhone ?? "").trim();
  if (
    !body.pickupLocation?.trim() ||
    !Number.isFinite(startsAt.getTime()) ||
    !Number.isFinite(endsAt.getTime()) ||
    endsAt <= startsAt ||
    passengers > 5000 ||
    phone.replace(/\D/g, "").length < 9
  ) {
    return NextResponse.json({ error: "Complétez correctement le lieu, les dates, le groupe et le contact." }, { status: 400 });
  }
  if (startsAt.getTime() < Date.now() + 60 * 60_000) {
    return NextResponse.json({ error: "La prestation doit commencer dans plus d’une heure." }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
    } = await admin.auth.getUser(bearer);
    if (!user) return NextResponse.json({ error: "Votre session a expiré." }, { status: 401 });

    const [{ data: client }, { data: ownedRows, error: fleetError }] = await Promise.all([
      admin.from("clients").select("id").eq("user_id", user.id).maybeSingle(),
      admin
        .from("vip_vehicle_offers")
        .select("vehicle_id, vehicle:vehicles!inner(id, brand, model, seats, fleet_source, status)")
        .eq("status", "active")
        .eq("vehicle.fleet_source", "owned"),
    ]);
    if (fleetError) throw fleetError;

    const ownedFleet = (ownedRows ?? [])
      .map((row) => {
        const vehicle = (Array.isArray(row.vehicle) ? row.vehicle[0] : row.vehicle) as Record<string, unknown> | null;
        return vehicle && ["available", "in_service"].includes(String(vehicle.status))
          ? {
              vehicleId: String(vehicle.id),
              label: `${String(vehicle.brand)} ${String(vehicle.model)}`,
              seats: Number(vehicle.seats ?? 0),
            }
          : null;
      })
      .filter((vehicle): vehicle is { vehicleId: string; label: string; seats: number } => Boolean(vehicle))
      .sort((a, b) => b.seats - a.seats);
    const ownSeats = ownedFleet.reduce((total, vehicle) => total + vehicle.seats, 0);
    const remainingPassengers = Math.max(0, passengers - ownSeats);
    const preference = body.vehiclePreference ?? "optimal";
    const durationHours = Math.ceil((endsAt.getTime() - startsAt.getTime()) / 3_600_000);
    const recommendation = {
      passengers,
      durationHours,
      ownedFleet,
      ownedVehiclesCount: ownedFleet.length,
      ownedSeatsAvailable: ownSeats,
      additionalPassengersToCover: remainingPassengers,
      externalPlan: externallyRequired(remainingPassengers, preference),
      generatedAt: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from("vip_quote_requests")
      .insert({
        requester_profile_id: user.id,
        client_id: client?.id ?? null,
        requester_type: body.requesterType ?? "particulier",
        organization_name: body.organizationName?.trim() || null,
        contact_phone: phone,
        pickup_location: body.pickupLocation.trim(),
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        passengers,
        vehicle_preference: preference,
        event_type: body.eventType?.trim() || null,
        fleet_recommendation: recommendation,
        notes: body.notes?.trim() || null,
      })
      .select("id, reference, status")
      .single();
    if (error) throw error;

    return NextResponse.json({ quote: data, recommendation }, { status: 201 });
  } catch (error) {
    console.error("[vip-special-quote]", error);
    return NextResponse.json({ error: "La demande de devis n’a pas pu être enregistrée." }, { status: 503 });
  }
}
