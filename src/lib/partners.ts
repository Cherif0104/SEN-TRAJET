import { supabase } from "@/lib/supabase";

export type Partner = {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  invite_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PartnerCommission = {
  id: string;
  partner_id: string;
  driver_id: string;
  type: "credit_purchase" | "trip_completed";
  amount_fcfa: number;
  reference: string | null;
  status: "pending" | "paid";
  paid_at: string | null;
  created_at: string;
  driver?: { full_name: string | null };
};

export type CommissionConfig = {
  id: string;
  scope: "global" | "partner" | "region" | string;
  partner_id: string | null;
  region: string | null;
  platform_percent: number;
  partner_percent: number;
  active_from: string;
  active_to: string | null;
};

/** Génère un code d'invitation unique (8 caractères alphanumériques). */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** Récupère le partenaire lié à l'utilisateur connecté. */
export async function getPartnerByUserId(userId: string): Promise<Partner | null> {
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Récupère les chauffeurs liés à un partenaire. */
export async function getPartnerDrivers(partnerId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, created_at")
    .eq("partner_id", partnerId)
    .eq("role", "driver")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Récupère les commissions d'un partenaire. */
export async function getPartnerCommissions(
  partnerId: string,
  options?: { status?: "pending" | "paid"; limit?: number }
) {
  let q = supabase
    .from("partner_commissions")
    .select("*, driver:profiles!driver_id(full_name)")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });
  if (options?.status) q = q.eq("status", options.status);
  if (options?.limit) q = q.limit(options.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PartnerCommission[];
}

export async function getCommissionConfig(partnerId?: string): Promise<CommissionConfig | null> {
  let q = supabase
    .from("commission_configs")
    .select("*")
    .is("active_to", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (partnerId) q = q.eq("partner_id", partnerId);
  const { data, error } = await q.maybeSingle();
  if (error) return null;
  return (data as CommissionConfig) ?? null;
}

export async function createCommissionConfig(row: {
  scope?: "global" | "partner" | "region";
  partnerId?: string | null;
  region?: string | null;
  platformPercent: number;
  partnerPercent: number;
}): Promise<CommissionConfig> {
  const { data, error } = await supabase
    .from("commission_configs")
    .insert({
      scope: row.scope ?? "global",
      partner_id: row.partnerId ?? null,
      region: row.region ?? null,
      platform_percent: row.platformPercent,
      partner_percent: row.partnerPercent,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CommissionConfig;
}

/** Crée le profil partenaire (après inscription, depuis l'espace partenaire). */
export type PartnerInsert = {
  user_id: string;
  company_name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  invite_code: string;
};

export async function createPartner(row: PartnerInsert): Promise<Partner> {
  const { data, error } = await supabase
    .from("partners")
    .insert({
      user_id: row.user_id,
      company_name: row.company_name,
      contact_name: row.contact_name ?? null,
      phone: row.phone ?? null,
      email: row.email ?? null,
      invite_code: row.invite_code,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Met à jour les infos du partenaire (raison sociale, contact, téléphone, email). */
export async function updatePartner(
  partnerId: string,
  updates: { company_name?: string; contact_name?: string | null; phone?: string | null; email?: string | null }
): Promise<Partner> {
  const { data, error } = await supabase
    .from("partners")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", partnerId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Vérifie qu'un code d'invitation est valide et retourne l'id partenaire (pour lier un chauffeur). */
export async function getPartnerIdByInviteCode(inviteCode: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("partners")
    .select("id")
    .eq("invite_code", inviteCode.trim().toUpperCase())
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}
