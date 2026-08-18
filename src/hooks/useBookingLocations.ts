"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { fetchLatestBookingLocations, type BookingLocationRow } from "@/lib/bookingLocations";

const realtimeOff =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_REALTIME === "false";

interface UseBookingLocationsResult {
  clientPosition: BookingLocationRow | null;
  driverPosition: BookingLocationRow | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBookingLocations(bookingId: string | null): UseBookingLocationsResult {
  const [clientPosition, setClientPosition] = useState<BookingLocationRow | null>(null);
  const [driverPosition, setDriverPosition] = useState<BookingLocationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!bookingId) {
      setClientPosition(null);
      setDriverPosition(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { client, driver } = await fetchLatestBookingLocations(bookingId);
      setClientPosition(client);
      setDriverPosition(driver);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement de la position.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    if (!bookingId || realtimeOff) return;

    const channel = supabase
      .channel(`booking_locations:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "booking_locations",
          filter: `booking_id=eq.${bookingId}`,
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
  }, [bookingId]);

  return { clientPosition, driverPosition, loading, error, refetch };
}
