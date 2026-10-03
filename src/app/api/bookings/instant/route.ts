import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getDrivingDistance } from "@/lib/server/drivingDistance";
import {
  computeInstantTaxiPrice,
  VEHICLE_CATEGORY_LABELS,
  type VehicleCategory,
} from "@/lib/sentrajetPricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES: VehicleCategory[] = ["berline", "suv", "van"];

type InstantBody = {
  pickup: { address?: string; lat?: number; lng?: number };
  dropoff: { address?: string; lat?: number; lng?: number };
  vehicleCategory?: VehicleCategory;
  passengers?: number;
  phone?: string;
};

function cleanPhone(value: string | undefined): string {
  return String(value ?? "").replace(/[^\d+]/g, "");
}

async function bookingResponse(bookingId: string, token: string) {
  const admin = getSupabaseAdmin();
  const { data: booking, error } = await admin
    .from("bookings")
    .select(
      `id, reference, status, pickup, dropoff, pickup_time, estimated_price, distance_km,
       search_expires_at, instant_search_token,
       service_orders(id, dispatch_assignments(
         driver:drivers(id, full_name, phone, photo_url),
         vehicle:vehicles(id, brand, model, plate_number, color, seats, photo_url, fleet_source)
       ))`
    )
    .eq("id", bookingId)
    .eq("instant_search_token", token)
    .maybeSingle();

  if (error || !booking) {
    return NextResponse.json({ error: "Recherche introuvable ou expirée." }, { status: 404 });
  }

  const row = booking as Record<string, unknown>;
  const orders = (row.service_orders as Array<Record<string, unknown>> | null) ?? [];
  const assignments =
    (orders[0]?.dispatch_assignments as Array<Record<string, unknown>> | null) ?? [];
  const assignment = assignments[0] ?? null;

  return NextResponse.json({
    searchToken: token,
    booking: {
      id: row.id,
      reference: row.reference,
      status: row.status,
      pickup: row.pickup,
      dropoff: row.dropoff,
      pickupTime: row.pickup_time,
      estimatedPrice: row.estimated_price,
      distanceKm: row.distance_km,
      searchExpiresAt: row.search_expires_at,
      driver: assignment?.driver ?? null,
      vehicle: assignment?.vehicle ?? null,
    },
  });
}

export async function POST(request: NextRequest) {
  let body: InstantBody;
  try {
    body = (await request.json()) as InstantBody;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const category = body.vehicleCategory;
  const phone = cleanPhone(body.phone);
  const passengers = Math.max(1, Math.min(10, Number(body.passengers) || 1));
  const route = {
    fromLat: Number(body.pickup?.lat),
    fromLng: Number(body.pickup?.lng),
    toLat: Number(body.dropoff?.lat),
    toLng: Number(body.dropoff?.lng),
  };

  if (
    !body.pickup?.address?.trim() ||
    !body.dropoff?.address?.trim() ||
    !category ||
    !CATEGORIES.includes(category)
  ) {
    return NextResponse.json(
      { error: "Départ, destination et catégorie de véhicule sont requis." },
      { status: 400 }
    );
  }
  if (phone.replace(/\D/g, "").length < 9) {
    return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
  }

  const distance = await getDrivingDistance(route);
  if (!distance) {
    return NextResponse.json(
      { error: "Impossible de calculer l’itinéraire routier." },
      { status: 422 }
    );
  }
  const quote = computeInstantTaxiPrice(distance.distanceKm, category);

  try {
    const admin = getSupabaseAdmin();
    const token = crypto.randomUUID();
    const reference = `SJ-LIVE-${Date.now().toString().slice(-7)}`;
    const expiresAt = new Date(Date.now() + 3 * 60_000).toISOString();
    let clientId: string | null = null;

    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (bearer) {
      const { data } = await admin.auth.getUser(bearer);
      if (data.user) {
        const { data: client } = await admin
          .from("clients")
          .select("id")
          .eq("user_id", data.user.id)
          .maybeSingle();
        clientId = (client?.id as string | undefined) ?? null;
      }
    }

    const { data: booking, error } = await admin
      .from("bookings")
      .insert({
        reference,
        client_id: clientId,
        status: "recherche_chauffeur",
        pickup: body.pickup.address.trim(),
        dropoff: body.dropoff.address.trim(),
        pickup_time: new Date().toISOString(),
        service_type: "transfert_aibd",
        estimated_price: quote.amountFcfa,
        final_amount_fcfa: quote.amountFcfa,
        passengers,
        phone,
        distance_km: quote.distanceKm,
        pricing_segment: "client",
        source: "instant_taxi",
        tariff_version_code: "INSTANT_TAXI_V1",
        notes: `Catégorie véhicule : ${VEHICLE_CATEGORY_LABELS[category]}\nTarif : ${quote.formula}`,
        pickup_lat: route.fromLat,
        pickup_lng: route.fromLng,
        dropoff_lat: route.toLat,
        dropoff_lng: route.toLng,
        booking_mode: "instant",
        search_expires_at: expiresAt,
        instant_search_token: token,
      })
      .select("id")
      .single();
    if (error || !booking) throw error ?? new Error("booking_create_failed");

    await admin.from("booking_status_history").insert({
      booking_id: booking.id,
      from_status: null,
      to_status: "recherche_chauffeur",
      note: "Recherche instantanée lancée depuis l’application client",
    });
    await admin.rpc("auto_dispatch_booking", { p_booking_id: booking.id });

    return bookingResponse(booking.id as string, token);
  } catch (error) {
    console.error("[instant-booking]", error);
    return NextResponse.json(
      { error: "Le service instantané est temporairement indisponible." },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!id || !token) {
    return NextResponse.json({ error: "Recherche invalide." }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: found } = await admin
      .from("bookings")
      .select("status, search_expires_at")
      .eq("id", id)
      .eq("instant_search_token", token)
      .maybeSingle();
    if (!found) {
      return NextResponse.json({ error: "Recherche introuvable." }, { status: 404 });
    }
    if (
      found.status === "recherche_chauffeur" &&
      new Date(found.search_expires_at as string).getTime() > Date.now()
    ) {
      await admin.rpc("auto_dispatch_booking", { p_booking_id: id });
    }
    return bookingResponse(id, token);
  } catch {
    return NextResponse.json({ error: "Recherche indisponible." }, { status: 503 });
  }
}
