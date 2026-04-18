"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

const realtimeOff =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_SUPABASE_REALTIME === "false";

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: { is_read: boolean }) => !n.is_read).length);
    }
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
        .update({ is_read: true })
        .eq("id", notifId);
      fetchNotifications();
    },
    [fetchNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    fetchNotifications();
  }, [userId, fetchNotifications]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, refresh: fetchNotifications };
}
