import "server-only";

import { supabaseAdmin } from "@/lib/supabase-admin";

function computePercentAmount(params: { amountFcfa: number; percent: number }): number {
  const pct = Number(params.percent);
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  const base = Math.max(0, Math.round(params.amountFcfa));
  return Math.max(0, Math.round((base * pct) / 100));
}

export async function computeCreditPurchaseCommission(params: {
  driverId: string;
  amountFcfa: number;
  reference: string;
}): Promise<
  | {
      eligible: false;
      reason: string;
    }
  | {
      eligible: true;
      partnerId: string;
      amountFcfa: number;
      percent: number;
    }
> {
  const { data: driver, error: driverErr } = await supabaseAdmin
    .from("profiles")
    .select("id, role, partner_id")
    .eq("id", params.driverId)
    .maybeSingle();
  if (driverErr || !driver) return { eligible: false, reason: "driver_not_found" };

  if (driver.role !== "driver") return { eligible: false, reason: "not_driver" };
  if (!driver.partner_id) return { eligible: false, reason: "no_partner" };

  const { data: partner, error: partnerErr } = await supabaseAdmin
    .from("partners")
    .select("id, is_active")
    .eq("id", driver.partner_id)
    .maybeSingle();
  if (partnerErr || !partner) return { eligible: false, reason: "partner_not_found" };
  if (!partner.is_active) return { eligible: false, reason: "partner_inactive" };

  // Prevent duplicates for this intent/reference.
  const { data: existing } = await supabaseAdmin
    .from("partner_commissions")
    .select("id")
    .eq("type", "credit_purchase")
    .eq("reference", params.reference)
    .maybeSingle();
  if (existing?.id) return { eligible: false, reason: "already_exists" };

  const { data: cfg } = await supabaseAdmin
    .from("commission_configs")
    .select("partner_percent, active_to, partner_id")
    .is("active_to", null)
    .or(`partner_id.eq.${driver.partner_id},partner_id.is.null`)
    .order("partner_id", { ascending: false }) // partner-specific first
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const percent = Number(cfg?.partner_percent ?? 0);
  const amount = computePercentAmount({ amountFcfa: params.amountFcfa, percent });
  if (amount <= 0) return { eligible: false, reason: "amount_zero" };

  return { eligible: true, partnerId: driver.partner_id, amountFcfa: amount, percent };
}

export async function createPartnerCommission(params: {
  partnerId: string;
  driverId: string;
  amountFcfa: number;
  reference: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("partner_commissions")
    .insert({
      partner_id: params.partnerId,
      driver_id: params.driverId,
      type: "credit_purchase",
      amount_fcfa: Math.max(0, Math.round(params.amountFcfa)),
      reference: params.reference,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

