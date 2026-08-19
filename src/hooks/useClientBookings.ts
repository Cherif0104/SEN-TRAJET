"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  ensureClientForUser,
  listPlatformBookings,
  type PlatformBooking,
} from "@/lib/platformOps";

export function useClientBookings() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<PlatformBooking[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setRows([]);
      setClientId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const id = await ensureClientForUser({
        userId: user.id,
        fullName: profile?.full_name,
        phone: profile?.phone,
        email: user.email,
      });
      setClientId(id);
      const bookings = await listPlatformBookings();
      setRows(bookings.filter((booking) => booking.client_id === id));
    } catch (bookingError) {
      setRows([]);
      setError(
        bookingError instanceof Error
          ? bookingError.message
          : "Impossible de charger les réservations.",
      );
    } finally {
      setLoading(false);
    }
  }, [profile?.full_name, profile?.phone, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, clientId, loading, error, refresh };
}
