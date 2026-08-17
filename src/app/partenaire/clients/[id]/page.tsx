"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { BOOKING_STATUS_LABEL, bookingStatusTone, listPlatformBookings, type PlatformBooking } from "@/lib/platformOps";
import { getPartnerClient, type PartnerClient } from "@/lib/partnerClients";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function PartenaireClientDetailPage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<PartnerClient | null>(null);
  const [bookings, setBookings] = useState<PlatformBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [c, all] = await Promise.all([
          getPartnerClient(params.id).catch(() => null),
          listPlatformBookings().catch(() => []),
        ]);
        setClient(c);
        setBookings(all.filter((b) => b.client_id === params.id));
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  if (loading) return <BrandedLoader />;
  if (!client) {
    return (
      <SjCard>
        <p className="sj-muted">Client introuvable ou inaccessible depuis votre carnet.</p>
      </SjCard>
    );
  }

  return (
    <>
      <SjSectionHead
        eyebrow="Fiche client"
        title={client.full_name || client.company_name || "Client"}
        action={
          <Link href={`/partenaire/reserver?clientId=${client.id}`} className="sj-btn sj-btn-primary">
            + Nouvelle réservation pour ce client
          </Link>
        }
      />

      <div className="sj-grid sj-grid-2">
        <SjCard>
          <h3>Coordonnées</h3>
          <div className="sj-list">
            <div className="sj-row"><span>Téléphone</span><b>{client.phone || "—"}</b></div>
            <div className="sj-row"><span>Email</span><b>{client.email || "—"}</b></div>
            <div className="sj-row"><span>WhatsApp</span><b>{client.whatsapp || "—"}</b></div>
            <div className="sj-row"><span>Adresse</span><b>{client.address || "—"}</b></div>
            {client.company_name && client.full_name ? (
              <div className="sj-row"><span>Contact</span><b>{client.full_name}</b></div>
            ) : null}
          </div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Réservations</div>
          <div className="sj-metric">{bookings.length.toString().padStart(2, "0")}</div>
          <div className="sj-metric-sub">
            Dernier trajet :{" "}
            {bookings[0] ? new Date(bookings[0].pickup_time).toLocaleDateString("fr-FR") : "—"}
          </div>
        </SjCard>
      </div>

      <SjSectionHead title="Historique des réservations" />
      <div className="sj-list">
        {bookings.map((b) => (
          <SjCard key={b.id}>
            <div className="sj-between">
              <div>
                <b>{b.pickup} → {b.dropoff}</b>
                <div className="sj-muted">{new Date(b.pickup_time).toLocaleString("fr-FR")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <SjBadge tone={bookingStatusTone(b.status)}>{BOOKING_STATUS_LABEL[b.status] ?? b.status}</SjBadge>
                <div className="sj-gold" style={{ marginTop: 10 }}>
                  {b.estimated_price != null ? formatFcfa(Number(b.estimated_price)) : "Sur devis"}
                </div>
              </div>
            </div>
          </SjCard>
        ))}
        {!bookings.length ? <SjCard><p className="sj-muted">Aucune réservation pour ce client pour le moment.</p></SjCard> : null}
      </div>
    </>
  );
}
