"use client";

import { useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  listMissionsForDriverUser,
  type PlatformBooking,
} from "@/lib/platformOps";

export default function ChauffeurHistoriquePage() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<PlatformBooking[]>([]);

  useEffect(() => {
    if (!user) return;
    void listMissionsForDriverUser(user.id)
      .then((rows) => setMissions(rows.filter((m) => ["terminee", "annulee", "confirmee"].includes(m.status))))
      .catch(() => setMissions([]));
  }, [user]);

  return (
    <>
      <SjSectionHead title="Historique des courses" />
      <div className="sj-list">
        {missions.map((m) => (
          <SjCard key={m.id}>
            <div className="sj-between">
              <div>
                <b>
                  {m.pickup} → {m.dropoff}
                </b>
                <div className="sj-muted">{new Date(m.pickup_time).toLocaleString("fr-FR")}</div>
              </div>
              <SjBadge tone={bookingStatusTone(m.status)}>
                {BOOKING_STATUS_LABEL[m.status] ?? m.status}
              </SjBadge>
            </div>
          </SjCard>
        ))}
        {!missions.length ? <SjCard><p className="sj-muted">Historique vide pour le moment.</p></SjCard> : null}
      </div>
    </>
  );
}
