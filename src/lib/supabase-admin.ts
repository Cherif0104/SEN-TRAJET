import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const url = supabaseUrl || "https://placeholder.supabase.co";
const key = serviceRoleKey || "placeholder-service-role-key";

/**
 * Client admin (serveur uniquement). Ne jamais utiliser côté navigateur.
 */
export const supabaseAdmin: SupabaseClient = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
