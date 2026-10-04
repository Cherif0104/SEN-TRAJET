"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listClientTrips, type ClientTrip } from "@/lib/clientTrips";

export function useClientTrips() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ClientTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRows(await listClientTrips());
    } catch (cause) {
      setRows([]);
      setError(
        cause instanceof Error ? cause.message : "Impossible de charger vos trajets.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}
