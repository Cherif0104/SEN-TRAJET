import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromBearer } from "@/lib/server/authUser";
import { getWaveApiKey, getWaveSimulationMode } from "@/lib/wave";

export const runtime = "nodejs";

function appBaseUrl(request: NextRequest): string {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.nextUrl.origin
  ).replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
    } = await Promise.resolve({ data: { user: await getUserFromBearer(request.headers.get("authorization")) }, error: null });
    if (!user) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as { bookingId?: string };
    if (!body.bookingId) {
      return NextResponse.json({ error: "Réservation manquante." }, { status: 400 });
    }

    const { data: booking, error } = await admin
      .from("voyager_bookings")
      .select("id, client_user_id, amount_fcfa, payment_status, status, expires_at")
      .eq("id", body.bookingId)
      .eq("client_user_id", user.id)
      .maybeSingle();
    if (error || !booking) {
      return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
    }
    if (
      booking.status !== "reservee" ||
      booking.payment_status !== "pending" ||
      new Date(booking.expires_at).getTime() <= Date.now()
    ) {
      await admin.rpc("expire_voyager_bookings");
      return NextResponse.json(
        { error: "Cette réservation n’est plus en attente de paiement." },
        { status: 409 },
      );
    }
    if (getWaveSimulationMode()) {
      return NextResponse.json({ simulation: true, checkout_url: null });
    }

    const base = appBaseUrl(request);
    const waveResponse = await fetch("https://api.wave.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getWaveApiKey()}`,
        "Idempotency-Key": `voyager_checkout_${booking.id}`,
      },
      body: JSON.stringify({
        amount: String(Math.round(Number(booking.amount_fcfa))),
        currency: "XOF",
        client_reference: `voyager:${booking.id}`,
        success_url: `${base}/voyager/confirmation/${booking.id}?wave=success`,
        error_url: `${base}/voyager/confirmation/${booking.id}?wave=cancel`,
      }),
    });
    if (!waveResponse.ok) {
      return NextResponse.json(
        { error: "Wave a refusé la session de paiement." },
        { status: 502 },
      );
    }
    const session = (await waveResponse.json().catch(() => ({}))) as {
      id?: string;
      wave_launch_url?: string;
    };
    if (!session.wave_launch_url) {
      return NextResponse.json({ error: "URL Wave manquante." }, { status: 502 });
    }
    if (session.id) {
      await admin
        .from("voyager_bookings")
        .update({ payment_provider_ref: session.id, updated_at: new Date().toISOString() })
        .eq("id", booking.id);
    }
    return NextResponse.json({
      simulation: false,
      checkout_url: session.wave_launch_url,
    });
  } catch (error) {
    console.error("[voyager-wave]", error);
    return NextResponse.json({ error: "Paiement Voyager indisponible." }, { status: 503 });
  }
}
