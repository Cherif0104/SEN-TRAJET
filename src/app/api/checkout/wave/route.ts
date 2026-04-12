import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const waveApiKey = process.env.WAVE_API_KEY ?? "";
const freeCreditsPeriod =
  process.env.SEN_TRAJET_FREE_CREDITS_PERIOD === "true" ||
  process.env.FREE_CREDITS_PERIOD === "true";
const freeCreditsUntil = process.env.FREE_CREDITS_UNTIL;
const simulationMode = !waveApiKey || process.env.WAVE_SIMULATION === "true";

function isFreePeriod(): boolean {
  if (!freeCreditsPeriod && !freeCreditsUntil) return false;
  if (freeCreditsPeriod) return true;
  if (freeCreditsUntil) {
    try {
      return new Date() <= new Date(freeCreditsUntil);
    } catch {
      return false;
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  let body: { package_id?: string; access_token?: string; refresh_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { package_id, access_token, refresh_token } = body;
  if (!package_id || !access_token) {
    return NextResponse.json(
      { error: "package_id et access_token requis" },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: authError } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token ?? "",
  });

  if (authError || !user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: pkg, error: pkgError } = await supabase
    .from("credit_packages")
    .select("id, credits, price_fcfa")
    .eq("id", package_id)
    .eq("is_active", true)
    .single();

  if (pkgError || !pkg) {
    return NextResponse.json({ error: "Pack introuvable" }, { status: 404 });
  }

  const origin =
    request.headers.get("origin") ??
    request.nextUrl.origin ??
    "https://localhost:3000";
  const base = origin.replace(/\/$/, "");
  const successUrl = `${base}/chauffeur/credits/recharger?wave=success`;

  if (isFreePeriod()) {
    const ref = `free_period_${Date.now()}`;
    const { error: rpcError } = await supabaseAdmin.rpc("credit_recharge", {
      driver_id: user.id,
      credits: pkg.credits,
      reference: ref,
    });
    if (rpcError) {
      return NextResponse.json(
        { error: "Impossible d'attribuer les crédits" },
        { status: 500 }
      );
    }
    await supabaseAdmin.from("payment_intents").insert({
      driver_id: user.id,
      package_id: pkg.id,
      amount_fcfa: 0,
      provider: "wave",
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    return NextResponse.json({ checkout_url: successUrl, free_period: true });
  }

  if (simulationMode) {
    const { data: simIntent, error: simErr } = await supabase
      .from("payment_intents")
      .insert({
        driver_id: user.id,
        package_id: pkg.id,
        amount_fcfa: pkg.price_fcfa,
        provider: "wave",
        status: "pending",
      })
      .select("id")
      .single();
    if (simErr || !simIntent) {
      return NextResponse.json(
        { error: "Impossible de créer l'intention de paiement" },
        { status: 500 }
      );
    }
    const simulateUrl = `${base}/chauffeur/credits/recharger?wave=simulate&intent_id=${simIntent.id}`;
    return NextResponse.json({ checkout_url: simulateUrl, simulation: true });
  }

  const { data: intent, error: intentError } = await supabase
    .from("payment_intents")
    .insert({
      driver_id: user.id,
      package_id: pkg.id,
      amount_fcfa: pkg.price_fcfa,
      provider: "wave",
      status: "pending",
    })
    .select("id")
    .single();

  if (intentError || !intent) {
    return NextResponse.json(
      { error: "Impossible de créer l’intention de paiement" },
      { status: 500 }
    );
  }

  const errorUrl = `${base}/chauffeur/credits/recharger?wave=cancel`;
  const waveBody = {
    amount: String(pkg.price_fcfa),
    currency: "XOF",
    client_reference: String(intent.id),
    success_url: successUrl,
    error_url: errorUrl,
  };

  const waveRes = await fetch("https://api.wave.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${waveApiKey}`,
    },
    body: JSON.stringify(waveBody),
  });

  if (!waveRes.ok) {
    const errText = await waveRes.text();
    return NextResponse.json(
      { error: "Wave a refusé la session", details: errText },
      { status: 502 }
    );
  }

  const session = (await waveRes.json()) as { wave_launch_url?: string };
  const checkoutUrl = session.wave_launch_url ?? null;

  if (!checkoutUrl) {
    return NextResponse.json(
      { error: "Wave n’a pas renvoyé d’URL" },
      { status: 502 }
    );
  }

  return NextResponse.json({ checkout_url: checkoutUrl });
}
