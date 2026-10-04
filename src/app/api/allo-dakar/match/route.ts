import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromBearer } from "@/lib/server/authUser";

export const runtime = "nodejs";

type MatchBody = {
  clientFullName?: string;
  clientPhone?: string;
  corridorId?: string;
  requestedAt?: string;
  seatsNeeded?: number;
  pickupMode?: "domicile" | "point_relais";
  pickupDetail?: string | null;
  searchWindowMinutes?: number;
  maxPriceFcfa?: number | null;
};

async function readMatchDetails(
  admin: ReturnType<typeof getSupabaseAdmin>,
  requestId: string,
  userId: string,
) {
  const { data: requestRow } = await admin
    .from("allo_dakar_ride_requests")
    .select("id, status, expires_at, matched_booking_id, matched_departure_id")
    .eq("id", requestId)
    .eq("client_user_id", userId)
    .maybeSingle();
  if (!requestRow) return null;

  const matched =
    requestRow.status === "confirmee" &&
    Boolean(requestRow.matched_booking_id) &&
    Boolean(requestRow.matched_departure_id);
  let booking = null;
  let departure = null;
  if (matched) {
    const [{ data: bookingRow }, { data: departureRow }] = await Promise.all([
      admin
        .from("allo_dakar_bookings")
        .select("*")
        .eq("id", requestRow.matched_booking_id)
        .single(),
      admin
        .from("allo_dakar_departures")
        .select(`
          id, allo_dakar_driver_id, allo_dakar_vehicle_id, corridor_id,
          departure_at, price_per_seat_fcfa, price_domicile_fcfa,
          seats_total, seats_available, dispatch_mode, accepts_auto_dispatch,
          status, notes,
          corridor:allo_dakar_corridors(*),
          driver:allo_dakar_drivers(id, full_name, phone, garage_name),
          vehicle:allo_dakar_vehicles(
            id, plate_number, brand, model, vehicle_type, color,
            model_year, photo_url, seats_total, is_verified
          )
        `)
        .eq("id", requestRow.matched_departure_id)
        .single(),
    ]);
    booking = bookingRow;
    departure = departureRow;
  }

  return {
    requestId: String(requestRow.id),
    expiresAt: String(requestRow.expires_at),
    matched,
    booking,
    departure,
  };
}

export async function GET(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const requestId = request.nextUrl.searchParams.get("requestId");
  if (!bearer) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }
  if (!requestId) {
    return NextResponse.json({ error: "Demande manquante." }, { status: 400 });
  }
  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
    } = await Promise.resolve({ data: { user: await getUserFromBearer(request.headers.get("authorization")) }, error: null });
    if (!user) {
      return NextResponse.json({ error: "Votre session a expiré." }, { status: 401 });
    }
    const result = await readMatchDetails(admin, requestId, user.id);
    if (!result) {
      return NextResponse.json({ error: "Recherche introuvable." }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[allo-dakar-match-status]", error);
    return NextResponse.json({ error: "Statut indisponible." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as MatchBody;
  const requestedAt = new Date(body.requestedAt ?? "");
  const seatsNeeded = Math.max(1, Number(body.seatsNeeded) || 1);
  const searchWindowMinutes = Math.max(
    30,
    Math.min(720, Number(body.searchWindowMinutes) || 180),
  );
  if (
    !body.clientFullName?.trim() ||
    String(body.clientPhone ?? "").replace(/\D/g, "").length < 9 ||
    !body.corridorId ||
    !Number.isFinite(requestedAt.getTime()) ||
    seatsNeeded > 10 ||
    !["domicile", "point_relais"].includes(String(body.pickupMode))
  ) {
    return NextResponse.json(
      { error: "Vérifiez l’axe, l’horaire, les places et vos coordonnées." },
      { status: 400 },
    );
  }

  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
    } = await Promise.resolve({ data: { user: await getUserFromBearer(request.headers.get("authorization")) }, error: null });
    if (!user) {
      return NextResponse.json({ error: "Votre session a expiré." }, { status: 401 });
    }

    const { data, error } = await admin.rpc("create_allo_dakar_live_request", {
      p_user_id: user.id,
      p_client_full_name: body.clientFullName.trim(),
      p_client_phone: body.clientPhone?.trim(),
      p_corridor_id: body.corridorId,
      p_requested_at: requestedAt.toISOString(),
      p_seats_needed: seatsNeeded,
      p_pickup_mode: body.pickupMode,
      p_pickup_detail: body.pickupDetail?.trim() || null,
      p_search_window_minutes: searchWindowMinutes,
      p_max_price_fcfa:
        body.maxPriceFcfa && Number(body.maxPriceFcfa) > 0
          ? Math.round(Number(body.maxPriceFcfa))
          : null,
    });
    if (error) {
      if (error.message.includes("allo_dakar_")) {
        return NextResponse.json(
          { error: "Cet axe ou cet horaire n’est plus disponible." },
          { status: 409 },
        );
      }
      throw error;
    }

    const result = data as {
      request_id: string;
      expires_at: string;
      match?: {
        matched?: boolean;
        booking_id?: string;
        departure_id?: string;
      };
    };
    const details = await readMatchDetails(admin, String(result.request_id), user.id);
    if (!details) throw new Error("created_request_missing");
    return NextResponse.json(details, { status: 201 });
  } catch (error) {
    console.error("[allo-dakar-match]", error);
    return NextResponse.json(
      { error: "Le dispatch Allo Dakar n’a pas pu être lancé." },
      { status: 503 },
    );
  }
}
