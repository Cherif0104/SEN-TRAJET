"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getMessagesByBooking, type Message } from "@/lib/messages";

export function useMessages(bookingId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!bookingId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await getMessagesByBooking(bookingId);
      setMessages(list);
    } catch (err) {
      console.error("useMessages:", err);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase
      .channel(`messages:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  return { messages, loading, refresh };
}
