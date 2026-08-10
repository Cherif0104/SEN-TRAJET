/**
 * Distances routières de référence depuis Dakar (km).
 * Valeurs médianes des fourchettes terrain — secours si API indisponible.
 * Le calcul final doit privilégier une API d’itinéraire.
 */

export const DAKAR_ROUTE_SEED_KM: Record<string, number> = {
  thies: 67,
  mbour: 90,
  saly: 90,
  diourbel: 147,
  louga: 192,
  kaolack: 195,
  "saint-louis": 240,
  "saint louis": 240,
  saintlouis: 240,
  ziguinchor: 448,
  tambacounda: 463,
  touba: 190,
  rufisque: 28,
  pikine: 15,
  aibd: 48,
  "aeroport aibd": 48,
  "aeroport blaise diagne": 48,
};

export function normalizePlaceKey(place: string): string {
  return place
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function lookupSeedDistanceKm(fromPlace: string, toPlace: string): number | null {
  const from = normalizePlaceKey(fromPlace);
  const to = normalizePlaceKey(toPlace);
  const fromIsDakar = from === "dakar" || from.startsWith("dakar ");
  const toIsDakar = to === "dakar" || to.startsWith("dakar ");

  const matchSeed = (key: string): number | null => {
    if (DAKAR_ROUTE_SEED_KM[key] != null) return DAKAR_ROUTE_SEED_KM[key];
    for (const [seed, km] of Object.entries(DAKAR_ROUTE_SEED_KM)) {
      if (key.includes(seed) || seed.includes(key)) return km;
    }
    return null;
  };

  if (fromIsDakar) {
    const km = matchSeed(to);
    if (km != null) return km;
  }
  if (toIsDakar) {
    const km = matchSeed(from);
    if (km != null) return km;
  }
  return null;
}

/** Arrondi au kilomètre supérieur (règle métier SentraJet). */
export function ceilDistanceKm(km: number): number {
  if (!Number.isFinite(km) || km <= 0) return 0;
  return Math.max(1, Math.ceil(km));
}
