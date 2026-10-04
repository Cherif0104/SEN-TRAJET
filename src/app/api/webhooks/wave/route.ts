import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getWaveApiKey, getWaveWebhookSecret } from "@/lib/wave";
import {
  parseWaveCheckoutEvent,
  verifyWaveWebhookSignature,
  type WaveCheckoutEvent,
} from "@/lib/waveWebhook";

/**
 * Reversement au chauffeur Allo Dakar (best-effort, ne bloque jamais la confirmation du
 * paiement client). La commission a déjà été retenue au moment de book_allo_dakar_seats — on ne
 * reverse ici que driver_payout_fcfa, jamais le montant total.
 */
async function tryAlloDakarDriverPayout(params: {
  alloDakarDriverId: string;
  amountFcfa: number;
  reference: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = getWaveApiKey();
  if (!apiKey || params.amountFcfa <= 0) return { ok: false, error: "not_configured" };

  const { data: driver } = await supabaseAdmin
    .from("allo_dakar_drivers")
    .select("wave_payout_mobile, wave_payout_name")
    .eq("id", params.alloDakarDriverId)
    .maybeSingle();
  if (!driver?.wave_payout_mobile) return { ok: false, error: "missing_mobile" };

  try {
    const res = await fetch("https://api.wave.com/v1/payout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": `allo_dakar_payout_${params.reference}`,
      },
      body: JSON.stringify({
        currency: "XOF",
        receive_amount: String(Math.max(0, Math.round(params.amountFcfa))),
        mobile: driver.wave_payout_mobile,
        name: driver.wave_payout_name ?? undefined,
        client_reference: params.reference,
        payment_reason: "Reversement course Allo Dakar SentraJet",
      }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false, error: "network_error" };
  }
}

/**
 * Dispatch automatique (véhicule puis chauffeur disponibles) dès confirmation de paiement.
 * Best-effort : ne bloque jamais la réponse du webhook. Si l'interrupteur business_rules
 * est désactivé, ou si aucun véhicule/chauffeur ne correspond, la course reste visible
 * dans /ops/dispatch pour une affectation manuelle.
 */
async function tryAutoDispatch(bookingId: string): Promise<void> {
  try {
    const { data: rule } = await supabaseAdmin
      .from("business_rules")
      .select("value_json")
      .eq("category", "dispatch")
      .eq("rule_key", "auto_dispatch_actif")
      .maybeSingle();
    const active = rule ? rule.value_json === true || rule.value_json === "true" : true;
    if (!active) return;

    await supabaseAdmin.rpc("auto_dispatch_booking", { p_booking_id: bookingId });
  } catch {
    // best-effort : la course reste "chauffeur_a_assigner" pour une affectation manuelle côté Ops.
  }
}

async function claimWaveEvent(event: WaveCheckoutEvent): Promise<"claimed" | "duplicate"> {
  const { error } = await supabaseAdmin.from("wave_webhook_events").insert({
    event_id: event.eventId,
    event_type: event.eventType,
    client_reference: event.clientReference,
    payment_status: event.paymentStatus || null,
    transaction_id: event.transactionId,
    payload: event.rawData,
  });
  if (!error) return "claimed";
  if (error.code !== "23505") throw error;

  const { data: existing, error: readError } = await supabaseAdmin
    .from("wave_webhook_events")
    .select("processing_status, attempts")
    .eq("event_id", event.eventId)
    .single();
  if (readError) throw readError;
  if (existing.processing_status !== "failed") return "duplicate";

  const { error: retryError } = await supabaseAdmin
    .from("wave_webhook_events")
    .update({
      processing_status: "received",
      attempts: Number(existing.attempts) + 1,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", event.eventId)
    .eq("processing_status", "failed");
  if (retryError) throw retryError;
  return "claimed";
}

async function finishWaveEvent(
  eventId: string,
  processingStatus: "processed" | "ignored",
  result: Record<string, unknown>,
) {
  await supabaseAdmin
    .from("wave_webhook_events")
    .update({
      processing_status: processingStatus,
      result,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);
  return NextResponse.json({ received: true, ...result }, { status: 200 });
}

/**
 * Webhook Wave : appelé par Wave quand le paiement d'une réservation (client ou partenaire)
 * est complété ou échoue. Les données métier sont dans `data` selon le contrat Wave.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text().catch(() => "");
  const secret = getWaveWebhookSecret();
  if (!secret) {
    return NextResponse.json({ error: "webhook_secret_missing" }, { status: 500 });
  }
  const signatureHeader =
    request.headers.get("Wave-Signature") ??
    request.headers.get("wave-signature") ??
    "";
  if (
    !verifyWaveWebhookSignature({
      rawBody,
      signatureHeader,
      secret,
    })
  ) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const event = parseWaveCheckoutEvent(rawBody);
  if (!event) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  try {
    if ((await claimWaveEvent(event)) === "duplicate") {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }
    if (!event.clientReference || event.outcome === "ignored") {
      return finishWaveEvent(event.eventId, "ignored", {
        reason: event.clientReference ? "non_terminal_status" : "missing_client_reference",
      });
    }

    const ref = event.clientReference;
    const succeeded = event.outcome === "succeeded";

    if (ref.startsWith("rental:")) {
    const rentalBookingId = ref.slice("rental:".length);
    const { data: booking } = await supabaseAdmin
      .from("rental_bookings")
      .select("id, payment_status")
      .eq("id", rentalBookingId)
      .maybeSingle();
    if (!booking || !["pending", "initiated"].includes(booking.payment_status)) {
      return finishWaveEvent(event.eventId, "ignored", {
        entity: "rental_booking",
        entityId: rentalBookingId,
        reason: "not_pending",
      });
    }
    await supabaseAdmin
      .from("rental_bookings")
      .update(
        succeeded
          ? {
              payment_status: "paid",
              status: "confirmed",
              paid_at: new Date().toISOString(),
              payment_provider_ref: event.transactionId,
            }
          : {
              payment_status: "failed",
              payment_provider_ref: event.transactionId,
            },
      )
      .eq("id", booking.id);
    return finishWaveEvent(event.eventId, "processed", {
      entity: "rental_booking",
      entityId: booking.id,
      outcome: event.outcome,
    });
  }

  if (ref.startsWith("alloDakar:")) {
    const alloDakarBookingId = ref.slice("alloDakar:".length);
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("allo_dakar_bookings")
      .select("id, departure_id, payment_status, driver_payout_fcfa")
      .eq("id", alloDakarBookingId)
      .maybeSingle();

    if (bookingErr || !booking || booking.payment_status !== "pending") {
      return finishWaveEvent(event.eventId, "ignored", {
        entity: "allo_dakar_booking",
        entityId: alloDakarBookingId,
        reason: "not_pending",
      });
    }

    let payout: { ok: boolean; error?: string } | null = null;
    if (succeeded) {
      await supabaseAdmin
        .from("allo_dakar_bookings")
        .update({
          payment_status: "paid",
          payment_provider_ref: event.transactionId,
        })
        .eq("id", booking.id);

      // Reversement chauffeur (best-effort, ne bloque jamais la réponse du webhook).
      try {
        const { data: departure } = await supabaseAdmin
          .from("allo_dakar_departures")
          .select("allo_dakar_driver_id")
          .eq("id", booking.departure_id)
          .maybeSingle();
        if (departure?.allo_dakar_driver_id) {
          payout = await tryAlloDakarDriverPayout({
            alloDakarDriverId: departure.allo_dakar_driver_id,
            amountFcfa: booking.driver_payout_fcfa,
            reference: booking.id,
          });
        }
      } catch (cause) {
        payout = {
          ok: false,
          error: cause instanceof Error ? cause.message : "payout_error",
        };
      }
    } else {
      await supabaseAdmin
        .from("allo_dakar_bookings")
        .update({
          payment_status: "failed",
          payment_provider_ref: event.transactionId,
        })
        .eq("id", booking.id);
    }

    return finishWaveEvent(event.eventId, "processed", {
      entity: "allo_dakar_booking",
      entityId: booking.id,
      outcome: event.outcome,
      payout,
    });
  }

  if (ref.startsWith("myDriver:")) {
    const requestId = ref.slice("myDriver:".length);
    const { data: mission } = await supabaseAdmin
      .from("my_driver_requests")
      .select("id, payment_status, status")
      .eq("id", requestId)
      .maybeSingle();
    if (
      !mission ||
      !["pending", "initiated"].includes(mission.payment_status) ||
      mission.status !== "en_attente_paiement"
    ) {
      return finishWaveEvent(event.eventId, "ignored", {
        entity: "my_driver_request",
        entityId: requestId,
        reason: "not_pending",
      });
    }
    await supabaseAdmin
      .from("my_driver_requests")
      .update(
        succeeded
          ? {
              payment_status: "paid",
              status: "confirmee",
              paid_at: new Date().toISOString(),
              payment_provider_ref: event.transactionId,
              updated_at: new Date().toISOString(),
            }
          : {
              payment_status: "failed",
              payment_provider_ref: event.transactionId,
              updated_at: new Date().toISOString(),
            },
      )
      .eq("id", mission.id);
    return finishWaveEvent(event.eventId, "processed", {
      entity: "my_driver_request",
      entityId: mission.id,
      outcome: event.outcome,
    });
  }

  if (ref.startsWith("myDriverSubscription:")) {
    const subscriptionId = ref.slice("myDriverSubscription:".length);
    const { data: subscription } = await supabaseAdmin
      .from("my_driver_subscriptions")
      .select("id, status")
      .eq("id", subscriptionId)
      .maybeSingle();
    if (!subscription || subscription.status !== "pending") {
      return finishWaveEvent(event.eventId, "ignored", {
        entity: "my_driver_subscription",
        entityId: subscriptionId,
        reason: "not_pending",
      });
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60_000);
    await supabaseAdmin
      .from("my_driver_subscriptions")
      .update(
        succeeded
          ? {
              status: "actif",
              starts_at: startsAt.toISOString(),
              ends_at: endsAt.toISOString(),
            }
          : { status: "expire" },
      )
      .eq("id", subscription.id);
    return finishWaveEvent(event.eventId, "processed", {
      entity: "my_driver_subscription",
      entityId: subscription.id,
      outcome: event.outcome,
    });
  }

  const { data: bookingPayment, error: bookingPaymentErr } = await supabaseAdmin
    .from("payments")
    .select("id, booking_id, status")
    .eq("id", ref)
    .maybeSingle();

  if (bookingPaymentErr) throw bookingPaymentErr;
  if (!bookingPayment) {
    return finishWaveEvent(event.eventId, "ignored", {
      reason: "unknown_client_reference",
      clientReference: ref,
    });
  }

  if (["pending", "initiated", "created"].includes(bookingPayment.status)) {
    if (succeeded) {
      await supabaseAdmin
        .from("payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          provider_ref: event.transactionId,
        })
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

        await tryAutoDispatch(bookingPayment.booking_id);
      }
    } else {
      await supabaseAdmin
        .from("payments")
        .update({ status: "failed", provider_ref: event.transactionId })
        .eq("id", bookingPayment.id);
    }
  } else {
    return finishWaveEvent(event.eventId, "ignored", {
      entity: "payment",
      entityId: bookingPayment.id,
      reason: "not_pending",
    });
  }

    return finishWaveEvent(event.eventId, "processed", {
      entity: "payment",
      entityId: bookingPayment.id,
      outcome: event.outcome,
    });
  } catch (error) {
    await supabaseAdmin
      .from("wave_webhook_events")
      .update({
        processing_status: "failed",
        last_error: error instanceof Error ? error.message.slice(0, 500) : "processing_error",
        updated_at: new Date().toISOString(),
      })
      .eq("event_id", event.eventId);
    console.error("[wave-webhook]", {
      eventId: event.eventId,
      eventType: event.eventType,
      error,
    });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
