import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  SENTRAJET_SUPABASE_ANON_KEY,
  SENTRAJET_SUPABASE_URL,
} from "@/lib/supabaseConfig";

/**
 * Vérifie le Bearer JWT via GoTrue du projet officiel.
 * On n’utilise PAS le service_role ici : une clé admin mal configurée
 * sur Vercel ferait échouer tous les appels alors que la session client
 * est parfaitement valide.
 */
export async function getUserFromBearer(
  authorizationHeader: string | null,
): Promise<User | null> {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const verifier = createClient(SENTRAJET_SUPABASE_URL, SENTRAJET_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await verifier.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export function unauthorizedJson(message = "Connexion requise.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function expiredSessionJson(
  message = "Votre session a expiré. Reconnectez-vous.",
) {
  return NextResponse.json({ error: message }, { status: 401 });
}
