import { createClient } from "@supabase/supabase-js";

const projectUrl = "https://ootvzknyhkhxroadnclh.supabase.co";
const projectPublishableKey = "sb_publishable_CVck2hQokLG7zquxfximUA_DeuY6ftN";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || projectUrl;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || projectPublishableKey;

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: { eventsPerSecond: 10 }
  }
});
