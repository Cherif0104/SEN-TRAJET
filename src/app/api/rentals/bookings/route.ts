import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { mapRentalBooking, RENTAL_BOOKING_SELECT } from "@/lib/server/rentalMarketplace";

export const runtime = "nodejs";

type BookingBody = {
  listingId?: string;
  startDate?: string;
  endDate?: string;
  pickupLocation?: string;
  returnLocation?: string;
  phone?: string;
};

export async function POST(request: NextRequest) {
  let body: BookingBody;
  try {
    body = (await request.json()) as BookingBody;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (
    !body.listingId ||
    !body.startDate ||
    !body.endDate ||
    !body.pickupLocation?.trim() ||
    !body.returnLocation?.trim()
  ) {
    return NextResponse.json(
      { error: "Véhicule, dates et lieux de remise sont requis." },
      { status: 400 },
    );
  }
  if (body.endDate < body.startDate) {
    return NextResponse.json({ error: "La date de retour précède le départ." }, { status: 400 });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Connectez-vous pour finaliser la réservation." }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Votre session a expiré. Reconnectez-vous." }, { status: 401 });
    }

    const { data: profile } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (!profile) {
      return NextResponse.json(
        { error: "Votre profil client n’est pas encore prêt. Reconnectez-vous puis réessayez." },
        { status: 409 },
      );
    }

    const { data, error } = await admin
      .from("rental_bookings")
      .insert({
        listing_id: body.listingId,
        client_id: user.id,
        start_date: body.startDate,
        end_date: body.endDate,
        pickup_location_label: body.pickupLocation.trim(),
        return_location_label: body.returnLocation.trim(),
        customer_phone: body.phone?.trim() || null,
      })
      .select(RENTAL_BOOKING_SELECT)
      .single();

    if (error) {
      if (error.code === "23P01") {
        return NextResponse.json(
          { error: "Ce véhicule vient d’être réservé sur ces dates. Choisissez-en un autre." },
          { status: 409 },
        );
      }
      if (error.message.includes("rental_")) {
        return NextResponse.json(
          { error: "Le véhicule ou la période sélectionnée n’est plus disponible." },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json({ booking: mapRentalBooking(data as Record<string, unknown>) }, { status: 201 });
  } catch (error) {
    console.error("[rental-booking-create]", error);
    return NextResponse.json(
      { error: "La réservation n’a pas pu être créée. Réessayez dans un instant." },
      { status: 503 },
    );
  }
}
