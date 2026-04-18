/**
 * Erreurs PostgREST quand la base n’a pas encore les migrations (table/colonne absente).
 * @see https://postgrest.org/en/stable/errors.html
 */
export function isMissingSchemaObjectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; details?: string };
  if (e.code === "PGRST204" || e.code === "PGRST205" || e.code === "42P01") return true;
  const m = `${e.message ?? ""} ${e.details ?? ""}`;
  return m.includes("schema cache") || m.includes("Could not find the");
}
