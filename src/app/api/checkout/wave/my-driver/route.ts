import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getWaveApiKey, getWaveSimulationMode } from "@/lib/wave";

export const runtime = "nodejs";

function appBaseUrl(request: NextRequest) {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.nextUrl.origin
  ).replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const body = (await request.json().catch(() => ({}))) as { requestId?: string };
  if (!token) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  if (!body.requestId) {
    return NextResponse.json({ error: "Mission manquante." }, { status: 400 });
  }
  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
    } = await admin.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
    const { data: mission } = await admin
      .from("my_driver_requests")
      .select("id, reference, amount_fcfa, status, payment_status")
      .eq("id", body.requestId)
      .eq("client_user_id", user.id)
      .maybeSingle();
    if (
      !mission ||
      mission.status !== "en_attente_paiement" ||
      mission.payment_status !== "pending" ||
      !mission.amount_fcfa
    ) {
      return NextResponse.json(
        { error: "Cette mission n’est pas prête au paiement." },
        { status: 409 },
      );
    }
    if (getWaveSimulationMode()) {
      await admin
        .from("my_driver_requests")
        .update({
          payment_status: "paid",
          status: "confirmee",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", mission.id);
      return NextResponse.json({ simulation: true, checkout_url: null });
    }

    const base = appBaseUrl(request);
    const response = await fetch("https://api.wave.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getWaveApiKey()}`,
      },
      body: JSON.stringify({
        amount: String(Math.round(mission.amount_fcfa)),
        currency: "XOF",
        client_reference: `myDriver:${mission.id}`,
        success_url: `${base}/mon-chauffeur?mission=${mission.id}&wave=success`,
        error_url: `${base}/mon-chauffeur?mission=${mission.id}&wave=cancel`,
      }),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Wave a refusé le paiement." }, { status: 502 });
    }
    const session = (await response.json()) as { id?: string; wave_launch_url?: string };
    if (!session.wave_launch_url) {
      return NextResponse.json({ error: "URL Wave indisponible." }, { status: 502 });
    }
    await admin
      .from("my_driver_requests")
      .update({
        payment_status: "initiated",
        payment_provider_ref: session.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mission.id);
    return NextResponse.json({ simulation: false, checkout_url: session.wave_launch_url });
  } catch (error) {
    console.error("[my-driver-wave]", error);
    return NextResponse.json({ error: "Paiement indisponible." }, { status: 503 });
  }
}
