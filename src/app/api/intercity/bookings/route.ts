import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  buildIntercityQuote,
  parseIntercityRouteRequest,
} from "@/lib/server/intercity";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const input = parseIntercityRouteRequest(body);
  const vehicleId = typeof body?.vehicleId === "string" ? body.vehicleId : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  if (!input || !vehicleId || phone.replace(/\D/g, "").length < 9) {
    return NextResponse.json(
      { error: "Trajet, véhicule et numéro de téléphone valides sont requis." },
      { status: 400 },
    );
  }

  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
    } = await admin.auth.getUser(bearer);
    if (!user) {
      return NextResponse.json({ error: "Votre session a expiré." }, { status: 401 });
    }

    const quote = await buildIntercityQuote(admin, input);
    if (!quote.offers.some((offer) => offer.vehicleId === vehicleId)) {
      return NextResponse.json(
        { error: "Ce véhicule n’est plus disponible pour ce trajet." },
        { status: 409 },
      );
    }

    const { data, error } = await admin.rpc("create_premium_intercity_booking", {
      p_user_id: user.id,
      p_vehicle_id: vehicleId,
      p_pickup: input.pickup,
      p_dropoff: input.dropoff,
      p_pickup_time: input.pickupTime,
      p_return_time: input.returnTime,
      p_trip_mode: input.tripMode,
      p_passengers: input.passengers,
      p_phone: phone,
      p_distance_km: quote.distanceKm,
      p_duration_minutes: quote.durationMinutes,
      p_pickup_lat: input.pickupLat,
      p_pickup_lng: input.pickupLng,
      p_dropoff_lat: input.dropoffLat,
      p_dropoff_lng: input.dropoffLng,
    });
    if (error) {
      if (error.code === "23P01") {
        return NextResponse.json(
          { error: "Ce véhicule vient d’être réservé. Choisissez-en un autre." },
          { status: 409 },
        );
      }
      if (error.message.includes("intercity_")) {
        return NextResponse.json(
          { error: "Le trajet, l’horaire ou le véhicule n’est plus disponible." },
          { status: 409 },
        );
      }
      throw error;
    }

    const row = data as Record<string, unknown>;
    return NextResponse.json({
      booking: {
        bookingId: String(row.booking_id),
        reference: String(row.reference),
        amountFcfa: Number(row.amount_fcfa),
        paymentId: String(row.payment_id),
        serviceEndTime: String(row.service_end_time),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[intercity-booking]", error);
    if (error instanceof Error && error.message === "intercity_route_unavailable") {
      return NextResponse.json(
        { error: "Impossible de confirmer cet itinéraire routier." },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: "La réservation interurbaine n’a pas pu être créée." },
      { status: 503 },
    );
  }
}
