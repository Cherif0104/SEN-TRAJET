import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

type UnknownRecord = Record<string, unknown>;

export type WaveCheckoutEvent = {
  eventId: string;
  eventType: string;
  clientReference: string | null;
  transactionId: string | null;
  paymentStatus: string;
  outcome: "succeeded" | "failed" | "ignored";
  rawData: UnknownRecord;
};

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function verifyWaveWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): boolean {
  if (!params.secret || !params.signatureHeader) return false;

  const parts = params.signatureHeader.split(",").map((part) => part.trim());
  const timestampValue = parts
    .find((part) => part.startsWith("t="))
    ?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter((value) => /^[a-f0-9]{64}$/i.test(value));
  const timestamp = Number(timestampValue);
  if (!Number.isInteger(timestamp) || !signatures.length) return false;

  const nowSeconds = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = params.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (Math.abs(nowSeconds - timestamp) > tolerance) return false;

  const expected = createHmac("sha256", params.secret)
    .update(`${timestamp}${params.rawBody}`, "utf8")
    .digest();

  return signatures.some((signature) => {
    const candidate = Buffer.from(signature, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

export function parseWaveCheckoutEvent(rawBody: string): WaveCheckoutEvent | null {
  let root: UnknownRecord;
  try {
    root = record(JSON.parse(rawBody));
  } catch {
    return null;
  }
  const data = record(root.data);
  const eventId = optionalString(root.id);
  if (!eventId) return null;

  const paymentStatus =
    optionalString(data.payment_status) ??
    optionalString(data.checkout_status) ??
    optionalString(root.payment_status) ??
    optionalString(root.checkout_status) ??
    "";
  const normalized = paymentStatus.toLowerCase();
  const succeeded = ["succeeded", "complete", "completed", "paid"].includes(normalized);
  const failed = ["failed", "cancelled", "canceled", "expired"].includes(normalized);

  return {
    eventId,
    eventType: optionalString(root.type) ?? "unknown",
    clientReference:
      optionalString(data.client_reference) ?? optionalString(root.client_reference),
    transactionId:
      optionalString(data.transaction_id) ??
      optionalString(data.id) ??
      optionalString(root.transaction_id),
    paymentStatus: normalized,
    outcome: succeeded ? "succeeded" : failed ? "failed" : "ignored",
    rawData: data,
  };
}
