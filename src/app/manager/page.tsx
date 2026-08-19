"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { listPlatformBookings, listVehicles, type PlatformBooking, type PlatformVehicle } from "@/lib/platformOps";
import { listAllPayments, type FinancePayment } from "@/lib/financeOps";
import { supabase } from "@/lib/supabase";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const PENDING_STATUSES = ["demande_recue", "demande", "info_demandee", "devis_envoye", "devis_accepte", "en_attente_de_paiement", "nouvelle"];

type IncidentRow = { id: string; subject: string | null; body: string | null; created_at: string };

function DecisionBanner({ tone, children }: { tone: "warning" | "danger" | "success"; children: React.ReactNode }) {
  const colors = {
    warning: { bg: "rgba(245, 158, 11, 0.1)", border: "var(--color-warning)" },
    danger: { bg: "rgba(239, 68, 68, 0.1)", border: "var(--color-error)" },
    success: { bg: "rgba(16, 185, 129, 0.1)", border: "#10b981" },
  }[tone];
  return (
    <div
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

export default function ManagerHomePage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<PlatformBooking[]>([]);
  const [vehicles, setVehicles] = useState<PlatformVehicle[]>([]);
  const [payments, setPayments] = useState<FinancePayment[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [b, v, p, notif] = await Promise.all([
          listPlatformBookings().catch(() => []),
          listVehicles().catch(() => []),
          listAllPayments().catch(() => []),
          supabase
            .from("notifications")
            .select("id, subject, body, created_at")
            .eq("user_id", user.id)
            .ilike("subject", "%Incident%")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);
        setBookings(b);
        setVehicles(v);
        setPayments(p);
        setIncidents((notif.data ?? []) as IncidentRow[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const demandesATraiter = bookings.filter((b) => PENDING_STATUSES.includes(b.status));
  const vehiculesIndisponibles = vehicles.filter((v) => ["maintenance", "offline", "out_of_service"].includes(v.status));
  const paiementsARegler = useMemo(() => payments.filter((p) => ["pending", "initiated", "created"].includes(p.status)), [payments]);
  const now = Date.now();
  const missionsTermineesSemaine = useMemo(
    () =>
      bookings.filter((b) => {
        if (b.status !== "terminee") return false;
        const days = (now - new Date(b.pickup_time).getTime()) / (1000 * 60 * 60 * 24);
        return days >= 0 && days <= 7;
      }),
    [bookings, now]
  );
  const caEncaisse = useMemo(() => payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_fcfa, 0), [payments]);

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead eyebrow="Espace Manager" title="Supervision du jour" />

      {demandesATraiter.length ? (
        <Link href="/manager/activite">
          <DecisionBanner tone="warning">
            <span><AlertTriangle className="mr-2 inline h-4 w-4" />⚠ {demandesATraiter.length} demande{demandesATraiter.length !== 1 ? "s" : ""} nécessite{demandesATraiter.length !== 1 ? "nt" : ""} une action</span>
          </DecisionBanner>
        </Link>
      ) : null}

      {vehiculesIndisponibles.length ? (
        <Link href="/manager/flotte">
          <DecisionBanner tone="danger">
            <span><AlertTriangle className="mr-2 inline h-4 w-4" />⚠ {vehiculesIndisponibles.length} véhicule{vehiculesIndisponibles.length !== 1 ? "s" : ""} indisponible{vehiculesIndisponibles.length !== 1 ? "s" : ""}</span>
          </DecisionBanner>
        </Link>
      ) : null}

      {paiementsARegler.length ? (
        <DecisionBanner tone="warning">
          <span><AlertTriangle className="mr-2 inline h-4 w-4" />⚠ {paiementsARegler.length} paiement{paiementsARegler.length !== 1 ? "s" : ""} en attente de vérification</span>
        </DecisionBanner>
      ) : null}

      {incidents.length ? (
        <DecisionBanner tone="danger">
          <span><AlertTriangle className="mr-2 inline h-4 w-4" />⚠ {incidents.length} incident{incidents.length !== 1 ? "s" : ""} signalé{incidents.length !== 1 ? "s" : ""} par les chauffeurs</span>
        </DecisionBanner>
      ) : null}

      <DecisionBanner tone="success">
        <span><CheckCircle2 className="mr-2 inline h-4 w-4" />✅ {missionsTermineesSemaine.length} mission{missionsTermineesSemaine.length !== 1 ? "s" : ""} terminée{missionsTermineesSemaine.length !== 1 ? "s" : ""} cette semaine</span>
      </DecisionBanner>

      <SjCard style={{ marginTop: 16 }}>
        <div className="sj-muted">Chiffre d’affaires encaissé (réel)</div>
        <div className="sj-metric sj-gold">{formatFcfa(caEncaisse)}</div>
        <div className="sj-metric-sub">Issu des paiements confirmés — pas une estimation</div>
      </SjCard>

      {incidents.length ? (
        <>
          <SjSectionHead title="Incidents signalés" />
          <div className="sj-list">
            {incidents.map((i) => (
              <SjCard key={i.id}>
                <b>{i.subject}</b>
                <div className="sj-muted">{i.body}</div>
                <div className="sj-muted">{new Date(i.created_at).toLocaleString("fr-FR")}</div>
              </SjCard>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
