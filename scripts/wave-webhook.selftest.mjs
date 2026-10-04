import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  parseWaveCheckoutEvent,
  verifyWaveWebhookSignature,
} from "../src/lib/waveWebhook.ts";

const secret = "wave_sn_WHS_test";
const timestamp = 1_667_920_421;
const rawBody = JSON.stringify({
  id: "EV_test",
  type: "checkout.session.completed",
  data: {
    id: "cos_test",
    client_reference: "rental:booking-123",
    payment_status: "succeeded",
    checkout_status: "complete",
    transaction_id: "T_test",
  },
});
const signature = createHmac("sha256", secret)
  .update(`${timestamp}${rawBody}`)
  .digest("hex");

assert.equal(
  verifyWaveWebhookSignature({
    rawBody,
    signatureHeader: `t=${timestamp},v1=${signature}`,
    secret,
    nowSeconds: timestamp + 60,
  }),
  true,
);
assert.equal(
  verifyWaveWebhookSignature({
    rawBody,
    signatureHeader: `t=${timestamp},v1=${"0".repeat(64)},v1=${signature}`,
    secret,
    nowSeconds: timestamp,
  }),
  true,
  "La rotation de secret peut fournir plusieurs signatures v1",
);
assert.equal(
  verifyWaveWebhookSignature({
    rawBody,
    signatureHeader: `t=${timestamp},v1=${signature}`,
    secret,
    nowSeconds: timestamp + 301,
  }),
  false,
  "Un webhook vieux de plus de cinq minutes doit être rejeté",
);
assert.equal(
  verifyWaveWebhookSignature({
    rawBody: `${rawBody} `,
    signatureHeader: `t=${timestamp},v1=${signature}`,
    secret,
    nowSeconds: timestamp,
  }),
  false,
  "Toute modification du corps doit invalider la signature",
);

assert.deepEqual(parseWaveCheckoutEvent(rawBody), {
  eventId: "EV_test",
  eventType: "checkout.session.completed",
  clientReference: "rental:booking-123",
  transactionId: "T_test",
  paymentStatus: "succeeded",
  outcome: "succeeded",
  rawData: {
    id: "cos_test",
    client_reference: "rental:booking-123",
    payment_status: "succeeded",
    checkout_status: "complete",
    transaction_id: "T_test",
  },
});

const pending = parseWaveCheckoutEvent(
  JSON.stringify({
    id: "EV_pending",
    type: "checkout.session.updated",
    data: { client_reference: "payment-123", payment_status: "processing" },
  }),
);
assert.equal(pending?.outcome, "ignored");
assert.equal(parseWaveCheckoutEvent("{"), null);

console.log("Wave webhook self-test: OK");
