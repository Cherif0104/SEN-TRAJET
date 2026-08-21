"use client";

import { useRouter } from "next/navigation";
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  CreditCard,
  MapPin,
  Bell,
} from "lucide-react";
import type { Notification } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminZone, canAccessOpsZone } from "@/lib/rbac";

const ICONS: Record<string, typeof Bell> = {
  booking: MapPin,
  payment: CreditCard,
  message: MessageSquare,
  incident: XCircle,
  contract: CheckCircle,
};

type Props = {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
};

/**
 * Détermine où amener l'utilisateur quand il clique sur une notification, à partir de
 * `entity_type` + `entity_id` (seule référence stockée en base) et de son rôle. Renvoie `null`
 * si aucune destination n'est connue (on se contente alors de marquer la notification comme lue).
 */
function resolveNotificationHref(
  notif: Notification,
  profile: { role: string | null; internalRole: string | null } | null
): string | null {
  if (!notif.entity_type || !notif.entity_id) return null;
  const role = profile?.role ?? null;
  const internalRole = profile?.internalRole ?? null;

  switch (notif.entity_type) {
    case "booking":
      if (role === "client") return `/compte/reservations/${notif.entity_id}`;
      if (canAccessOpsZone(internalRole, role)) return `/ops/calendrier?bookingId=${notif.entity_id}`;
      if (canAccessAdminZone(role)) return "/admin/reservations";
      return null;
    case "partner_organization":
      return canAccessAdminZone(role) ? `/admin/partenaires/${notif.entity_id}` : null;
    case "vehicle_owner":
      return canAccessAdminZone(role) ? `/admin/proprietaires/${notif.entity_id}` : null;
    case "vehicle":
      return canAccessAdminZone(role) ? `/admin/vehicules/${notif.entity_id}` : null;
    case "driver":
      return canAccessAdminZone(role) ? `/admin/chauffeurs/${notif.entity_id}` : null;
    default:
      return null;
  }
}

export function NotificationDropdown({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: Props) {
  const router = useRouter();
  const { profile } = useAuth();

  function handleClick(notif: Notification) {
    if (!notif.read_at) onMarkRead(notif.id);
    const href = resolveNotificationHref(notif, profile);
    if (href) {
      onClose();
      router.push(href);
    }
  }

  return (
    <div className="sj-notif-panel">
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

      <div className="sj-notif-panel-list">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 text-sm text-neutral-400">
              Aucune notification
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const Icon = ICONS[notif.entity_type ?? ""] || Bell;
            const isUnread = !notif.read_at;
            const isActionable = Boolean(resolveNotificationHref(notif, profile));
            return (
              <button
                key={notif.id}
                type="button"
                onClick={() => handleClick(notif)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 ${
                  isUnread ? "bg-primary/5" : ""
                }`}
              >
                <Icon
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    isUnread ? "text-primary" : "text-neutral-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      isUnread
                        ? "font-medium text-neutral-900"
                        : "text-neutral-600"
                    }`}
                  >
                    {notif.subject}
                  </p>
                  {notif.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-neutral-400">
                      {notif.body}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-neutral-300">
                    {formatTimeAgo(notif.created_at)}
                    {isActionable ? " · Ouvrir →" : ""}
                  </p>
                </div>
                {isUnread && (
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
