"use client";

import {
  MessageSquare,
  CheckCircle,
  XCircle,
  CreditCard,
  MapPin,
  Star,
  Bell,
} from "lucide-react";
import type { Notification } from "@/hooks/useNotifications";

const ICONS: Record<string, typeof Bell> = {
  new_request: MapPin,
  new_proposal: MessageSquare,
  proposal_accepted: CheckCircle,
  proposal_rejected: XCircle,
  booking_confirmed: CheckCircle,
  trip_started: MapPin,
  trip_completed: CheckCircle,
  credit_low: CreditCard,
  review_reminder: Star,
};

type Props = {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
};

export function NotificationDropdown({
  notifications,
  onMarkRead,
  onMarkAllRead,
}: Props) {
  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-neutral-200 bg-white shadow-lg sm:w-96">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">
          Notifications
        </h3>
        <button
          type="button"
          onClick={onMarkAllRead}
          className="text-xs font-medium text-primary hover:underline"
        >
          Tout marquer lu
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 text-sm text-neutral-400">
              Aucune notification
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const Icon = ICONS[notif.type] || Bell;
            return (
              <button
                key={notif.id}
                type="button"
                onClick={() => {
                  if (!notif.is_read) onMarkRead(notif.id);
                }}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 ${
                  !notif.is_read ? "bg-primary/5" : ""
                }`}
              >
                <Icon
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    !notif.is_read ? "text-primary" : "text-neutral-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      !notif.is_read
                        ? "font-medium text-neutral-900"
                        : "text-neutral-600"
                    }`}
                  >
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="mt-0.5 truncate text-xs text-neutral-400">
                      {notif.body}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-neutral-300">
                    {formatTimeAgo(notif.created_at)}
                  </p>
                </div>
                {!notif.is_read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}
