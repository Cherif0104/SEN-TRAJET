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
 * Crée une session de paiement Wave réelle pour un paiement de réservation (booking).
 * Distinct de /api/checkout/wave (crédits chauffeur) — ne modifie pas ce flux existant.
 * Si aucune clé Wave n'est configurée, renvoie simulation:true et laisse le front utiliser
 * le lien Wave marchand générique déjà en place (aucune régression de comportement).
 */
export async function POST(request: NextRequest) {
  let body: { paymentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const paymentId = body.paymentId;
  if (!paymentId) {
    return NextResponse.json({ error: "paymentId requis." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: request.headers.get("authorization")
        ? { Authorization: request.headers.get("authorization")! }
        : {},
    },
  });

  const { data: payment, error } = await supabase
    .from("payments")
    .select("id, booking_id, amount_fcfa, status, booking_ref")
    .eq("id", paymentId)
    .maybeSingle();

  if (error || !payment) {
    return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
  }
  if (payment.status !== "pending" && payment.status !== "initiated" && payment.status !== "created") {
    return NextResponse.json({ error: "Ce paiement n’est plus en attente." }, { status: 409 });
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
      amount: String(Math.max(0, Math.round(Number(payment.amount_fcfa) || 0))),
      currency: "XOF",
      client_reference: String(payment.id),
      success_url: `${base}/compte/reservations/${payment.booking_id}?wave=success`,
      error_url: `${base}/compte/reservations/${payment.booking_id}?wave=cancel`,
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
    // Écriture système (référence de session Wave) — le client authentifié n'a pas de droit
    // UPDATE sur payments (réservé à la finance) ; on utilise donc le client de service ici,
    // après avoir vérifié l'autorisation via la lecture RLS ci-dessus.
    await supabaseAdmin.from("payments").update({ provider_ref: session.id }).eq("id", payment.id);
  }

  return NextResponse.json({ simulation: false, checkout_url: session.wave_launch_url });
}
