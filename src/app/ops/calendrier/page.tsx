"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight, CheckCircle2, XCircle, UserX, AlertTriangle } from "lucide-react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { BookingForm } from "@/components/sentrajet/BookingForm";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  getBookingById,
  listPlatformBookings,
  updateBookingWorkflowStatus,
  type PlatformBooking,
} from "@/lib/platformOps";
import { SERVICE_TYPE_LABELS, formatFcfa, type PricingSegment, type ServiceType } from "@/lib/sentrajetPricing";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

/**
 * Dakar est en UTC+0 toute l'année (pas d'heure d'été) : les heures UTC de `pickup_time`
 * correspondent donc toujours exactement à l'heure locale Dakar. On peut utiliser les getters
 * UTC directement, sans dépendre du fuseau horaire du navigateur qui consulte cette page.
 */
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** Au-delà de ce délai après l'heure de départ, une réservation non close est considérée "en retard". */
const LATE_GRACE_MINUTES = 45;

/** Statuts pour lesquels la notion de "retard" ne s'applique pas (déjà en cours ou déjà closes). */
const NOT_LATE_CANDIDATE_STATUSES = [
  "en_cours",
  "chauffeur_en_route",
  "chauffeur_arrive",
  "client_pris_en_charge",
  "terminee",
  "annulee_client",
  "annulee_sentrajet",
  "remboursee",
  "remboursement_en_cours",
  "no_show",
  "devis_refuse",
];

const UNASSIGNED_BUT_ACTIVE_STATUSES = [
  "demande_recue",
  "demande",
  "info_demandee",
  "devis_envoye",
  "devis_accepte",
  "en_attente_de_paiement",
  "payee",
  "confirmee",
  "chauffeur_a_assigner",
];
const TERMINAL_STATUSES = ["terminee", "annulee_client", "annulee_sentrajet", "remboursee", "no_show"];

type FilterKey = "toutes" | "a_affecter" | "en_retard";

function todayKey(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().slice(0, 10);
}

function dayKeyOf(iso: string): string {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
}

