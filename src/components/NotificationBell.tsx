"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type Notification = {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell({ inverse = false }: { inverse?: boolean }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12);
    setItems((data as Notification[] | null) ?? []);
  }

  useEffect(() => {
    if (!user) return;
    void load();
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void load()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const unread = items.filter((item) => !item.read_at).length;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread) {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user!.id)
        .is("read_at", null);
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    }
  }

  return (
    <div className="notification-wrap">
      <button className={`notification-trigger ${inverse ? "inverse" : ""}`} type="button" onClick={() => void toggle()} aria-label="Notifications">
        <Bell size={18} />
        {unread ? <span>{unread > 9 ? "9+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="notification-panel">
          <div><strong>Notifications</strong><CheckCheck size={17} /></div>
          {items.length ? items.map((item) => (
            <article key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
              <small>{new Date(item.created_at).toLocaleDateString("fr-FR")}</small>
            </article>
          )) : <p className="notification-empty">Aucune notification pour le moment.</p>}
        </div>
      ) : null}
    </div>
  );
}
