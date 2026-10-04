import { authApiFetch } from "@/lib/authSession";

export type ClientTripKind =
  | "platform"
  | "allo_dakar"
  | "allo_dakar_request"
  | "voyager"
  | "rental"
  | "my_driver";

export type ClientTripLifecycle = "upcoming" | "past" | "cancelled";

export type ClientTrip = {
  kind: ClientTripKind;
  id: string;
  reference: string;
  serviceLabel: string;
  title: string;
  subtitle: string | null;
  startsAt: string;
  status: string;
  statusLabel: string;
  lifecycle: ClientTripLifecycle;
  amountFcfa: number | null;
  detailHref: string;
};

export async function listClientTrips(): Promise<ClientTrip[]> {
  const payload = await authApiFetch<{ trips?: ClientTrip[]; error?: string }>(
    "/api/compte/trajets",
    { cache: "no-store" },
    { fallbackError: "Impossible de charger vos trajets." },
  );
  return payload.trips ?? [];
}
