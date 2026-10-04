import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Garantit une ligne `clients` pour l’utilisateur authentifié.
 * Sans ça, les courses live partent avec `client_id` null et disparaissent
 * de Mes trajets / du suivi sous RLS.
 */
export async function ensureClientIdForAuthUser(
  user: User,
  extras?: { fullName?: string | null; phone?: string | null },
): Promise<string> {
  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    extras?.fullName?.trim() ||
    String(meta.full_name ?? meta.name ?? "").trim() ||
    user.email?.split("@")[0] ||
    "Client SentraJet";
  const phone =
    extras?.phone?.trim() ||
    String(meta.phone ?? "").trim() ||
    null;

  const { data, error } = await admin
    .from("clients")
    .insert({
      user_id: user.id,
      full_name: fullName,
      phone,
      email: user.email ?? null,
      client_type: "particulier",
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505" || /duplicate key|clients_user_id_key/i.test(error.message || "")) {
      const { data: retry } = await admin
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (retry?.id) return retry.id as string;
    }
    throw error;
  }
  return data.id as string;
}
