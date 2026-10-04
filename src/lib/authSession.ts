import { supabase } from "@/lib/supabase";

const REFRESH_SKEW_MS = 90_000;

/**
 * Retourne un access token encore valide pour les appels API Bearer.
 * Valide d’abord auprès du serveur Auth (`getUser`) puis rafraîchit si besoin.
 */
export async function requireAccessToken(): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("Connectez-vous pour continuer.");
  }

  let {
    data: { session },
  } = await supabase.auth.getSession();

  const expiresAtMs = (session?.expires_at ?? 0) * 1000;
  const needsRefresh =
    !session?.access_token || expiresAtMs <= Date.now() + REFRESH_SKEW_MS;

  if (needsRefresh) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.data.session?.access_token) {
      return refreshed.data.session.access_token;
    }
    // Refresh KO mais le JWT local n’est pas encore expiré : on tente quand même.
    if (session?.access_token && expiresAtMs > Date.now()) {
      return session.access_token;
    }
    throw new Error("Session expirée. Reconnectez-vous.");
  }

  return session.access_token;
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

  const buildHeaders = (accessToken: string | null): HeadersInit => {
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    } else {
      headers.delete("Authorization");
    }
    return headers;
  };

  const first = await fetch(path, {
    ...init,
    headers: buildHeaders(token),
  });

  if (first.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) {
      const failed = (await first.json().catch(() => ({}))) as { error?: string };
      throw new Error(
        failed.error || "Session expirée. Reconnectez-vous.",
      );
    }
    const retry = await fetch(path, {
      ...init,
      headers: buildHeaders(data.session.access_token),
    });
    const retryPayload = (await retry.json().catch(() => ({}))) as T & {
      error?: string;
    };
    if (!retry.ok) {
      throw new Error(
        retryPayload.error ||
          options?.fallbackError ||
          "Une erreur est survenue.",
      );
    }
    return retryPayload;
  }

  const payload = (await first.json().catch(() => ({}))) as T & { error?: string };
  if (!first.ok) {
    throw new Error(
      payload.error || options?.fallbackError || "Une erreur est survenue.",
    );
  }
  return payload;
}

/** Appels publics (catalogue, recherche) — auth optionnelle si dispo. */
export async function publicApiFetch<T>(
  path: string,
  init?: RequestInit,
  options?: { fallbackError?: string },
): Promise<T> {
  return authApiFetch<T>(path, init, {
    optional: true,
    fallbackError: options?.fallbackError,
  });
}
