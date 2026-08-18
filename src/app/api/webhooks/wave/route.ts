import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getWaveWebhookSecret, timingSafeEqual } from "@/lib/wave";

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

/**
 * Webhook Wave : appelé par Wave quand le paiement d'une réservation (client ou partenaire)
 * est complété ou échoue. Le body contient client_reference (id de la ligne `payments`) et
 * un statut (checkout_status ou payment_status).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text().catch(() => "");
  const signatureOk = await verifyWaveSignature(request, rawBody);
  if (!signatureOk) {
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

  const status = body.payment_status ?? body.checkout_status ?? "";
  const succeeded = status === "succeeded" || status === "complete";

  const { data: bookingPayment, error: bookingPaymentErr } = await supabaseAdmin
    .from("payments")
    .select("id, booking_id, status")
    .eq("id", ref)
    .maybeSingle();

  if (bookingPaymentErr || !bookingPayment) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (["pending", "initiated", "created"].includes(bookingPayment.status)) {
    if (succeeded) {
      await supabaseAdmin
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", bookingPayment.id);

      const { data: booking } = await supabaseAdmin
        .from("bookings")
        .select("status")
        .eq("id", bookingPayment.booking_id)
        .maybeSingle();

      const prePaymentStatuses = [
        "demande_recue",
        "demande",
        "info_demandee",
        "devis_envoye",
        "devis_accepte",
        "en_attente_de_paiement",
      ];
      if (booking && prePaymentStatuses.includes(booking.status)) {
        await supabaseAdmin
          .from("bookings")
          .update({ status: "chauffeur_a_assigner", updated_at: new Date().toISOString() })
          .eq("id", bookingPayment.booking_id);
        await supabaseAdmin.from("booking_status_history").insert({
          booking_id: bookingPayment.booking_id,
          from_status: booking.status,
          to_status: "chauffeur_a_assigner",
          note: "Paiement Wave confirmé automatiquement (webhook)",
        });
      }
    } else {
      await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", bookingPayment.id);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
