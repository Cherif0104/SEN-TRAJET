"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
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

  // Realtime subscription for new proposals
  useEffect(() => {
    if (!requestId) return;

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
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, refresh]);

  return { proposals, loading, refresh };
}
