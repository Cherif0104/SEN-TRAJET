"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, MapPin, Navigation, Phone } from "lucide-react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  BOOKING_STATUS_LABEL,
  MISSION_ACTION_LABEL,
  advanceOwnMissionStatus,
  bookingStatusTone,
  getBookingById,
  nextMissionStatus,
  reportMissionIssue,
  type PlatformBooking,
} from "@/lib/platformOps";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { BookingLiveMap } from "@/components/map/BookingLiveMap";

const ISSUE_PRESETS = ["Retard", "Client absent", "Problème véhicule", "Autre"];
const TERMINAL = ["terminee", "annulee_client", "annulee_sentrajet", "no_show"];
const LIVE_TRACKING_STATUSES = ["chauffeur_en_route", "chauffeur_arrive", "client_pris_en_charge", "en_cours"];

export default function ChauffeurMissionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<PlatformBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIssue, setShowIssue] = useState(false);
  const [issuePreset, setIssuePreset] = useState<string>(ISSUE_PRESETS[0]);
  const [issueDetail, setIssueDetail] = useState("");
  const [issueSending, setIssueSending] = useState(false);
  const [issueSent, setIssueSent] = useState(false);

  useEffect(() => {
    void getBookingById(params.id)
      .then(setBooking)
      .catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger cette mission."))
      .finally(() => setLoading(false));
  }, [params.id]);

  const next = useMemo(() => (booking ? nextMissionStatus(booking.status) : null), [booking]);
  const isDone = booking ? TERMINAL.includes(booking.status) || booking.status === "terminee" : false;
  const headingToPickup = booking ? ["chauffeur_assigne", "chauffeur_en_route"].includes(booking.status) : false;
  const navDestination = booking ? (headingToPickup ? booking.pickup : booking.dropoff) : null;
  const navigateUrl = navDestination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(navDestination)}&travelmode=driving`
    : null;

  async function trigger(status: string) {
    if (!booking) return;
    setAdvancing(true);
    setError(null);
    try {
      const updated = await advanceOwnMissionStatus(booking.id, status);
      setBooking({ ...booking, status: updated.status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour cette mission.");
    } finally {
      setAdvancing(false);
    }
  }

  async function sendIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;
    setIssueSending(true);
    try {
      await reportMissionIssue(booking.id, `${issuePreset} — ${issueDetail || "Aucun détail supplémentaire"}`);
      setIssueSent(true);
      setTimeout(() => {
        setShowIssue(false);
        setIssueSent(false);
        setIssueDetail("");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d’envoyer ce signalement.");
    } finally {
      setIssueSending(false);
    }
  }

  if (loading) return <BrandedLoader />;
  if (!booking) {
    return <SjCard><p className="sj-muted">Mission introuvable ou non affectée à votre compte.</p></SjCard>;
  }

  if (booking.status === "terminee") {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        <h2 style={{ marginTop: 16 }}>Mission terminée !</h2>
        <SjCard style={{ maxWidth: 420, margin: "16px auto", textAlign: "left" }}>
          <div className="sj-row"><span>Trajet</span><b>{booking.pickup} → {booking.dropoff}</b></div>
          <div className="sj-row"><span>Passagers</span><b>{booking.passengers}</b></div>
          <div className="sj-row"><span>Prix</span><b>{booking.estimated_price != null ? formatFcfa(Number(booking.estimated_price)) : "—"}</b></div>
        </SjCard>
        <div className="sj-toolbar" style={{ justifyContent: "center", maxWidth: 420, margin: "0 auto" }}>
          <button type="button" className="sj-btn sj-btn-primary" onClick={() => router.push("/chauffeur")}>
            Retour à l’accueil
          </button>
          <button type="button" className="sj-btn" onClick={() => router.push("/chauffeur/missions")}>
            Voir mes missions
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SjSectionHead
        eyebrow={booking.reference || booking.id.slice(0, 8)}
        title="Ma mission"
        action={<SjBadge tone={bookingStatusTone(booking.status)}>{BOOKING_STATUS_LABEL[booking.status] ?? booking.status}</SjBadge>}
      />
      {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}

      <SjCard>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MapPin className="h-4 w-4 shrink-0 text-emerald-600" /><span>{booking.pickup}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <MapPin className="h-4 w-4 shrink-0 text-[#d5a64a]" /><span>{booking.dropoff}</span>
        </div>
        <div className="sj-row" style={{ marginTop: 12 }}>
          <span>Heure</span><b>{new Date(booking.pickup_time).toLocaleString("fr-FR")}</b>
        </div>
        <div className="sj-row"><span>Passagers</span><b>{booking.passengers}</b></div>
        {navigateUrl ? (
          <a
            href={navigateUrl}
            target="_blank"
            rel="noreferrer"
            className="sj-btn sj-btn-primary"
            style={{ width: "100%", marginTop: 12, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}
          >
            <Navigation className="h-4 w-4" /> Naviguer vers {headingToPickup ? "le point de départ" : "la destination"}
          </a>
        ) : null}
      </SjCard>

      <SjCard style={{ marginTop: 16 }}>
        <div className="sj-between">
          <div>
            <div className="sj-muted">Client</div>
            <b>{booking.client?.full_name || booking.client?.company_name || "Client SentraJet"}</b>
          </div>
          {booking.client?.phone ? (
            <a href={`tel:${booking.client.phone}`} className="sj-btn">
              <Phone className="mr-1 inline h-4 w-4" /> Appeler
            </a>
          ) : null}
        </div>
      </SjCard>

      {LIVE_TRACKING_STATUSES.includes(booking.status) ? (
        <SjCard style={{ marginTop: 16 }}>
          <div className="sj-muted" style={{ marginBottom: 8 }}>Partage de votre position</div>
          <BookingLiveMap bookingId={booking.id} userRole="driver" trackingEnabled />
        </SjCard>
      ) : null}

      <div style={{ marginTop: 16 }}>
        {next && !isDone ? (
          <button
            type="button"
            className="sj-btn sj-btn-primary"
            style={{ width: "100%" }}
            disabled={advancing}
            onClick={() => void trigger(next)}
          >
            {advancing ? "Mise à jour…" : MISSION_ACTION_LABEL[next] ?? next}
          </button>
        ) : null}
        <button
          type="button"
          className="sj-btn"
          style={{ width: "100%", marginTop: 10, color: "var(--color-error)" }}
          onClick={() => setShowIssue(true)}
        >
          <AlertTriangle className="mr-1 inline h-4 w-4" /> Signaler un problème
        </button>
      </div>

      {showIssue ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <SjCard style={{ maxWidth: 420, width: "100%" }}>
            <h3 style={{ marginTop: 0 }}>Signaler un problème</h3>
            {issueSent ? (
              <p style={{ color: "#6de0b0" }}>Signalement envoyé à l’équipe SentraJet.</p>
            ) : (
              <form onSubmit={sendIssue}>
                <div className="sj-toolbar" style={{ marginBottom: 12 }}>
                  {ISSUE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={issuePreset === preset ? "sj-btn sj-btn-primary" : "sj-btn"}
                      onClick={() => setIssuePreset(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className="sj-field">
                  <label>Détails (optionnel)</label>
                  <textarea rows={3} value={issueDetail} onChange={(e) => setIssueDetail(e.target.value)} />
                </div>
                <div className="sj-toolbar" style={{ marginTop: 12 }}>
                  <button type="button" className="sj-btn" onClick={() => setShowIssue(false)} disabled={issueSending}>
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="sj-btn"
                    style={{ borderColor: "var(--color-error)", color: "var(--color-error)" }}
                    disabled={issueSending}
                  >
                    {issueSending ? "Envoi…" : "Envoyer le signalement"}
                  </button>
                </div>
              </form>
            )}
          </SjCard>
        </div>
      ) : null}
    </>
  );
}
