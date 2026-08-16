import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSentrajetSupabasePublicConfig } from "@/lib/supabaseConfig";

const { url, key } = getSentrajetSupabasePublicConfig();

export const supabase: SupabaseClient = createClient(url, key);
