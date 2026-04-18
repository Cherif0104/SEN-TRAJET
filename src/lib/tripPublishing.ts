import { supabase } from "@/lib/supabase";
import { getWallet } from "@/lib/wallet";

export const FREE_TRIP_PUBLICATIONS = 20;
export const TRIP_PUBLICATION_COST_CREDITS = 1;
export const TRIP_PUBLICATION_COST_FCFA = 1000;
export const TRIP_PUBLICATION_MAX_LOAN_CREDITS = 2;

export type DriverTripPublishingState = {
  tripsPublishedCount: number;
  freeTripsRemaining: number;
  walletBalanceCredits: number;
  paidTripsCount: number;
  loanUsedTrips: number;
  loanRemainingTrips: number;
  canPublish: boolean;
};

export async function getDriverTripPublishingState(
  driverId: string
): Promise<DriverTripPublishingState> {
  const [{ count }, wallet] = await Promise.all([
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("driver_id", driverId),
    getWallet(driverId),
  ]);

  const tripsPublishedCount = Number(count ?? 0);
  const freeTripsRemaining = Math.max(0, FREE_TRIP_PUBLICATIONS - tripsPublishedCount);
  const paidTripsCount = Math.max(0, tripsPublishedCount - FREE_TRIP_PUBLICATIONS);
  const walletBalanceCredits = Number(wallet?.balance_credits ?? 0);
  const loanUsedTrips = Math.max(0, -walletBalanceCredits);
  const loanRemainingTrips = Math.max(0, TRIP_PUBLICATION_MAX_LOAN_CREDITS - loanUsedTrips);
  const canPublish = freeTripsRemaining > 0 || walletBalanceCredits > -TRIP_PUBLICATION_MAX_LOAN_CREDITS;

  return {
    tripsPublishedCount,
    freeTripsRemaining,
    walletBalanceCredits,
    paidTripsCount,
    loanUsedTrips,
    loanRemainingTrips,
    canPublish,
  };
}

