import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromBearer } from "@/lib/server/authUser";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
      error: authError,
    } = await Promise.resolve({ data: { user: await getUserFromBearer(request.headers.get("authorization")) }, error: null });
    if (authError || !user) {
      return NextResponse.json({ error: "Votre session a expiré." }, { status: 401 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      departureId?: string;
      fullName?: string;
      phone?: string;
      seats?: number;
    };
    const seats = Math.max(1, Math.min(10, Number(body.seats) || 1));
    if (
      !body.departureId ||
      !body.fullName?.trim() ||
      String(body.phone ?? "").replace(/\D/g, "").length < 9
    ) {
      return NextResponse.json(
        { error: "Départ, nom et téléphone valide sont requis." },
        { status: 400 },
      );
    }

    const { data, error } = await admin.rpc("book_voyager_seats", {
      p_departure_id: body.departureId,
      p_client_user_id: user.id,
      p_client_full_name: body.fullName.trim(),
      p_client_phone: body.phone?.trim(),
      p_seats: seats,
    });
    if (error) {
      const known: Record<string, string> = {
        voyager_departure_not_found: "Ce départ n’existe plus.",
        voyager_departure_not_bookable: "Ce départ n’est plus réservable.",
        voyager_booking_closed: "Les réservations sont clôturées pour ce départ.",
        voyager_not_enough_seats: "Il ne reste plus assez de places.",
        voyager_booking_invalid: "Vérifiez vos informations.",
      };
      const key = Object.keys(known).find((item) => error.message.includes(item));
      return NextResponse.json(
        { error: key ? known[key] : "La réservation n’a pas pu être créée." },
        { status: key ? 409 : 503 },
      );
    }
    const row = data as Record<string, unknown>;
    return NextResponse.json(
      {
        booking: {
          id: String(row.id),
          reference: String(row.reference),
          departureId: String(row.departure_id),
          seatsBooked: Number(row.seats_booked),
          amountFcfa: Number(row.amount_fcfa),
          paymentStatus: String(row.payment_status),
          status: String(row.status),
          expiresAt: String(row.expires_at),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[voyager-booking]", error);
    return NextResponse.json({ error: "Voyager est momentanément indisponible." }, { status: 503 });
  }
}