function addDaysToKey(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

function formatDayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

function sourceLabel(b: PlatformBooking): { label: string; tone: "success" | "warning" | "info" | "danger" } {
  if (b.partner_contract_id && b.partner_contract) {
    return { label: `Partenaire · ${b.partner_contract.partner_name}`, tone: "info" };
  }
  if (b.partner_contract_id) return { label: "Partenaire", tone: "info" };
  if (b.client?.full_name || b.client?.company_name) {
    return { label: b.client.company_name || b.client.full_name || "Client", tone: "success" };
  }
  return { label: "Réservation directe", tone: "warning" };
}

function isLate(b: PlatformBooking, nowMs: number): boolean {
  if (NOT_LATE_CANDIDATE_STATUSES.includes(b.status)) return false;
  return nowMs - new Date(b.pickup_time).getTime() > LATE_GRACE_MINUTES * 60_000;
}

const CANCEL_REASONS: Array<{ value: "annulee_client"; label: string } | { value: "annulee_sentrajet"; label: string }> = [
  { value: "annulee_client", label: "Annulation client" },
  { value: "annulee_sentrajet", label: "Annulation SentraJet" },
];

function CalendrierContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const deepLinkBookingId = searchParams.get("bookingId");

  const [dayKey, setDayKey] = useState(todayKey());
  const [bookings, setBookings] = useState<PlatformBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addAtHour, setAddAtHour] = useState<number | null>(null);
  const [segment, setSegment] = useState<PricingSegment>("client");
  const [filter, setFilter] = useState<FilterKey>("toutes");
  const [now, setNow] = useState(() => Date.now());
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<"annulee_client" | "annulee_sentrajet">("annulee_client");
  const [cancelFee, setCancelFee] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const hourRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const didAutoScroll = useRef(false);

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const rangeStart = `${key}T00:00:00.000Z`;
      const rangeEnd = `${addDaysToKey(key, 1)}T00:00:00.000Z`;
      const rows = await listPlatformBookings({ rangeStart, rangeEnd });
      setBookings(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les réservations de cette journée.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(dayKey);
  }, [dayKey, load]);

  // Rafraîchit "maintenant" toutes les minutes pour recalculer les retards et l'indicateur d'heure actuelle.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Lien profond depuis une notification (?bookingId=...) : saute au bon jour et surligne la carte.
  useEffect(() => {
    if (!deepLinkBookingId) return;
    void getBookingById(deepLinkBookingId)
      .then((b) => {
        if (!b) return;
        setDayKey(dayKeyOf(b.pickup_time));
        setHighlightId(b.id);
      })
      .catch(() => undefined);
  }, [deepLinkBookingId]);

  useEffect(() => {
    if (!highlightId || loading) return;
    const el = document.getElementById(`booking-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const t = setTimeout(() => {
      setHighlightId(null);
      router.replace("/ops/calendrier");
    }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, loading]);

  // Défile automatiquement vers l'heure courante au premier chargement du jour d'aujourd'hui.
  useEffect(() => {
    if (loading || didAutoScroll.current || highlightId) return;
    if (dayKey !== todayKey()) return;
    const currentHour = new Date().getUTCHours();
    const target = hourRefs.current[Math.max(0, currentHour - 1)];
    if (target) {
      target.scrollIntoView({ behavior: "auto", block: "start" });
      didAutoScroll.current = true;
    }
  }, [loading, dayKey, highlightId]);

  const byHour = useMemo(() => {
    const map = new Map<number, PlatformBooking[]>();
    for (const b of bookings) {
      const h = new Date(b.pickup_time).getUTCHours();
      const list = map.get(h) ?? [];
      list.push(b);
      map.set(h, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.pickup_time).getTime() - new Date(b.pickup_time).getTime());
    }
    return map;
  }, [bookings]);

  const kpis = useMemo(() => {
    const total = bookings.length;
    const aAffecter = bookings.filter(
      (b) => !b.service_order?.dispatch && UNASSIGNED_BUT_ACTIVE_STATUSES.includes(b.status)
    ).length;
    const enRetard = bookings.filter((b) => isLate(b, now)).length;
    const terminees = bookings.filter((b) => b.status === "terminee").length;
    return { total, aAffecter, enRetard, terminees };
  }, [bookings, now]);

  function matchesFilter(b: PlatformBooking): boolean {
    if (filter === "a_affecter") return !b.service_order?.dispatch && UNASSIGNED_BUT_ACTIVE_STATUSES.includes(b.status);
    if (filter === "en_retard") return isLate(b, now);
    return true;
  }

  function openAddForm(hour: number) {
    setAddAtHour(hour);
    setSegment("client");
  }

  function closeAddForm() {
    setAddAtHour(null);
  }

  async function markRealized(b: PlatformBooking) {
    if (!window.confirm(`Marquer ${b.reference || "cette réservation"} comme réalisée ?`)) return;
    setBusyId(b.id);
    try {
      await updateBookingWorkflowStatus({
        bookingId: b.id,
        toStatus: "terminee",
        note: "Marquée réalisée manuellement depuis le calendrier Ops",
      });
      await load(dayKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de mettre à jour cette réservation.");
    } finally {
      setBusyId(null);
    }
  }

  async function markNoShow(b: PlatformBooking) {
    if (!window.confirm(`Marquer ${b.reference || "cette réservation"} en no-show (client absent) ?`)) return;
    setBusyId(b.id);
    try {
      await updateBookingWorkflowStatus({
        bookingId: b.id,
        toStatus: "no_show",
        note: "Client absent au point de rendez-vous — constaté depuis le calendrier Ops",
      });
      await load(dayKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de mettre à jour cette réservation.");
    } finally {
      setBusyId(null);
    }
  }

  function openCancelForm(b: PlatformBooking) {
    setCancelingId(b.id);
    setCancelReason("annulee_client");
    setCancelFee("");
    setCancelNote("");
  }

  async function confirmCancel(b: PlatformBooking) {
    setBusyId(b.id);
    try {
      await updateBookingWorkflowStatus({
        bookingId: b.id,
        toStatus: cancelReason,
        note: cancelNote.trim() || undefined,
        cancellationFeeFcfa: cancelFee ? Number(cancelFee) : 0,
      });
      setCancelingId(null);
      await load(dayKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d’annuler cette réservation.");
    } finally {
      setBusyId(null);
    }
  }

  const isToday = dayKey === todayKey();
  const currentHour = new Date(now).getUTCHours();

  return (
    <>
      <SjSectionHead
        eyebrow="Vue 360°"
        title="Calendrier des réservations"
        action={
          <button type="button" className="sj-btn sj-btn-primary" onClick={() => openAddForm(new Date().getUTCHours())}>
            <Plus className="mr-1 inline h-4 w-4" /> Nouvelle réservation
          </button>
        }
      />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Toutes les réservations de la journée, qu&apos;elles viennent d&apos;un client, d&apos;un partenaire ou saisies
        par l&apos;équipe — défilez par heure, traitez les retards et ajoutez une course sur un créneau libre.
      </p>

      <div className="sj-toolbar" style={{ marginBottom: 14, justifyContent: "space-between" }}>
        <button type="button" className="sj-btn sj-btn-ghost" onClick={() => setDayKey((k) => addDaysToKey(k, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div style={{ textAlign: "center" }}>
          <b style={{ textTransform: "capitalize" }}>{formatDayLabel(dayKey)}</b>
          {!isToday ? (
            <button type="button" className="sj-btn sj-btn-ghost" style={{ marginLeft: 8 }} onClick={() => setDayKey(todayKey())}>
              Aujourd&apos;hui
            </button>
          ) : null}
        </div>
        <button type="button" className="sj-btn sj-btn-ghost" onClick={() => setDayKey((k) => addDaysToKey(k, 1))}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}

      <div className="sj-grid sj-grid-4" style={{ marginBottom: 12 }}>
        <SjCard>
          <div className="sj-muted">Réservations du jour</div>
          <div className="sj-metric">{kpis.total.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard style={kpis.aAffecter ? { borderColor: "var(--color-warning)" } : undefined}>
          <div className="sj-muted">À affecter</div>
          <div className="sj-metric">{kpis.aAffecter.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard style={kpis.enRetard ? { borderColor: "var(--color-error)" } : undefined}>
          <div className="sj-muted">En retard</div>
          <div className="sj-metric">{kpis.enRetard.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Terminées</div>
          <div className="sj-metric">{kpis.terminees.toString().padStart(2, "0")}</div>
        </SjCard>
      </div>

      <div className="sj-tabs" style={{ marginBottom: 14 }}>
        <button type="button" className={filter === "toutes" ? "sj-btn sj-btn-primary" : "sj-btn"} onClick={() => setFilter("toutes")}>
          Toutes ({kpis.total})
        </button>
        <button type="button" className={filter === "a_affecter" ? "sj-btn sj-btn-primary" : "sj-btn"} onClick={() => setFilter("a_affecter")}>
          À affecter ({kpis.aAffecter})
        </button>
        <button type="button" className={filter === "en_retard" ? "sj-btn sj-btn-primary" : "sj-btn"} onClick={() => setFilter("en_retard")}>
          En retard ({kpis.enRetard})
        </button>
      </div>

      {loading ? (
        <BrandedLoader />
      ) : (
        <div className="sj-timeline" ref={timelineRef}>
          {HOURS.map((hour) => {
            const items = (byHour.get(hour) ?? []).filter(matchesFilter);
            const isCurrentHour = isToday && hour === currentHour;
            if (filter !== "toutes" && !items.length) return null;
            return (
              <div
                key={hour}
                ref={(el) => {
                  hourRefs.current[hour] = el;
                }}
                className={`sj-timeline-row ${items.length ? "has-bookings" : ""} ${isCurrentHour ? "is-now" : ""}`}
              >
                <div className="sj-timeline-hour">
                  {hour.toString().padStart(2, "0")}:00
                  {isCurrentHour ? <span className="sj-timeline-now-dot" /> : null}
                </div>
                <div className="sj-timeline-content">
                  {items.length ? (
                    <>
                      {items.map((b) => {
                        const source = sourceLabel(b);
                        const driver = b.service_order?.dispatch?.driver;
                        const vehicle = b.service_order?.dispatch?.vehicle;
                        const late = isLate(b, now);
                        const actionable = !TERMINAL_STATUSES.includes(b.status);
                        const isCanceling = cancelingId === b.id;
                        return (
                          <div
                            key={b.id}
                            id={`booking-${b.id}`}
                            className={`sj-timeline-card ${late ? "is-late" : ""} ${highlightId === b.id ? "is-highlighted" : ""}`}
                          >
                            <div className="sj-between">
                              <b>
                                {b.reference || b.id.slice(0, 8)} ·{" "}
                                {new Date(b.pickup_time).toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "UTC",
                                })}
                              </b>
                              <SjBadge tone={bookingStatusTone(b.status)}>
                                {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                              </SjBadge>
                            </div>
                            <div className="sj-muted" style={{ marginTop: 4 }}>
                              {SERVICE_TYPE_LABELS[b.service_type as ServiceType] || b.service_type} · {b.pickup} → {b.dropoff}
                            </div>
                            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                              <SjBadge tone={source.tone}>{source.label}</SjBadge>
                              <span className="sj-muted">{b.passengers} passager{b.passengers > 1 ? "s" : ""}</span>
                              {driver ? (
                                <span className="sj-muted">
                                  · {driver.full_name}
                                  {vehicle ? ` (${vehicle.plate_number})` : ""}
                                </span>
                              ) : (
                                <span style={{ color: "var(--color-warning)" }}>· Aucun chauffeur affecté</span>
                              )}
                              {b.estimated_price != null ? (
                                <span className="sj-gold">· {formatFcfa(Number(b.estimated_price))}</span>
                              ) : null}
                            </div>
                            {late ? (
                              <div className="sj-timeline-late-flag">
                                <AlertTriangle className="h-3.5 w-3.5" /> En retard — à clôturer ou signaler un incident
                              </div>
                            ) : null}

                            {actionable ? (
                              isCanceling ? (
                                <div className="sj-timeline-cancel-form">
                                  <div className="sj-tabs" style={{ marginBottom: 6 }}>
                                    {CANCEL_REASONS.map((r) => (
                                      <button
                                        key={r.value}
                                        type="button"
                                        className={cancelReason === r.value ? "sj-btn sj-btn-primary" : "sj-btn"}
                                        onClick={() => setCancelReason(r.value)}
                                      >
                                        {r.label}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="sj-form-grid">
                                    <div className="sj-field">
                                      <label>Pénalité (FCFA)</label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={cancelFee}
                                        onChange={(e) => setCancelFee(e.target.value)}
                                        placeholder="0"
                                      />
                                    </div>
                                    <div className="sj-field">
                                      <label>Note interne (optionnel)</label>
                                      <input value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} placeholder="Motif détaillé…" />
                                    </div>
                                  </div>
                                  <div className="sj-toolbar" style={{ marginTop: 8, justifyContent: "flex-start" }}>
                                    <button type="button" className="sj-btn" onClick={() => setCancelingId(null)} disabled={busyId === b.id}>
                                      Retour
                                    </button>
                                    <button
                                      type="button"
                                      className="sj-btn sj-btn-primary"
                                      style={{ background: "var(--color-error)" }}
                                      disabled={busyId === b.id}
                                      onClick={() => void confirmCancel(b)}
                                    >
                                      {busyId === b.id ? "…" : "Confirmer l’annulation"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="sj-toolbar" style={{ marginTop: 8, justifyContent: "flex-start", flexWrap: "wrap" }}>
                                  <button
                                    type="button"
                                    className="sj-btn"
                                    style={{ color: "var(--color-success)" }}
                                    disabled={busyId === b.id}
                                    onClick={() => void markRealized(b)}
                                  >
                                    <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> Réalisée
                                  </button>
                                  {late ? (
                                    <button
                                      type="button"
                                      className="sj-btn"
                                      style={{ color: "var(--color-warning)" }}
                                      disabled={busyId === b.id}
                                      onClick={() => void markNoShow(b)}
                                    >
                                      <UserX className="mr-1 inline h-3.5 w-3.5" /> No-show
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="sj-btn"
                                    style={{ color: "var(--color-error)" }}
                                    disabled={busyId === b.id}
                                    onClick={() => openCancelForm(b)}
                                  >
                                    <XCircle className="mr-1 inline h-3.5 w-3.5" /> Annuler
                                  </button>
                                </div>
                              )
                            ) : null}
                          </div>
                        );
                      })}
                      <button type="button" className="sj-timeline-add" onClick={() => openAddForm(hour)} style={{ alignSelf: "flex-start" }}>
                        <Plus className="h-3 w-3" /> Ajouter à {hour.toString().padStart(2, "0")}h
                      </button>
                    </>
                  ) : (
                    <div className="sj-timeline-empty">
                      <span>Disponible</span>
                      <button type="button" className="sj-timeline-add" onClick={() => openAddForm(hour)}>
                        <Plus className="h-3 w-3" /> Ajouter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addAtHour !== null ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
          onClick={closeAddForm}
        >
          <SjCard style={{ maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="sj-between" style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>
                Nouvelle réservation · {formatDayLabel(dayKey)} {addAtHour.toString().padStart(2, "0")}:00
              </h3>
              <button type="button" className="sj-btn sj-btn-ghost" onClick={closeAddForm}>
                Fermer
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 rounded-2xl bg-[var(--color-surface-secondary)] p-1.5 sm:grid-cols-2" style={{ marginBottom: 14 }}>
              {(["client", "partner"] as PricingSegment[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSegment(option)}
                  className={`min-h-11 rounded-xl px-3 text-sm font-bold transition ${
                    segment === option
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-sm"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {option === "client" ? "Tarif client direct" : "Tarif partenaire B2B"}
                </button>
              ))}
            </div>
            <BookingForm
              key={`${segment}-${addAtHour}`}
              segment={segment}
              initialDate={dayKey}
              initialTime={`${addAtHour.toString().padStart(2, "0")}:00`}
              onCreated={() => {
                closeAddForm();
                void load(dayKey);
              }}
            />
          </SjCard>
        </div>
      ) : null}
    </>
  );
}

export default function OpsCalendrierPage() {
  return (
    <Suspense fallback={<BrandedLoader />}>
      <CalendrierContent />
    </Suspense>
  );
}
