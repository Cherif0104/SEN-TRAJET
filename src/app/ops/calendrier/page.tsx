"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { BookingForm } from "@/components/sentrajet/BookingForm";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  listPlatformBookings,
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

function todayKey(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().slice(0, 10);
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

export default function OpsCalendrierPage() {
  const [dayKey, setDayKey] = useState(todayKey());
  const [bookings, setBookings] = useState<PlatformBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addAtHour, setAddAtHour] = useState<number | null>(null);
  const [segment, setSegment] = useState<PricingSegment>("client");

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
    const affectees = bookings.filter((b) => Boolean(b.service_order?.dispatch) && !TERMINAL_STATUSES.includes(b.status)).length;
    const terminees = bookings.filter((b) => b.status === "terminee").length;
    return { total, aAffecter, affectees, terminees };
  }, [bookings]);

  function openAddForm(hour: number) {
    setAddAtHour(hour);
    setSegment("client");
  }

  function closeAddForm() {
    setAddAtHour(null);
  }

  const isToday = dayKey === todayKey();

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
        par l&apos;équipe — défilez par heure et ajoutez une course sur un créneau libre.
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

      <div className="sj-grid sj-grid-4" style={{ marginBottom: 16 }}>
        <SjCard>
          <div className="sj-muted">Réservations du jour</div>
          <div className="sj-metric">{kpis.total.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard style={kpis.aAffecter ? { borderColor: "var(--color-warning)" } : undefined}>
          <div className="sj-muted">À affecter</div>
          <div className="sj-metric">{kpis.aAffecter.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Affectées / en cours</div>
          <div className="sj-metric">{kpis.affectees.toString().padStart(2, "0")}</div>
        </SjCard>
        <SjCard>
          <div className="sj-muted">Terminées</div>
          <div className="sj-metric">{kpis.terminees.toString().padStart(2, "0")}</div>
        </SjCard>
      </div>

      {loading ? (
        <BrandedLoader />
      ) : (
        <div className="sj-timeline">
          {HOURS.map((hour) => {
            const items = byHour.get(hour) ?? [];
            return (
              <div key={hour} className={`sj-timeline-row ${items.length ? "has-bookings" : ""}`}>
                <div className="sj-timeline-hour">{hour.toString().padStart(2, "0")}:00</div>
                <div className="sj-timeline-content">
                  {items.length ? (
                    <>
                      {items.map((b) => {
                        const source = sourceLabel(b);
                        const driver = b.service_order?.dispatch?.driver;
                        const vehicle = b.service_order?.dispatch?.vehicle;
                        return (
                          <div key={b.id} className="sj-timeline-card">
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
