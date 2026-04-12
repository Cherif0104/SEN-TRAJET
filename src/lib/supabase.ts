import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

// Placeholder au build si les variables sont absentes (évite "supabaseUrl is required")
const url = supabaseUrl || "https://placeholder.supabase.co";
const key = supabasePublishableKey || "placeholder-key";

export const supabase: SupabaseClient = createClient(url, key);
