"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  LEAD_STATUS_LABELS,
  listLeads,
  listOpenCrmActions,
  type CrmActivity,
  type Lead,
} from "@/lib/crmOps";
import { BOOKING_STATUS_LABEL, bookingStatusTone, listPlatformBookings, type PlatformBooking } from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const PENDING_STATUSES = ["demande_recue", "demande", "info_demandee", "devis_envoye", "devis_accepte", "en_attente_de_paiement", "nouvelle"];
const WON_STATUSES = ["devis_accepte", "confirmee", "payee", "terminee"];

export default function CommercialHomePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [bookings, setBookings] = useState<PlatformBooking[]>([]);
  const [actions, setActions] = useState<CrmActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      listLeads().catch(() => []),
      listPlatformBookings().catch(() => []),
      listOpenCrmActions(100).catch(() => []),
    ])
      .then(([l, b, a]) => {
        setLeads(l);
        setBookings(b);
        setActions(a);
      })
      .finally(() => setLoading(false));
  }, []);

  const nouveauxProspects = leads.filter((l) => l.status === "nouveau");
  const demandesEntrantes = bookings.filter((b) => PENDING_STATUSES.includes(b.status));
  const devisEnAttente = bookings.filter((b) => b.status === "devis_envoye");
  const now = Date.now();
  const relances = useMemo(
    () => actions.filter((a) => a.next_action_at && new Date(a.next_action_at).getTime() <= now + 24 * 60 * 60 * 1000),
    [actions, now]
  );
  const reservationsGagnees = useMemo(
    () =>
      bookings.filter((b) => {
        if (!WON_STATUSES.includes(b.status)) return false;
        const days = (now - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return days <= 30;
      }),
    [bookings, now]
  );

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead
        eyebrow="Espace Commercial"
        title="Accueil"
        action={
          <Link href="/commercial/prospects" className="sj-btn sj-btn-primary">
            + Ajouter un prospect
          </Link>
        }
      />

      <div className="sj-grid sj-grid-4">
        <SjCard>
          <div className="sj-muted">Nouveaux prospects</div>
          <div className="sj-metric">{nouveauxProspects.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Demandes entrantes</div>
          <div className="sj-metric">{demandesEntrantes.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Devis en attente</div>
          <div className="sj-metric">{devisEnAttente.length.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Relances à effectuer</div>
          <div className="sj-metric">{relances.length.toString().padStart(2, "0")}</div>
        </SjCard>
      </div>

      <SjCard style={{ marginTop: 16 }}>
        <div className="sj-muted">Réservations gagnées (30 derniers jours)</div>
        <div className="sj-metric sj-gold">{reservationsGagnees.length.toString().padStart(2, "0")}</div>
        <div className="sj-metric-sub">
          {formatFcfa(reservationsGagnees.reduce((s, b) => s + Number(b.estimated_price || 0), 0))} de volume estimé
        </div>
      </SjCard>

      <SjSectionHead
        title="Prospects récents"
        action={
          <Link href="/commercial/prospects" className="sj-btn sj-btn-ghost">
            Voir tout →
          </Link>
        }
      />
      <div className="sj-list">
        {leads.slice(0, 5).map((l) => (
          <SjCard key={l.id}>
            <div className="sj-between">
              <div>
                <b>{l.full_name || "Prospect"}</b>
                <div className="sj-muted">{l.phone || l.email || "—"} · {l.source || "commercial"}</div>
              </div>
              <SjBadge tone={l.status === "converti" ? "success" : l.status === "perdu" ? "danger" : "info"}>
                {LEAD_STATUS_LABELS[l.status] ?? l.status}
              </SjBadge>
            </div>
          </SjCard>
        ))}
        {!leads.length ? <SjCard><p className="sj-muted">Aucun prospect pour le moment.</p></SjCard> : null}
      </div>

      <SjSectionHead
        title="Relances à effectuer"
        action={
          <Link href="/commercial/activite" className="sj-btn sj-btn-ghost">
            Activité →
          </Link>
        }
      />
      <div className="sj-list">
        {relances.slice(0, 5).map((a) => (
          <SjCard key={a.id}>
            <div className="sj-between">
              <div>
                <b>{a.next_action_label || a.subject || a.motif}</b>
                <div className="sj-muted">{a.client?.full_name || a.client?.company_name || a.partner?.legal_name || "Dossier"}</div>
              </div>
              <span className="sj-muted">{a.next_action_at ? new Date(a.next_action_at).toLocaleString("fr-FR") : "—"}</span>
            </div>
          </SjCard>
        ))}
        {!relances.length ? <SjCard><p className="sj-muted">Aucune relance urgente.</p></SjCard> : null}
      </div>

      <SjSectionHead title="Demandes entrantes" />
      <div className="sj-list">
        {demandesEntrantes.slice(0, 5).map((b) => (
          <SjCard key={b.id}>
            <div className="sj-between">
              <div>
                <b>{b.reference || b.id.slice(0, 8)} · {b.pickup} → {b.dropoff}</b>
                <div className="sj-muted">{b.client?.full_name || b.client?.company_name || "Client"}</div>
              </div>
              <SjBadge tone={bookingStatusTone(b.status)}>{BOOKING_STATUS_LABEL[b.status] ?? b.status}</SjBadge>
            </div>
          </SjCard>
        ))}
        {!demandesEntrantes.length ? <SjCard><p className="sj-muted">Aucune demande entrante.</p></SjCard> : null}
      </div>
    </>
  );
}
