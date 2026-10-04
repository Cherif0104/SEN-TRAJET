import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromBearer } from "@/lib/server/authUser";
import { getWaveApiKey, getWaveSimulationMode } from "@/lib/wave";

export const runtime = "nodejs";

function baseUrl(request: NextRequest): string {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.nextUrl.origin
  ).replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const body = (await request.json().catch(() => ({}))) as { bookingId?: string };
  if (!token || !body.bookingId) {
    return NextResponse.json({ error: "Connexion et réservation requises." }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
    } = await Promise.resolve({ data: { user: await getUserFromBearer(request.headers.get("authorization")) }, error: null });
    if (!user) return NextResponse.json({ error: "Session expirée." }, { status: 401 });

    const { data: booking, error } = await admin
      .from("rental_bookings")
      .select("id, client_id, total_fcfa, status, payment_status, expires_at")
      .eq("id", body.bookingId)
      .eq("client_id", user.id)
      .maybeSingle();
    if (error || !booking) {
      return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
    }
    if (
      booking.status === "expired" ||
      (booking.status === "pending_payment" &&
        new Date(booking.expires_at as string).getTime() < Date.now())
    ) {
      await admin.from("rental_bookings").update({ status: "expired" }).eq("id", booking.id);
      return NextResponse.json({ error: "Le blocage du véhicule a expiré. Relancez la réservation." }, { status: 409 });
    }
    if (!["pending", "failed"].includes(booking.payment_status)) {
      return NextResponse.json({ error: "Cette réservation n’est plus en attente de paiement." }, { status: 409 });
    }
    if (getWaveSimulationMode()) {
      return NextResponse.json({ simulation: true, checkout_url: null });
    }

    const waveResponse = await fetch("https://api.wave.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getWaveApiKey()}`,
      },
      body: JSON.stringify({
        amount: String(Math.round(Number(booking.total_fcfa))),
        currency: "XOF",
        client_reference: `rental:${booking.id}`,
        success_url: `${baseUrl(request)}/flotte/reservation/${booking.id}?wave=success`,
        error_url: `${baseUrl(request)}/flotte/reservation/${booking.id}?wave=cancel`,
      }),
    });
    if (!waveResponse.ok) {
      return NextResponse.json({ error: "Wave n’a pas pu initialiser le paiement." }, { status: 502 });
    }
    const session = (await waveResponse.json()) as { id?: string; wave_launch_url?: string };
    if (!session.wave_launch_url) {
      return NextResponse.json({ error: "Wave n’a pas renvoyé de lien de paiement." }, { status: 502 });
    }
    await admin
      .from("rental_bookings")
      .update({
        payment_status: "initiated",
        payment_provider: "wave",
        payment_provider_ref: session.id ?? null,
      })
      .eq("id", booking.id);
    return NextResponse.json({ simulation: false, checkout_url: session.wave_launch_url });
  } catch (error) {
    console.error("[rental-wave]", error);
    return NextResponse.json({ error: "Paiement temporairement indisponible." }, { status: 503 });
  }
}
