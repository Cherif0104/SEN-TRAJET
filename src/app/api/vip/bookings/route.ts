import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type VipBookingBody = {
  vehicleId?: string;
  pickup?: string;
  pickupTime?: string;
  durationHours?: number;
  passengers?: number;
  phone?: string;
  pickupLat?: number;
  pickupLng?: number;
  notes?: string;
};

export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as VipBookingBody;
  if (
    !body.vehicleId ||
    !body.pickup?.trim() ||
    !body.pickupTime ||
    ![4, 8, 12].includes(Number(body.durationHours))
  ) {
    return NextResponse.json({ error: "Lieu, horaire, durée et véhicule sont requis." }, { status: 400 });
  }
  if (String(body.phone ?? "").replace(/\D/g, "").length < 9) {
    return NextResponse.json({ error: "Indiquez un numéro de téléphone joignable." }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
    } = await admin.auth.getUser(bearer);
    if (!user) return NextResponse.json({ error: "Votre session a expiré." }, { status: 401 });

    const { data, error } = await admin.rpc("create_vip_booking", {
      p_user_id: user.id,
      p_vehicle_id: body.vehicleId,
      p_pickup: body.pickup.trim(),
      p_pickup_time: body.pickupTime,
      p_duration_hours: Number(body.durationHours),
      p_passengers: Math.max(1, Number(body.passengers) || 1),
      p_phone: body.phone?.trim(),
      p_pickup_lat: Number.isFinite(body.pickupLat) ? body.pickupLat : null,
      p_pickup_lng: Number.isFinite(body.pickupLng) ? body.pickupLng : null,
      p_notes: body.notes?.trim() || null,
    });
    if (error) {
      if (error.code === "23P01") {
        return NextResponse.json(
          { error: "Ce véhicule vient d’être réservé sur ce créneau. Choisissez-en un autre." },
          { status: 409 },
        );
      }
      if (error.message.includes("vip_")) {
        return NextResponse.json(
          { error: "Le véhicule, l’horaire ou le nombre de passagers n’est plus disponible." },
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
        status: String(row.status),
        pickupTime: String(row.pickup_time),
        serviceEndTime: String(row.service_end_time),
        amountFcfa: Number(row.amount_fcfa),
        paymentId: String(row.payment_id),
        paymentStatus: String(row.payment_status),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[vip-booking]", error);
    return NextResponse.json({ error: "La réservation VIP n’a pas pu être créée." }, { status: 503 });
  }
}
