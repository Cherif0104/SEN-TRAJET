"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import {
  BOOKING_STATUS_LABEL,
  MISSION_ACTION_LABEL,
  advanceOwnMissionStatus,
  bookingStatusTone,
  listMissionsForDriverUser,
  nextMissionStatus,
  setOwnDriverStatus,
  type PlatformBooking,
} from "@/lib/platformOps";
import { supabase } from "@/lib/supabase";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const TERMINAL = ["terminee", "annulee_client", "annulee_sentrajet", "no_show"];

export default function ChauffeurHomePage() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<PlatformBooking[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      setLoading(true);
      try {
        const [rows, driver] = await Promise.all([
          listMissionsForDriverUser(user.id).catch(() => []),
          supabase.from("drivers").select("status").eq("user_id", user.id).maybeSingle(),
        ]);
        setMissions(rows);
        const s = driver.data?.status;
        setAvailable(s === "available" || s === "active" || s === "Disponible");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const next = missions.find((m) => !TERMINAL.includes(m.status));
  const nextStatus = next ? nextMissionStatus(next.status) : null;

  async function toggleAvailable() {
    if (!user || available === null) return;
    const target = !available;
    try {
      await setOwnDriverStatus(user.id, target ? "available" : "offline");
      setAvailable(target);
      setStatusMsg(target ? "Vous êtes désormais disponible." : "Vous êtes désormais hors ligne.");
    } catch {
      setStatusMsg("Impossible de mettre à jour votre disponibilité pour le moment.");
    }
  }

  async function triggerNext() {
    if (!next || !nextStatus) return;
    setAdvancing(true);
    try {
      const updated = await advanceOwnMissionStatus(next.id, nextStatus);
      setMissions((prev) => prev.map((m) => (m.id === next.id ? { ...m, status: updated.status } : m)));
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Impossible de mettre à jour la mission.");
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <>
      <SjSectionHead
        eyebrow="Espace chauffeur"
        title="Aujourd’hui"
        action={
          <button
            type="button"
            className={available ? "sj-btn sj-btn-primary" : "sj-btn"}
            onClick={() => void toggleAvailable()}
          >
            {available ? "● Disponible" : "○ Hors ligne"}
          </button>
        }
      />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Pas de marketplace : SentraJet vous affecte les missions. Vous ne choisissez ni n’acceptez de courses.
      </p>
      {statusMsg ? <p style={{ color: "#6de0b0" }}>{statusMsg}</p> : null}

      {loading ? <BrandedLoader /> : null}
      {!loading ? (
        <>
          <SjSectionHead title="Votre prochaine mission" />
          {next ? (
            <SjCard>
              <div className="sj-between">
                <div>
                  <div className="sj-muted">
                    {new Date(next.pickup_time).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <MapPin className="h-4 w-4 shrink-0 text-emerald-600" /><span>{next.pickup}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <MapPin className="h-4 w-4 shrink-0 text-[#d5a64a]" /><span>{next.dropoff}</span>
                  </div>
                  <div className="sj-muted" style={{ marginTop: 8 }}>
                    {next.client?.full_name || next.client?.company_name || "Client"} · {next.passengers} passagers
                  </div>
                  {next.service_order?.dispatch?.vehicle ? (
                    <div className="sj-muted">
                      {next.service_order.dispatch.vehicle.brand} {next.service_order.dispatch.vehicle.model} ·{" "}
                      {next.service_order.dispatch.vehicle.plate_number}
                    </div>
                  ) : null}
                </div>
                <SjBadge tone={bookingStatusTone(next.status)}>{BOOKING_STATUS_LABEL[next.status] ?? next.status}</SjBadge>
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                {nextStatus ? (
                  <button type="button" className="sj-btn sj-btn-primary" disabled={advancing} onClick={() => void triggerNext()}>
                    {advancing ? "Mise à jour…" : MISSION_ACTION_LABEL[nextStatus] ?? "Continuer"}
                  </button>
                ) : null}
                <Link href={`/chauffeur/missions/${next.id}`} className="sj-btn">
                  Voir la mission
                </Link>
                {next.client?.phone ? (
                  <a href={`tel:${next.client.phone}`} className="sj-btn">
                    <Phone className="mr-1 inline h-4 w-4" /> Appeler
                  </a>
                ) : null}
              </div>
            </SjCard>
          ) : (
            <SjCard>
              <p className="sj-muted">Aucune mission assignée pour le moment. L’équipe Ops vous affectera bientôt.</p>
            </SjCard>
          )}

          <SjSectionHead
            title="Autres missions du jour"
            action={
              <Link href="/chauffeur/missions" className="sj-btn sj-btn-ghost">
                Voir tout →
              </Link>
            }
          />
          <div className="sj-list">
            {missions
              .filter((m) => m.id !== next?.id)
              .slice(0, 4)
              .map((m) => (
                <Link key={m.id} href={`/chauffeur/missions/${m.id}`}>
                  <SjCard>
                    <div className="sj-between">
                      <div>
                        <b>{m.pickup} → {m.dropoff}</b>
                        <div className="sj-muted">{new Date(m.pickup_time).toLocaleString("fr-FR")}</div>
                      </div>
                      <SjBadge tone={bookingStatusTone(m.status)}>{BOOKING_STATUS_LABEL[m.status] ?? m.status}</SjBadge>
                    </div>
                  </SjCard>
                </Link>
              ))}
            {missions.length <= 1 ? <SjCard><p className="sj-muted">Aucune autre mission pour l’instant.</p></SjCard> : null}
          </div>
        </>
      ) : null}
    </>
  );
}
