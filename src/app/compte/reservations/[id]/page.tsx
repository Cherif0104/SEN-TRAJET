"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageSquareWarning,
  Navigation,
  Phone,
  ShieldCheck,
  Star,
} from "lucide-react";
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
import { COMPLAINT_CATEGORIES, submitComplaint } from "@/lib/ratingsAndComplaints";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { BookingLiveMap } from "@/components/map/BookingLiveMap";

const TERMINAL = ["annulee_client", "annulee_sentrajet", "terminee", "remboursee", "remboursement_en_cours", "no_show"];
const LIVE_TRACKING_STATUSES = ["chauffeur_en_route", "chauffeur_arrive", "client_pris_en_charge", "en_cours"];
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
  const [showComplaint, setShowComplaint] = useState(false);
  const [complaintCategory, setComplaintCategory] = useState<string>(COMPLAINT_CATEGORIES[0][0]);
  const [complaintMessage, setComplaintMessage] = useState("");
  const [complaintSending, setComplaintSending] = useState(false);
  const [complaintSent, setComplaintSent] = useState(false);
  const [complaintError, setComplaintError] = useState<string | null>(null);
  const [shareLivePosition, setShareLivePosition] = useState(false);

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

  async function sendComplaint(e: React.FormEvent) {
    e.preventDefault();
    if (!booking?.client_id || !complaintMessage.trim()) return;
    setComplaintSending(true);
    setComplaintError(null);
    try {
      await submitComplaint({
        bookingId: booking.id,
        clientId: booking.client_id,
        category: complaintCategory,
        message: complaintMessage.trim(),
      });
      setComplaintSent(true);
    } catch (err) {
      setComplaintError(err instanceof Error ? err.message : "Impossible d’envoyer votre réclamation.");
    } finally {
      setComplaintSending(false);
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

      <div className="mb-5 overflow-hidden rounded-[1.4rem] bg-[#07111f] p-5 text-white">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#f0c86b]">
            {TERMINAL.includes(booking.status) ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : driver ? (
              <Navigation className="h-5 w-5" />
            ) : (
              <Clock3 className="h-5 w-5" />
            )}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#f0c86b]">
              État de votre trajet
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-white">
              {BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              {driver
                ? "Votre véhicule est affecté. Retrouvez ici sa position et les prochaines étapes."
                : "Votre demande est en cours de traitement. Aucun chauffeur n’est affecté avant la validation SentraJet."}
            </p>
          </div>
        </div>
      </div>

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

      {driver && LIVE_TRACKING_STATUSES.includes(booking.status) ? (
        <>
          <SjSectionHead title="Suivi en direct" />
          <SjCard>
            <div className="mb-3 flex flex-col gap-3 rounded-2xl bg-emerald-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <p className="text-xs leading-relaxed text-emerald-900">
                  Partagez votre position uniquement pendant la prise en charge pour aider le chauffeur à vous retrouver.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareLivePosition((value) => !value)}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${
                  shareLivePosition
                    ? "bg-emerald-700 text-white"
                    : "border border-emerald-300 bg-white text-emerald-800"
                }`}
              >
                {shareLivePosition ? "Position partagée" : "Partager ma position"}
              </button>
            </div>
            <BookingLiveMap bookingId={booking.id} userRole="client" trackingEnabled={shareLivePosition} />
          </SjCard>
        </>
      ) : null}

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
        {booking.status === "terminee" ? (
          <Link href={`/avis/${booking.id}`} className="sj-btn">
            <Star className="mr-1 inline h-4 w-4" /> Laisser un avis
          </Link>
        ) : null}
        <button type="button" className="sj-btn" onClick={() => setShowComplaint(true)}>
          <MessageSquareWarning className="mr-1 inline h-4 w-4" /> Signaler un problème
        </button>
        {isCancellable ? (
          <button type="button" className="sj-btn" style={{ color: "var(--color-error)" }} onClick={() => void openCancelPreview()}>
            Annuler la réservation
          </button>
        ) : null}
      </div>

      {showComplaint ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <SjCard style={{ maxWidth: 420, width: "100%" }}>
            <h3 style={{ marginTop: 0 }}>Signaler un problème</h3>
            {complaintSent ? (
              <p style={{ color: "#6de0b0" }}>Réclamation envoyée. L’équipe SentraJet va l’examiner.</p>
            ) : (
              <form onSubmit={sendComplaint}>
                <div className="sj-field">
                  <label>Catégorie</label>
                  <select value={complaintCategory} onChange={(e) => setComplaintCategory(e.target.value)}>
                    {COMPLAINT_CATEGORIES.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="sj-field">
                  <label>Description *</label>
                  <textarea rows={3} value={complaintMessage} onChange={(e) => setComplaintMessage(e.target.value)} required />
                </div>
                {complaintError ? <p style={{ color: "var(--color-error)" }}>{complaintError}</p> : null}
                <div className="sj-toolbar" style={{ marginTop: 12 }}>
                  <button type="button" className="sj-btn" onClick={() => setShowComplaint(false)} disabled={complaintSending}>
                    Annuler
                  </button>
                  <button type="submit" className="sj-btn sj-btn-primary" disabled={complaintSending || !complaintMessage.trim()}>
                    {complaintSending ? "Envoi…" : "Envoyer la réclamation"}
                  </button>
                </div>
              </form>
            )}
          </SjCard>
        </div>
      ) : null}

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
