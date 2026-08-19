import { supabase } from "@/lib/supabase";

export type BusinessRule = {
  id: string;
  category: string;
  rule_key: string;
  label: string;
  value_json: unknown;
  unit: string | null;
  is_active: boolean;
  notes: string | null;
};

const FALLBACK: Omit<BusinessRule, "id">[] = [
  { category: "cancellation", rule_key: "fee_over_6h_percent", label: "Annulation > 6h", value_json: 0, unit: "percent", is_active: true, notes: null },
  { category: "cancellation", rule_key: "fee_4h_to_6h_percent", label: "Annulation 4h–6h", value_json: 30, unit: "percent", is_active: true, notes: null },
  { category: "cancellation", rule_key: "fee_under_2h_percent", label: "Annulation < 2h", value_json: 50, unit: "percent", is_active: true, notes: null },
  { category: "cancellation", rule_key: "fee_2h_to_4h_percent", label: "Annulation 2h–4h (à décider)", value_json: null, unit: "percent", is_active: true, notes: "OPEN D-01" },
  { category: "waiting", rule_key: "free_minutes", label: "Attente gratuite", value_json: 30, unit: "minutes", is_active: true, notes: null },
  { category: "waiting", rule_key: "fee_per_block_fcfa", label: "Frais par tranche", value_json: 2500, unit: "fcfa", is_active: true, notes: null },
  { category: "waiting", rule_key: "block_minutes", label: "Durée d'une tranche", value_json: 30, unit: "minutes", is_active: true, notes: null },
  { category: "pricing", rule_key: "interurbain_min_fcfa", label: "Minimum interurbain", value_json: 30000, unit: "fcfa", is_active: true, notes: null },
  { category: "payment", rule_key: "wave_checkout_url", label: "Lien Wave", value_json: "https://pay.wave.com/m/M_sn_Sc0CT6Qo7LkY/c/sn/", unit: "url", is_active: true, notes: null },
  { category: "contact", rule_key: "whatsapp_phone", label: "WhatsApp", value_json: "221788324069", unit: "phone", is_active: true, notes: null },
  { category: "vehicle_partner", rule_key: "min_monthly_fcfa", label: "Contrat exploitation à partir de", value_json: 500000, unit: "fcfa", is_active: true, notes: "Pas un rendement garanti" },
];

export async function listBusinessRules(category?: string): Promise<BusinessRule[]> {
  try {
    let query = supabase.from("business_rules").select("*").eq("is_active", true).order("category").order("rule_key");
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error || !data?.length) {
      return FALLBACK.filter((r) => !category || r.category === category).map((r, i) => ({
        ...r,
        id: `fallback-${i}`,
      }));
    }
    return data as BusinessRule[];
  } catch {
    return FALLBACK.filter((r) => !category || r.category === category).map((r, i) => ({
      ...r,
      id: `fallback-${i}`,
    }));
  }
}

export function ruleNumber(rules: BusinessRule[], category: string, key: string, fallback: number): number {
  const rule = rules.find((r) => r.category === category && r.rule_key === key);
  if (!rule || rule.value_json === null || rule.value_json === "null") return fallback;
  const n = Number(rule.value_json);
  return Number.isFinite(n) ? n : fallback;
}

export function ruleNullableNumber(rules: BusinessRule[], category: string, key: string): number | null {
  const rule = rules.find((r) => r.category === category && r.rule_key === key);
  if (!rule || rule.value_json === null || rule.value_json === "null") return null;
  const n = Number(rule.value_json);
  return Number.isFinite(n) ? n : null;
}

export function ruleString(rules: BusinessRule[], category: string, key: string, fallback: string): string {
  const rule = rules.find((r) => r.category === category && r.rule_key === key);
  if (!rule || rule.value_json == null) return fallback;
  return String(rule.value_json).replace(/^"|"$/g, "");
}

export function ruleBoolean(rules: BusinessRule[], category: string, key: string, fallback: boolean): boolean {
  const rule = rules.find((r) => r.category === category && r.rule_key === key);
  if (!rule || rule.value_json == null) return fallback;
  if (typeof rule.value_json === "boolean") return rule.value_json;
  return String(rule.value_json).toLowerCase() === "true";
}

export async function updateBusinessRuleValue(id: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from("business_rules")
    .update({ value_json: value, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
