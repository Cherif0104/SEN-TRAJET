import { createClient } from "@supabase/supabase-js";

const projectUrl = "https://ootvzknyhkhxroadnclh.supabase.co";
const projectPublishableKey = "sb_publishable_CVck2hQokLG7zquxfximUA_DeuY6ftN";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || projectUrl;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || projectPublishableKey;

function sameOriginSupabaseFetch(input: RequestInfo | URL, init?: RequestInit) {
  if (typeof window === "undefined") return fetch(input, init);

  const sourceUrl =
    input instanceof Request
      ? input.url
      : input instanceof URL
        ? input.toString()
        : input;

  if (!sourceUrl.startsWith(url)) return fetch(input, init);

  const proxyUrl = `/api/supabase${sourceUrl.slice(url.length)}`;
  if (input instanceof Request) {
    return fetch(new Request(proxyUrl, input), init);
  }
  return fetch(proxyUrl, init);
}

export const supabase = createClient(url, key, {
  global: {
    fetch: sameOriginSupabaseFetch
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: { eventsPerSecond: 10 }
  }
});
