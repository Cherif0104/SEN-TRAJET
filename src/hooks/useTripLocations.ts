"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

const realtimeOff =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_SUPABASE_REALTIME === "false";
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

  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    if (!tripId || realtimeOff) return;

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
          void refetchRef.current();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          supabase.removeChannel(channel);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return {
    clientPosition,
    driverPosition,
    loading,
    error,
    refetch,
  };
}
