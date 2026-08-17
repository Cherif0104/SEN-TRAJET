"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  listPartnerContracts,
  listPlatformBookings,
  type PlatformBooking,
} from "@/lib/platformOps";
import { listPartnerClients, listPartnerPayments, type PartnerClient, type PartnerPayment } from "@/lib/partnerClients";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const PENDING_STATUSES = ["demande_recue", "demande", "info_demandee", "devis_envoye", "en_attente_de_paiement"];
const TERMINAL_STATUSES = ["terminee", "annulee_client", "annulee_sentrajet", "remboursee", "no_show"];

export default function PartenaireHomePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PlatformBooking[]>([]);
  const [clients, setClients] = useState<PartnerClient[]>([]);
  const [payments, setPayments] = useState<PartnerPayment[]>([]);
  const [partnerName, setPartnerName] = useState("Partenaire");
  const [contractActive, setContractActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const contracts = await listPartnerContracts().catch(() => []);
        const mine = contracts.find((c) => c.partner_user_id === user.id);
        if (mine) {
          setPartnerName(mine.partner_name);
          setContractActive(mine.status === "active");
        } else {
          setContractActive(false);
        }
        const [bookings, clientRows, paymentRows] = await Promise.all([
          listPlatformBookings().catch(() => []),
          mine ? listPartnerClients(mine.id).catch(() => []) : Promise.resolve([]),
          listPartnerPayments().catch(() => []),
        ]);
        setRows(bookings);
        setClients(clientRows);
        setPayments(paymentRows);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const today = new Date();
  const isToday = (iso: string) => {
    const d = new Date(iso);
    return d.toDateString() === today.toDateString();
  };

  const todayBookings = rows.filter((b) => isToday(b.pickup_time));
  const pendingRequests = rows.filter((b) => PENDING_STATUSES.includes(b.status));
  const upcoming = rows
    .filter((b) => new Date(b.pickup_time) > today && !TERMINAL_STATUSES.includes(b.status))
    .sort((a, b) => new Date(a.pickup_time).getTime() - new Date(b.pickup_time).getTime());
  const amountDue = useMemo(
    () => payments.filter((p) => p.status === "pending" || p.status === "initiated").reduce((s, p) => s + Number(p.amount_fcfa || 0), 0),
    [payments]
  );
  const clientsServed = useMemo(() => new Set(rows.map((b) => b.client_id).filter(Boolean)).size, [rows]);

  return (
    <>
      <SjSectionHead
        eyebrow="Espace prestataire B2B"
        title={`Bonjour ${partnerName}`}
        action={
          <Link href="/partenaire/reserver" className="sj-btn sj-btn-primary">
            + Nouvelle réservation
          </Link>
        }
      />
      {contractActive === false ? (
        <SjCard style={{ marginBottom: 16, borderColor: "var(--color-warning)" }}>
          <p className="sj-muted" style={{ margin: 0 }}>
            Aucun contrat partenaire actif n’est associé à votre compte. Contactez SentraJet pour activer
            votre accès B2B — la simulation reste disponible sans contrat.
          </p>
        </SjCard>
      ) : null}

      {loading ? (
        <BrandedLoader />
      ) : (
        <>
          <div className="sj-grid sj-grid-4" style={{ marginTop: 8 }}>
            <SjCard>
              <div className="sj-muted">Réservations du jour</div>
              <div className="sj-metric">{todayBookings.length.toString().padStart(2, "0")}</div>
            </SjCard>
            <SjCard>
              <div className="sj-muted">Demandes en attente</div>
              <div className="sj-metric">{pendingRequests.length.toString().padStart(2, "0")}</div>
            </SjCard>
            <SjCard>
              <div className="sj-muted">Montant à régler</div>
              <div className="sj-metric">{formatFcfa(amountDue)}</div>
            </SjCard>
            <SjCard>
              <div className="sj-muted">Clients servis</div>
              <div className="sj-metric">{clientsServed.toString().padStart(2, "0")}</div>
              <div className="sj-metric-sub">{clients.length} dans votre carnet</div>
            </SjCard>
          </div>

          <SjSectionHead
            title="Réservations à venir"
            action={
              <Link href="/partenaire/demandes" className="sj-btn sj-btn-ghost">
                Voir tout →
              </Link>
            }
          />
          <div className="sj-list">
            {upcoming.slice(0, 5).map((b) => (
              <SjCard key={b.id}>
                <div className="sj-between">
                  <div>
                    <b>
                      {b.pickup} → {b.dropoff}
                    </b>
                    <div className="sj-muted">{new Date(b.pickup_time).toLocaleString("fr-FR")}</div>
                  </div>
                  <SjBadge tone={bookingStatusTone(b.status)}>
                    {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                  </SjBadge>
                </div>
              </SjCard>
            ))}
            {!upcoming.length ? (
              <SjCard>
                <p className="sj-muted">Aucune réservation à venir. Lancez une nouvelle réservation.</p>
              </SjCard>
            ) : null}
          </div>

          <SjSectionHead
            title="Activité récente"
            action={
              <Link href="/partenaire/clients" className="sj-btn sj-btn-ghost">
                Mon carnet clients →
              </Link>
            }
          />
          <div className="sj-list">
            {rows.slice(0, 5).map((b) => (
              <SjCard key={b.id}>
                <div className="sj-between">
                  <div>
                    <b>{b.client?.full_name || b.client?.company_name || "Client"}</b>
                    <div className="sj-muted">
                      {b.pickup} → {b.dropoff} · {new Date(b.pickup_time).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <SjBadge tone={bookingStatusTone(b.status)}>
                    {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                  </SjBadge>
                </div>
              </SjCard>
            ))}
            {!rows.length ? <SjCard><p className="sj-muted">Aucune activité récente.</p></SjCard> : null}
          </div>
        </>
      )}
    </>
  );
}
