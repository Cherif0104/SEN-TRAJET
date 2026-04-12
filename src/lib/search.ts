export function normalizeSenegalText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function textIncludesNormalized(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  return normalizeSenegalText(haystack).includes(normalizeSenegalText(needle));
}

export function textEqualsNormalized(a: string, b: string): boolean {
  return normalizeSenegalText(a) === normalizeSenegalText(b);
}
