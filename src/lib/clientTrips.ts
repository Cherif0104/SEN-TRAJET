import { supabase } from "@/lib/supabase";

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
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Connectez-vous pour consulter vos trajets.");

  const response = await fetch("/api/compte/trajets", {
    cache: "no-store",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const payload = (await response.json().catch(() => ({}))) as {
    trips?: ClientTrip[];
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || "Impossible de charger vos trajets.");
  }
  return payload.trips ?? [];
}
