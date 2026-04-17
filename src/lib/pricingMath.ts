export function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export function roundFcfa(value: number): number {
  return Math.round(clampNonNegative(value));
}

export function percentOf(base: number, percent: number): number {
  return (clampNonNegative(base) * clampNonNegative(percent)) / 100;
}
