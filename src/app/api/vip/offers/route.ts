import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { VipVehicleOffer } from "@/lib/vipService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function photoList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function GET(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const pickupTime = request.nextUrl.searchParams.get("pickupTime") ?? "";
  const durationHours = Number(request.nextUrl.searchParams.get("durationHours"));
  const passengers = Math.max(1, Number(request.nextUrl.searchParams.get("passengers")) || 1);
  const start = new Date(pickupTime);
  if (!bearer) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  if (!Number.isFinite(start.getTime()) || ![4, 8, 12].includes(durationHours)) {
    return NextResponse.json({ error: "Date ou durée invalide." }, { status: 400 });
  }
  if (start.getTime() < Date.now() + 60 * 60_000) {
    return NextResponse.json({ error: "Réservez au moins une heure à l’avance." }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
    } = await admin.auth.getUser(bearer);
    if (!user) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
    const end = new Date(start.getTime() + durationHours * 60 * 60_000).toISOString();

    const [{ data: rows, error }, { data: conflicts, error: conflictsError }] = await Promise.all([
      admin.from("vip_vehicle_offers").select(`
        id, vehicle_id, price_4h_fcfa, price_8h_fcfa, price_12h_fcfa,
        included_km_4h, included_km_8h, included_km_12h, extra_km_rate_fcfa,
        vehicle:vehicles(
          id, brand, model, category, seats, color, photo_url, photo_urls,
          tagline, luggage_capacity, is_verified, status
        )
      `).eq("status", "active"),
      admin
        .from("bookings")
        .select("requested_vehicle_id")
        .not("requested_vehicle_id", "is", null)
        .not("service_end_time", "is", null)
        .lt("pickup_time", end)
        .gt("service_end_time", start.toISOString())
        .not("status", "in", '("annulee","cancelled","terminee","completed","refusee","expired")'),
    ]);
    if (error || conflictsError) throw error ?? conflictsError;

    const unavailable = new Set((conflicts ?? []).map((row) => String(row.requested_vehicle_id)));
    const offers = (rows ?? []).flatMap((row): VipVehicleOffer[] => {
      const vehicle = (Array.isArray(row.vehicle) ? row.vehicle[0] : row.vehicle) as Record<string, unknown> | null;
      if (
        !vehicle ||
        unavailable.has(String(row.vehicle_id)) ||
        !["available", "in_service"].includes(String(vehicle.status)) ||
        Number(vehicle.seats ?? 0) < passengers
      ) return [];
      return [{
        id: String(row.id),
        vehicleId: String(row.vehicle_id),
        brand: String(vehicle.brand),
        model: String(vehicle.model),
        category: String(vehicle.category ?? "Premium"),
        seats: Number(vehicle.seats ?? 0),
        color: vehicle.color ? String(vehicle.color) : null,
        photoUrl: vehicle.photo_url ? String(vehicle.photo_url) : null,
        photoUrls: photoList(vehicle.photo_urls),
        tagline: vehicle.tagline ? String(vehicle.tagline) : null,
        luggageCapacity: vehicle.luggage_capacity ? String(vehicle.luggage_capacity) : null,
        isVerified: Boolean(vehicle.is_verified),
        price4hFcfa: Number(row.price_4h_fcfa),
        price8hFcfa: Number(row.price_8h_fcfa),
        price12hFcfa: Number(row.price_12h_fcfa),
        includedKm4h: Number(row.included_km_4h),
        includedKm8h: Number(row.included_km_8h),
        includedKm12h: Number(row.included_km_12h),
        extraKmRateFcfa: Number(row.extra_km_rate_fcfa),
      }];
    }).sort((a, b) => a.price8hFcfa - b.price8hFcfa);

    return NextResponse.json({ offers });
  } catch (error) {
    console.error("[vip-offers]", error);
    return NextResponse.json({ error: "Impossible de vérifier les véhicules VIP." }, { status: 503 });
  }
}
