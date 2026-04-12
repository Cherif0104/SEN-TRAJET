"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";
import { useNotifications } from "@/hooks/useNotifications";

type Props = {
  userId: string | null;
};

export function NotificationBell({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications(userId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!userId) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          notifications={notifications}
          onMarkRead={markAsRead}
          onMarkAllRead={markAllAsRead}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
