const SENEGAL_PREFIX = "+221";

/**
 * Normalise un numéro saisi en format Sénégal +221 XX XXX XX XX.
 * Accepte 77, 76, 78, 70... (9 chiffres après 221).
 */
export function formatSenegalPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("6"))) {
    return `${SENEGAL_PREFIX} ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  if (digits.length === 11 && digits.startsWith("221")) {
    return `${SENEGAL_PREFIX} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`;
  }
  return input.trim();
}

/**
 * Retourne le numéro au format E.164 pour Supabase (ex: +221771234567).
 */
export function toE164Senegal(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("6"))) {
    return `${SENEGAL_PREFIX}${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("221")) {
    return `+${digits}`;
  }
  if (input.startsWith("+221") && digits.length >= 12) {
    return `+${digits.slice(0, 12)}`;
  }
  return null;
}

export function isValidSenegalPhone(input: string): boolean {
  return toE164Senegal(input) !== null;
}
