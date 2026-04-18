"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

const realtimeOff =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_SUPABASE_REALTIME === "false";
import { getProposalsForRequest, type Proposal } from "@/lib/proposals";

export function useProposals(requestId: string | null) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const data = await getProposalsForRequest(requestId);
      setProposals(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  // Realtime subscription for new proposals
  useEffect(() => {
    if (!requestId || realtimeOff) return;

    const channel = supabase
      .channel(`proposals:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "proposals",
          filter: `request_id=eq.${requestId}`,
        },
        () => {
          void refreshRef.current();
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
  }, [requestId]);

  return { proposals, loading, refresh };
}
