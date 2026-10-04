import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromBearer } from "@/lib/server/authUser";
import { getWaveApiKey, getWaveSimulationMode } from "@/lib/wave";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
    } = await Promise.resolve({ data: { user: await getUserFromBearer(request.headers.get("authorization")) }, error: null });
    if (!user) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
    const { data: profile } = await admin
      .from("my_driver_profiles")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile || profile.status !== "verifie") {
      return NextResponse.json({ error: "Votre dossier doit d’abord être validé." }, { status: 409 });
    }
    const now = new Date();
    const { data: active } = await admin
      .from("my_driver_subscriptions")
      .select("id")
      .eq("driver_profile_id", profile.id)
      .eq("status", "actif")
      .gt("ends_at", now.toISOString())
      .limit(1)
      .maybeSingle();
    if (active) {
      return NextResponse.json({ error: "Votre accès aux missions est déjà actif." }, { status: 409 });
    }
    const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60_000);
    const { data: subscription, error } = await admin
      .from("my_driver_subscriptions")
      .insert({
        driver_profile_id: profile.id,
        plan: "hebdomadaire",
        amount_fcfa: 1000,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        status: getWaveSimulationMode() ? "actif" : "pending",
      })
      .select("id")
      .single();
    if (error) throw error;
    if (getWaveSimulationMode()) {
      return NextResponse.json({ simulation: true, checkout_url: null });
    }
    const base = (
      process.env.APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      request.nextUrl.origin
    ).replace(/\/$/, "");
    const response = await fetch("https://api.wave.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getWaveApiKey()}`,
      },
      body: JSON.stringify({
        amount: "1000",
        currency: "XOF",
        client_reference: `myDriverSubscription:${subscription.id}`,
        success_url: `${base}/mon-chauffeur/pro?subscription=success`,
        error_url: `${base}/mon-chauffeur/pro?subscription=cancel`,
      }),
    });
    if (!response.ok) {
      await admin.from("my_driver_subscriptions").delete().eq("id", subscription.id);
      return NextResponse.json({ error: "Wave a refusé le paiement." }, { status: 502 });
    }
    const session = (await response.json()) as { id?: string; wave_launch_url?: string };
    if (!session.wave_launch_url) {
      await admin.from("my_driver_subscriptions").delete().eq("id", subscription.id);
      return NextResponse.json({ error: "URL Wave indisponible." }, { status: 502 });
    }
    await admin
      .from("my_driver_subscriptions")
      .update({ payment_reference: session.id ?? null })
      .eq("id", subscription.id);
    return NextResponse.json({ simulation: false, checkout_url: session.wave_launch_url });
  } catch (error) {
    console.error("[my-driver-subscription-wave]", error);
    return NextResponse.json({ error: "Abonnement indisponible." }, { status: 503 });
  }
}
