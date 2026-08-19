import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSentrajetSupabasePublicConfig } from "@/lib/supabaseConfig";
import { getWaveApiKey, getWaveSimulationMode } from "@/lib/wave";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const { url: supabaseUrl, key: anonKey } = getSentrajetSupabasePublicConfig();

function getAppBaseUrl(request: NextRequest): string {
  const fromEnv =
    process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const candidate = (fromEnv || request.nextUrl.origin || "http://localhost:3000").trim();
  return candidate.replace(/\/$/, "");
}

/**
 * Crée une session de paiement Wave pour une réservation de place Allo Dakar.
 * Même logique que /api/checkout/wave/booking (réservations Premium), en mode simulation si
 * aucune clé Wave n'est configurée.
 */
export async function POST(request: NextRequest) {
  let body: { bookingId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const bookingId = body.bookingId;
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId requis." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: request.headers.get("authorization")
        ? { Authorization: request.headers.get("authorization")! }
        : {},
    },
  });

  const { data: booking, error } = await supabase
    .from("allo_dakar_bookings")
    .select("id, departure_id, amount_fcfa, payment_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }
  if (booking.payment_status !== "pending") {
    return NextResponse.json({ error: "Cette réservation n’est plus en attente de paiement." }, { status: 409 });
  }

  if (getWaveSimulationMode()) {
    return NextResponse.json({ simulation: true, checkout_url: null });
  }

  const base = getAppBaseUrl(request);
  const waveRes = await fetch("https://api.wave.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getWaveApiKey()}`,
    },
    body: JSON.stringify({
      amount: String(Math.max(0, Math.round(Number(booking.amount_fcfa) || 0))),
      currency: "XOF",
      client_reference: `alloDakar:${booking.id}`,
      success_url: `${base}/allo-dakar/confirmation/${booking.id}?wave=success`,
      error_url: `${base}/allo-dakar/confirmation/${booking.id}?wave=cancel`,
    }),
  });

  if (!waveRes.ok) {
    const details = await waveRes.text().catch(() => "");
    return NextResponse.json({ error: "Wave a refusé la session de paiement.", details }, { status: 502 });
  }

  const session = (await waveRes.json().catch(() => ({}))) as { wave_launch_url?: string; id?: string };
  if (!session.wave_launch_url) {
    return NextResponse.json({ error: "Wave n’a pas renvoyé d’URL de paiement." }, { status: 502 });
  }

  if (session.id) {
    await supabaseAdmin.from("allo_dakar_bookings").update({ payment_provider_ref: session.id }).eq("id", booking.id);
  }

  return NextResponse.json({ simulation: false, checkout_url: session.wave_launch_url });
}
