"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

const realtimeOff =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_SUPABASE_REALTIME === "false";

export type Notification = {
  id: string;
  user_id: string;
  channel: string;
  subject: string | null;
  body: string | null;
  status: string;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, user_id, channel, subject, body, status, entity_type, entity_id, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      // Compte réel des non-lues, indépendant de la limite d'affichage ci-dessus (sinon le badge
      // peut afficher 0 alors qu'il reste des non-lues plus anciennes que les 50 chargées).
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null),
    ]);
    if (data) {
      setNotifications(data as Notification[]);
    }
    setUnreadCount(count ?? 0);
  }, [userId]);

  const fetchRef = useRef(fetchNotifications);
  fetchRef.current = fetchNotifications;

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!userId || realtimeOff) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void fetchRef.current();
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
  }, [userId]);

  const markAsRead = useCallback(
    async (notifId: string) => {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notifId);
      fetchNotifications();
    },
    [fetchNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    fetchNotifications();
  }, [userId, fetchNotifications]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, refresh: fetchNotifications };
}
