import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SENTRAJET_SUPABASE_URL } from "@/lib/supabaseConfig";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const key = serviceRoleKey || "placeholder-service-role-key";

/**
 * Client admin (serveur uniquement). Ne jamais utiliser côté navigateur.
 */
export const supabaseAdmin: SupabaseClient = createClient(SENTRAJET_SUPABASE_URL, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
