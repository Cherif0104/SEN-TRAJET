import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromBearer } from "@/lib/server/authUser";
import { mapRentalBooking, RENTAL_BOOKING_SELECT } from "@/lib/server/rentalMarketplace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }
  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
    } = await Promise.resolve({ data: { user: await getUserFromBearer(request.headers.get("authorization")) }, error: null });
    if (!user) return NextResponse.json({ error: "Session expirée." }, { status: 401 });

    const { data, error } = await admin
      .from("rental_bookings")
      .select(RENTAL_BOOKING_SELECT)
      .eq("id", params.id)
      .eq("client_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
    return NextResponse.json({ booking: mapRentalBooking(data as Record<string, unknown>) });
  } catch (error) {
    console.error("[rental-booking-get]", error);
    return NextResponse.json({ error: "Impossible de charger la réservation." }, { status: 503 });
  }
}
