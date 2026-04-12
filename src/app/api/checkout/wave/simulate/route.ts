import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/**
 * Confirme un paiement en mode simulation : crédite le wallet et marque l'intention comme complétée.
 * Appelé par la page recharger quand l'utilisateur revient avec ?wave=simulate&intent_id=xxx
 */
export async function POST(request: NextRequest) {
  let body: { intent_id?: string; access_token?: string; refresh_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const { intent_id, access_token, refresh_token } = body;
  if (!intent_id || !access_token) {
    return NextResponse.json(
      { error: "intent_id et access_token requis" },
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

  const { data: intent, error: fetchErr } = await supabaseAdmin
    .from("payment_intents")
    .select("id, driver_id, package_id, status")
    .eq("id", intent_id)
    .single();

  if (fetchErr || !intent || intent.status !== "pending") {
    return NextResponse.json(
      { error: "Intention introuvable ou déjà traitée" },
      { status: 400 }
    );
  }

  if (intent.driver_id !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { data: pkg } = await supabaseAdmin
    .from("credit_packages")
    .select("credits")
    .eq("id", intent.package_id)
    .single();

  const credits = pkg?.credits ?? 0;
  if (credits > 0) {
    await supabaseAdmin.rpc("credit_recharge", {
      driver_id: intent.driver_id,
      credits,
      reference: intent_id,
    });
  }

  await supabaseAdmin
    .from("payment_intents")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", intent_id);

  return NextResponse.json({ ok: true });
}
