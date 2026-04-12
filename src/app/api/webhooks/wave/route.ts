import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Webhook Wave : appelé par Wave quand un paiement est complété (ou échoué).
 * Vérifier dans le portail Wave la forme exacte du body et la signature.
 * Ici on suppose que le body contient client_reference (id payment_intent) et
 * un statut (checkout_status ou payment_status).
 */
export async function POST(request: NextRequest) {
  let body: {
    client_reference?: string;
    checkout_status?: string;
    payment_status?: string;
    id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const ref = body.client_reference ?? body.id;
  if (!ref) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const status =
    body.payment_status ?? body.checkout_status ?? "";
  const succeeded =
    status === "succeeded" || status === "complete";

  const { data: intent, error: fetchErr } = await supabaseAdmin
    .from("payment_intents")
    .select("id, driver_id, package_id, amount_fcfa, status")
    .eq("id", ref)
    .single();

  if (fetchErr || !intent || intent.status !== "pending") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (succeeded) {
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
        reference: ref,
      });
    }

    await supabaseAdmin
      .from("payment_intents")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", ref);
  } else {
    await supabaseAdmin
      .from("payment_intents")
      .update({ status: "failed" })
      .eq("id", ref);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
