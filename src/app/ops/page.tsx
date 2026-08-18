"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  listDrivers,
  listPendingPayments,
  listPlatformBookings,
  listVehicles,
  type PendingPayment,
  type PlatformBooking,
  type PlatformDriver,
  type PlatformVehicle,
} from "@/lib/platformOps";
import { listAllComplaints } from "@/lib/ratingsAndComplaints";
import { supabase } from "@/lib/supabase";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const PENDING_REQUEST_STATUSES = ["demande_recue", "demande", "info_demandee", "devis_envoye", "devis_accepte", "en_attente_de_paiement"];
const IMMINENT_WINDOW_HOURS = 3;

type IncidentRow = { id: string; subject: string | null; body: string | null; created_at: string };

export default function OpsHomePage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<PlatformBooking[]>([]);
  const [drivers, setDrivers] = useState<PlatformDriver[]>([]);
  const [vehicles, setVehicles] = useState<PlatformVehicle[]>([]);
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [openComplaints, setOpenComplaints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [b, d, v, p, notif, complaints] = await Promise.all([
          listPlatformBookings().catch(() => []),
          listDrivers().catch(() => []),
          listVehicles().catch(() => []),
          listPendingPayments().catch(() => []),
          supabase
            .from("notifications")
            .select("id, subject, body, created_at")
            .eq("user_id", user.id)
            .ilike("subject", "%Incident%")
            .order("created_at", { ascending: false })
            .limit(5),
          listAllComplaints().catch(() => []),
        ]);
        setBookings(b);
        setDrivers(d);
        setVehicles(v);
        setPayments(p);
        setIncidents((notif.data ?? []) as IncidentRow[]);
        setOpenComplaints(complaints.filter((c) => c.status === "ouverte" || c.status === "en_cours").length);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const demandesReçues = bookings.filter((b) => PENDING_REQUEST_STATUSES.includes(b.status));
  const aAffecter = bookings.filter(
    (b) => ["chauffeur_a_assigner", "payee", "confirmee"].includes(b.status) || (!b.service_order?.dispatch && !PENDING_REQUEST_STATUSES.includes(b.status))
  );
  const now = Date.now();
  const missionsImminentes = useMemo(
    () =>
      bookings
        .filter((b) => {
          const diffH = (new Date(b.pickup_time).getTime() - now) / (1000 * 60 * 60);
          return diffH >= 0 && diffH <= IMMINENT_WINDOW_HOURS && ["chauffeur_assigne", "chauffeur_en_route"].includes(b.status);
        })
        .sort((a, b) => new Date(a.pickup_time).getTime() - new Date(b.pickup_time).getTime()),
    [bookings, now]
  );
  const availableDrivers = drivers.filter((d) => ["available", "active", "Disponible"].includes(d.status));
  const availableVehicles = vehicles.filter((v) => ["available", "Disponible"].includes(v.status));

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="Espace Opérations" title="À traiter maintenant" />

      <div className="sj-grid sj-grid-4">
        <SjCard>
          <div className="sj-muted">Demandes reçues</div>
          <div className="sj-metric">{demandesReçues.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Paiements à vérifier</div>
          <div className="sj-metric">{payments.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Chauffeurs/véhicules à affecter</div>
          <div className="sj-metric">{aAffecter.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Missions imminentes (≤3h)</div>
          <div className="sj-metric">{missionsImminentes.length.toString().padStart(2, "0")}</div>
        </SjCard>
      </div>

      {incidents.length ? (
        <>
          <SjSectionHead
            title="Incidents signalés"
            action={<Link href="/ops/reclamations" className="sj-btn sj-btn-ghost">Réclamations →</Link>}
          />
          <div className="sj-list">
            {incidents.map((i) => (
              <SjCard key={i.id}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-error)]" />
                  <div>
                    <b>{i.subject}</b>
                    <div className="sj-muted">{i.body}</div>
                    <div className="sj-muted">{new Date(i.created_at).toLocaleString("fr-FR")}</div>
                  </div>
                </div>
              </SjCard>
            ))}
          </div>
        </>
      ) : null}

      {openComplaints ? (
        <Link href="/ops/reclamations">
          <SjCard style={{ marginTop: 16, borderColor: "var(--color-warning)" }}>
            <div className="sj-between">
              <span>⚠ {openComplaints} réclamation{openComplaints !== 1 ? "s" : ""} client à traiter</span>
              <span className="sj-gold">Traiter →</span>
            </div>
          </SjCard>
        </Link>
      ) : null}

      <SjSectionHead
        title="Demandes en attente"
        action={
          <Link href="/ops/demandes" className="sj-btn sj-btn-ghost">
            Traiter →
          </Link>
        }
      />
      <div className="sj-list">
        {demandesReçues.slice(0, 5).map((b) => (
          <SjCard key={b.id}>
            <div className="sj-between">
              <div>
                <b>{b.reference || b.id.slice(0, 8)} · {b.pickup} → {b.dropoff}</b>
                <div className="sj-muted">{new Date(b.pickup_time).toLocaleString("fr-FR")}</div>
              </div>
              <SjBadge tone={bookingStatusTone(b.status)}>{BOOKING_STATUS_LABEL[b.status] ?? b.status}</SjBadge>
            </div>
          </SjCard>
        ))}
        {!demandesReçues.length ? <SjCard><p className="sj-muted">Aucune demande en attente.</p></SjCard> : null}
      </div>

      <SjSectionHead
        title="Missions imminentes"
        action={
          <Link href="/ops/dispatch" className="sj-btn sj-btn-ghost">
            Dispatch →
          </Link>
        }
      />
      <div className="sj-list">
        {missionsImminentes.slice(0, 5).map((b) => (
          <SjCard key={b.id}>
            <div className="sj-between">
              <div>
                <b>{b.pickup} → {b.dropoff}</b>
                <div className="sj-muted">
                  {new Date(b.pickup_time).toLocaleString("fr-FR")} · {b.service_order?.dispatch?.driver?.full_name || "Chauffeur affecté"}
                </div>
              </div>
              <SjBadge tone={bookingStatusTone(b.status)}>{BOOKING_STATUS_LABEL[b.status] ?? b.status}</SjBadge>
            </div>
          </SjCard>
        ))}
        {!missionsImminentes.length ? <SjCard><p className="sj-muted">Aucune mission imminente.</p></SjCard> : null}
      </div>

      <div className="sj-grid sj-grid-2" style={{ marginTop: 16 }}>
        <SjCard>
          <div className="sj-muted">Chauffeurs disponibles</div>
          <div className="sj-metric">{availableDrivers.length.toString().padStart(2, "0")}</div>
          <div className="sj-metric-sub">sur {drivers.length} au total</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Véhicules disponibles</div>
          <div className="sj-metric">{availableVehicles.length.toString().padStart(2, "0")}</div>
          <div className="sj-metric-sub">sur {vehicles.length} au total</div>
        </SjCard>
      </div>
      <p className="sj-muted" style={{ marginTop: 8 }}>
        {payments.length ? (
          <>
            <Link href="/ops/missions" className="sj-gold">Voir les paiements en attente</Link> avant de confirmer les prochaines courses.
          </>
        ) : null}
      </p>
    </>
  );
}
