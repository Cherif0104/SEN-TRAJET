"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, MapPin, Phone } from "lucide-react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  cancelOwnBooking,
  getBookingById,
  listBookingStatusHistory,
  type BookingStatusHistoryRow,
  type PlatformBooking,
} from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { quoteCancellation, type CancellationQuote } from "@/lib/engines/cancellation";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const TERMINAL = ["annulee_client", "annulee_sentrajet", "terminee", "remboursee", "remboursement_en_cours", "no_show"];
const WHATSAPP_PHONE = "221788324069";

export default function CompteReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<PlatformBooking | null>(null);
  const [history, setHistory] = useState<BookingStatusHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<CancellationQuote | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [b, h] = await Promise.all([
          getBookingById(params.id).catch(() => null),
          listBookingStatusHistory(params.id).catch(() => []),
        ]);
        setBooking(b);
        setHistory(h);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Impossible de charger cette réservation.");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  async function openCancelPreview() {
    if (!booking) return;
    const quote = await quoteCancellation(Number(booking.estimated_price ?? 0), new Date(booking.pickup_time));
    setPreview(quote);
    setConfirming(true);
  }

  async function confirmCancel() {
    if (!booking) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const result = await cancelOwnBooking(booking.id);
      setBooking({ ...booking, status: result.status });
      setConfirming(false);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Impossible d’annuler cette réservation.");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <BrandedLoader />;

  if (!booking) {
    return (
      <SjCard>
        <p className="sj-muted">Réservation introuvable ou inaccessible.</p>
        <Link href="/compte/reservations" className="sj-btn" style={{ marginTop: 12 }}>
          Retour à mes réservations
        </Link>
      </SjCard>
    );
  }

  const isCancellable = !TERMINAL.includes(booking.status);
  const driver = booking.service_order?.dispatch?.driver;
  const vehicle = booking.service_order?.dispatch?.vehicle;
  const whatsappHref = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
    `Bonjour SentraJet Premium, au sujet de ma réservation ${booking.reference ?? booking.id.slice(0, 8)}.`
  )}`;

  return (
    <>
      <button type="button" onClick={() => router.back()} className="sj-btn sj-btn-ghost" style={{ marginBottom: 12 }}>
        <ArrowLeft className="mr-1 inline h-4 w-4" /> Retour
      </button>

      <SjSectionHead
        eyebrow={booking.reference || booking.id.slice(0, 8)}
        title={`${booking.pickup} → ${booking.dropoff}`}
        action={<SjBadge tone={bookingStatusTone(booking.status)}>{BOOKING_STATUS_LABEL[booking.status] ?? booking.status}</SjBadge>}
      />
      {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}

      <div className="sj-grid sj-grid-2">
        <SjCard>
          <h3>Trajet</h3>
          <div className="sj-list">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MapPin className="h-4 w-4 shrink-0 text-emerald-600" /><span>{booking.pickup}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MapPin className="h-4 w-4 shrink-0 text-[#d5a64a]" /><span>{booking.dropoff}</span>
            </div>
            <div className="sj-row"><span>Date</span><b>{new Date(booking.pickup_time).toLocaleString("fr-FR")}</b></div>
            <div className="sj-row"><span>Passagers</span><b>{booking.passengers}</b></div>
            {booking.distance_km ? <div className="sj-row"><span>Distance</span><b>{booking.distance_km} km</b></div> : null}
          </div>
        </SjCard>
        <SjCard>
          <h3>Prix</h3>
          <div className="sj-metric">
            {booking.estimated_price != null ? formatFcfa(Number(booking.estimated_price)) : "Sur devis"}
          </div>
          <div className="sj-metric-sub">Montant estimé — confirmé après validation SentraJet</div>
        </SjCard>
      </div>

      <SjSectionHead title="Chauffeur & véhicule" />
      <SjCard>
        {driver ? (
          <div className="sj-between">
            <div>
              <b>{driver.full_name}</b>
              {vehicle ? <div className="sj-muted">{vehicle.brand} {vehicle.model} · {vehicle.plate_number}</div> : null}
            </div>
            {driver.phone ? (
              <a href={`tel:${driver.phone}`} className="sj-btn">
                <Phone className="mr-1 inline h-4 w-4" /> Appeler
              </a>
            ) : null}
          </div>
        ) : (
          <p className="sj-muted">En cours d’affectation par l’équipe SentraJet.</p>
        )}
      </SjCard>

      <SjSectionHead title="Suivi de la réservation" />
      <SjCard>
        <div className="sj-list">
          {history.map((h) => (
            <div key={h.id} className="sj-row">
              <span>{BOOKING_STATUS_LABEL[h.to_status] ?? h.to_status}</span>
              <span className="sj-muted">{new Date(h.created_at).toLocaleString("fr-FR")}</span>
            </div>
          ))}
          {!history.length ? <p className="sj-muted">Aucun historique disponible.</p> : null}
        </div>
      </SjCard>

      <div className="sj-toolbar" style={{ marginTop: 16 }}>
        <a href={whatsappHref} target="_blank" rel="noreferrer" className="sj-btn">
          Contacter SentraJet
        </a>
        {isCancellable ? (
          <button type="button" className="sj-btn" style={{ color: "var(--color-error)" }} onClick={() => void openCancelPreview()}>
            Annuler la réservation
          </button>
        ) : null}
      </div>

      {confirming && preview ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <SjCard style={{ maxWidth: 420, width: "100%" }}>
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />
              <h3 style={{ margin: 0 }}>Confirmer l’annulation ?</h3>
            </div>
            <p className="sj-muted">
              {preview.decisionPending
                ? "Annulation entre 2h et 4h avant le départ — aucun frais n’est appliqué pour le moment, décision en attente côté SentraJet."
                : `Bande ${preview.band} avant le départ — frais d’annulation estimés : ${formatFcfa(preview.feeFcfa)}.`}
            </p>
            {cancelError ? <p style={{ color: "var(--color-error)" }}>{cancelError}</p> : null}
            <div className="sj-toolbar" style={{ marginTop: 12 }}>
              <button type="button" className="sj-btn" onClick={() => setConfirming(false)} disabled={cancelling}>
                Retour
              </button>
              <button
                type="button"
                className="sj-btn sj-btn-primary"
                style={{ background: "var(--color-error)", borderColor: "var(--color-error)" }}
                onClick={() => void confirmCancel()}
                disabled={cancelling}
              >
                {cancelling ? "Annulation…" : "Confirmer l’annulation"}
              </button>
            </div>
          </SjCard>
        </div>
      ) : null}
    </>
  );
}
