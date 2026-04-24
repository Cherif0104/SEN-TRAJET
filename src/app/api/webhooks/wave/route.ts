import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeCreditPurchaseCommission, createPartnerCommission } from "@/lib/commissions";
import { getWaveApiKey, getWaveWebhookSecret, timingSafeEqual } from "@/lib/wave";

async function verifyWaveSignature(request: NextRequest, rawBody: string): Promise<boolean> {
  const secret = getWaveWebhookSecret();
  // En production, la signature doit être configurée et valide.
  if (!secret) return process.env.NODE_ENV !== "production";
  const signature = request.headers.get("Wave-Signature") ?? request.headers.get("wave-signature") ?? "";
  if (!signature) return false;
  const crypto = await import("node:crypto");
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return timingSafeEqual(signature, expected);
}

async function tryWavePayout(params: {
  partnerId: string;
  amountFcfa: number;
  reference: string;
}): Promise<{ ok: true; payoutId?: string } | { ok: false; error: string }> {
  const apiKey = getWaveApiKey();
  if (!apiKey) return { ok: false, error: "wave_api_key_missing" };

  const { data: partner, error: partnerErr } = await supabaseAdmin
    .from("partners")
    .select("wave_payout_enabled, wave_payout_mobile, wave_payout_name, wave_aggregated_merchant_id")
    .eq("id", params.partnerId)
    .maybeSingle();
  if (partnerErr || !partner) return { ok: false, error: "partner_not_found" };
  if (!partner.wave_payout_enabled) return { ok: false, error: "payout_disabled" };
  if (!partner.wave_payout_mobile) return { ok: false, error: "missing_mobile" };

  const idempotencyKey = `partner_commission_${params.reference}`;
  const body: Record<string, unknown> = {
    currency: "XOF",
    receive_amount: String(Math.max(0, Math.round(params.amountFcfa))),
    mobile: partner.wave_payout_mobile,
    name: partner.wave_payout_name ?? undefined,
    client_reference: params.reference,
    aggregated_merchant_id: partner.wave_aggregated_merchant_id ?? undefined,
    payment_reason: "Commission partenaire (SEN TRAJET)",
  };

  const waveRes = await fetch("https://api.wave.com/v1/payout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  const data = await waveRes.json().catch(() => ({}));
  if (!waveRes.ok) {
    return { ok: false, error: typeof data?.message === "string" ? data.message : "wave_payout_failed" };
  }
  return { ok: true, payoutId: typeof data?.id === "string" ? data.id : undefined };
}

/**
 * Webhook Wave : appelé par Wave quand un paiement est complété (ou échoué).
 * Vérifier dans le portail Wave la forme exacte du body et la signature.
 * Ici on suppose que le body contient client_reference (id payment_intent) et
 * un statut (checkout_status ou payment_status).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text().catch(() => "");
  const signatureOk = await verifyWaveSignature(request, rawBody);
  if (!signatureOk) {
    // Ne pas accuser réception si la signature est invalide : protège des injections de crédits.
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }
  if (process.env.NODE_ENV === "production" && !getWaveWebhookSecret()) {
    // Garde-fou : en prod, secret obligatoire.
    return NextResponse.json({ error: "webhook_secret_missing" }, { status: 500 });
  }
  let body: {
    client_reference?: string;
    checkout_status?: string;
    payment_status?: string;
    id?: string;
  };
  try {
    body = rawBody ? (JSON.parse(rawBody) as typeof body) : {};
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

    // Partner commission (best-effort). Never block webhook response.
    try {
      const computed = await computeCreditPurchaseCommission({
        driverId: intent.driver_id,
        amountFcfa: intent.amount_fcfa ?? 0,
        reference: ref,
      });
      if (computed.eligible) {
        const row = await createPartnerCommission({
          partnerId: computed.partnerId,
          driverId: intent.driver_id,
          amountFcfa: computed.amountFcfa,
          reference: ref,
        });
        const payout = await tryWavePayout({
          partnerId: computed.partnerId,
          amountFcfa: computed.amountFcfa,
          reference: row.id,
        });
        if (payout.ok) {
          await supabaseAdmin
            .from("partner_commissions")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("id", row.id);
        }
      }
    } catch {
      // ignore commission errors
    }
  } else {
    await supabaseAdmin
      .from("payment_intents")
      .update({ status: "failed" })
      .eq("id", ref);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
