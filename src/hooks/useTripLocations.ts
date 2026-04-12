"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  fetchLatestTripLocations,
  type TripLocationRow,
} from "@/lib/tripLocations";

interface UseTripLocationsResult {
  clientPosition: TripLocationRow | null;
  driverPosition: TripLocationRow | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTripLocations(tripId: string | null): UseTripLocationsResult {
  const [clientPosition, setClientPosition] = useState<TripLocationRow | null>(
    null
  );
  const [driverPosition, setDriverPosition] = useState<TripLocationRow | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!tripId) {
      setClientPosition(null);
      setDriverPosition(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { client, driver } = await fetchLatestTripLocations(tripId);
      setClientPosition(client);
      setDriverPosition(driver);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`trip_locations:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_locations",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, refetch]);

  return {
    clientPosition,
    driverPosition,
    loading,
    error,
    refetch,
  };
}
