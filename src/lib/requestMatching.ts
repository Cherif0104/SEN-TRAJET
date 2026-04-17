import type { TripRequest } from "@/lib/requests";

type MatchingContext = {
  profileCity: string;
  vehicleCategories: Set<string>;
};

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function locationScore(req: TripRequest, profileCity: string): number {
  if (!profileCity) return 1;
  const from = normalize(req.from_city);
  const to = normalize(req.to_city);
  if (from.includes(profileCity)) return 3;
  if (to.includes(profileCity)) return 2;
  return 1;
}

function categoryScore(req: TripRequest, categories: Set<string>): number {
  if (req.trip_type === "colis" && categories.has("utilitaire")) return 3;
  if (
    (req.trip_type === "interurbain_location" || req.trip_type === "interurbain_covoiturage") &&
    (categories.has("confort") || categories.has("premium") || categories.has("standard"))
  ) {
    return 2;
  }
  return 1;
}

function budgetScore(req: TripRequest): number {
  if (!req.budget_fcfa) return 1;
  if (req.budget_fcfa >= 10000) return 3;
  if (req.budget_fcfa >= 6000) return 2;
  return 1;
}

export function sortRequestsForDriver(
  requests: TripRequest[],
  context: MatchingContext
): TripRequest[] {
  const profileCity = normalize(context.profileCity);
  return requests
    .map((req) => {
      const score =
        locationScore(req, profileCity) * 100 +
        categoryScore(req, context.vehicleCategories) * 10 +
        budgetScore(req);
      return { req, score };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.req.departure_date.localeCompare(b.req.departure_date) ||
        a.req.created_at.localeCompare(b.req.created_at)
    )
    .map((x) => x.req);
}
