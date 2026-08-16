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
import { formatFcfa } from "@/lib/sentrajetPricing";

export default function ChauffeurMissionsPage() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<PlatformBooking[]>([]);

  useEffect(() => {
    if (!user) return;
    void listMissionsForDriverUser(user.id).then(setMissions).catch(() => setMissions([]));
  }, [user]);

  return (
    <>
      <SjSectionHead eyebrow="Missions" title="Courses assignées" />
      <div className="sj-list">
        {missions.map((m) => (
          <SjCard key={m.id}>
            <div className="sj-between">
              <div>
                <b>{m.reference || m.id.slice(0, 8)}</b>
                <div className="sj-muted">
                  {m.pickup} → {m.dropoff}
                </div>
                <div className="sj-muted">{new Date(m.pickup_time).toLocaleString("fr-FR")}</div>
                <div style={{ marginTop: 8 }}>
                  Véhicule :{" "}
                  {m.service_order?.dispatch?.vehicle
                    ? `${m.service_order.dispatch.vehicle.brand} ${m.service_order.dispatch.vehicle.model}`
                    : "—"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <SjBadge tone={bookingStatusTone(m.status)}>
                  {BOOKING_STATUS_LABEL[m.status] ?? m.status}
                </SjBadge>
                <div className="sj-gold" style={{ marginTop: 10 }}>
                  {m.estimated_price != null ? formatFcfa(Number(m.estimated_price)) : "—"}
                </div>
              </div>
            </div>
          </SjCard>
        ))}
        {!missions.length ? <SjCard><p className="sj-muted">Pas encore de mission.</p></SjCard> : null}
      </div>
    </>
  );
}
