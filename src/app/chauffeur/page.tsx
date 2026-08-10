"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  listMissionsForDriverUser,
  type PlatformBooking,
} from "@/lib/platformOps";
import { supabase } from "@/lib/supabase";

export default function ChauffeurHomePage() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<PlatformBooking[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void listMissionsForDriverUser(user.id).then(setMissions).catch(() => setMissions([]));
  }, [user]);

  const next = missions.find((m) => !["terminee", "annulee"].includes(m.status));

  async function setAvailable() {
    if (!user) return;
    await supabase.from("drivers").update({ status: "available" }).eq("user_id", user.id);
    setStatusMsg("Statut mis à jour : disponible");
  }

  return (
    <>
      <SjSectionHead
        eyebrow="Espace chauffeur"
        title="Votre journée"
        action={
          <button type="button" className="sj-btn" onClick={() => void setAvailable()}>
            Je suis disponible
          </button>
        }
      />
      {statusMsg ? <p style={{ color: "#6de0b0" }}>{statusMsg}</p> : null}

      <div className="sj-grid sj-grid-3">
        <SjCard>
          <div className="sj-muted">Mission suivante</div>
          <div className="sj-metric">
            {next
              ? new Date(next.pickup_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
              : "—"}
          </div>
          <div className="sj-metric-sub">
            {next ? `${next.pickup} → ${next.dropoff} · ${next.passengers} passagers` : "Aucune mission"}
          </div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Courses assignées</div>
          <div className="sj-metric">{missions.length.toString().padStart(2, "0")}</div>
          <div className="sj-metric-sub">Missions flotte SentraJet</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Véhicule</div>
          <div className="sj-metric">{next?.service_order?.dispatch?.vehicle?.model || "—"}</div>
          <div className="sj-metric-sub">
            {next?.service_order?.dispatch?.vehicle
              ? `${next.service_order.dispatch.vehicle.brand} · ${next.service_order.dispatch.vehicle.plate_number}`
              : "Assigné à la mission"}
          </div>
        </SjCard>
      </div>

      <SjSectionHead
        title="Mes missions"
        action={
          <Link href="/chauffeur/missions" className="sj-btn sj-btn-ghost">
            Voir tout →
          </Link>
        }
      />
      <div className="sj-list">
        {missions.slice(0, 5).map((m) => (
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
        {!missions.length ? (
          <SjCard>
            <p className="sj-muted">Aucune mission assignée pour le moment. L’équipe Ops vous affectera bientôt.</p>
          </SjCard>
        ) : null}
      </div>
    </>
  );
}
