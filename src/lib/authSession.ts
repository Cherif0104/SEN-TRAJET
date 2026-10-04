import { supabase } from "@/lib/supabase";

const REFRESH_SKEW_MS = 90_000;

/**
 * Retourne un access token encore valide pour les appels API Bearer.
 * `getSession()` lit seulement le stockage local : sans ce garde-fou, un JWT
 * périmé produit « Session expirée » côté serveur alors que l’UI croit encore
 * que l’utilisateur est connecté.
 */
export async function requireAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Connectez-vous pour continuer.");
  }

  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  if (expiresAtMs > Date.now() + REFRESH_SKEW_MS) {
    return session.access_token;
  }

  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session?.access_token) {
    throw new Error("Session expirée. Reconnectez-vous.");
  }
  return data.session.access_token;
}

export async function authApiFetch<T>(
  path: string,
  init?: RequestInit,
  options?: { optional?: boolean; fallbackError?: string },
): Promise<T> {
  let token: string | null = null;
  try {
    token = await requireAccessToken();
  } catch (cause) {
    if (!options?.optional) throw cause;
  }

  const first = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (first.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) {
      throw new Error("Session expirée. Reconnectez-vous.");
    }
    const retry = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
        ...(init?.headers ?? {}),
      },
    });
    const retryPayload = (await retry.json().catch(() => ({}))) as T & { error?: string };
    if (!retry.ok) {
      throw new Error(
        retryPayload.error || options?.fallbackError || "Session expirée. Reconnectez-vous.",
      );
    }
    return retryPayload;
  }

  const payload = (await first.json().catch(() => ({}))) as T & { error?: string };
  if (!first.ok) {
    throw new Error(payload.error || options?.fallbackError || "Une erreur est survenue.");
  }
  return payload;
}
