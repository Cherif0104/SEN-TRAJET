"use client";

import { useEffect, useMemo, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { listBusinessRules, ruleNumber } from "@/lib/engines/businessRules";
import {
  createIntercityCorridor,
  grantIntercitySubscription,
  hasActiveSubscription,
  listAllIntercityBookings,
  listAllIntercityDepartures,
  listIntercityCorridors,
  listIntercityDrivers,
  listIntercitySubscriptions,
  setIntercityCorridorActive,
  setIntercityDriverStatus,
  cancelIntercityDeparture,
  type IntercityBooking,
  type IntercityCorridor,
  type IntercityDeparture,
  type IntercityDriver,
  type IntercitySubscription,
} from "@/lib/intercityOps";

type Tab = "corridors" | "chauffeurs" | "departs" | "reservations";

const DRIVER_STATUS_LABEL: Record<string, string> = {
  en_attente: "En attente",
  actif: "Actif",
  suspendu: "Suspendu",
  rejete: "Rejeté",
};

function driverStatusTone(status: string): "success" | "warning" | "danger" | "info" {
  if (status === "actif") return "success";
  if (status === "suspendu" || status === "rejete") return "danger";
  return "warning";
}

export default function AdminIntercitePage() {
  const [tab, setTab] = useState<Tab>("corridors");
  const [corridors, setCorridors] = useState<IntercityCorridor[]>([]);
  const [drivers, setDrivers] = useState<IntercityDriver[]>([]);
  const [subscriptions, setSubscriptions] = useState<IntercitySubscription[]>([]);
  const [departures, setDepartures] = useState<IntercityDeparture[]>([]);
  const [bookings, setBookings] = useState<IntercityBooking[]>([]);
  const [prices, setPrices] = useState({ hebdo: 5000, mensuel: 15000, essaiJours: 15, commissionPercent: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newOrigin, setNewOrigin] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [newRefPrice, setNewRefPrice] = useState("");

  async function reloadAll() {
    setLoading(true);
    try {
      const [c, d, s, dep, b, rules] = await Promise.all([
        listIntercityCorridors(),
        listIntercityDrivers(),
        listIntercitySubscriptions(),
        listAllIntercityDepartures(),
        listAllIntercityBookings(),
        listBusinessRules(),
      ]);
      setCorridors(c);
      setDrivers(d);
      setSubscriptions(s);
      setDepartures(dep);
      setBookings(b);
      setPrices({
        hebdo: ruleNumber(rules, "intercity", "subscription_price_hebdomadaire_fcfa", 5000),
        mensuel: ruleNumber(rules, "intercity", "subscription_price_mensuel_fcfa", 15000),
        essaiJours: ruleNumber(rules, "intercity", "essai_gratuit_jours", 15),
        commissionPercent: ruleNumber(rules, "intercity", "commission_percent", 10),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reloadAll();
  }, []);

  const driverById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);

  async function handleCreateCorridor(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrigin.trim() || !newDestination.trim()) return;
    try {
      await createIntercityCorridor({
        originCity: newOrigin,
        destinationCity: newDestination,
        referencePriceFcfa: newRefPrice ? Number(newRefPrice) : null,
      });
      setNewOrigin("");
      setNewDestination("");
      setNewRefPrice("");
      await reloadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de créer ce corridor.");
    }
  }

  async function grantAccess(driverId: string, corridorId: string, plan: "essai_gratuit" | "hebdomadaire" | "mensuel") {
    const priceMap = { essai_gratuit: 0, hebdomadaire: prices.hebdo, mensuel: prices.mensuel };
    const durationMap = { essai_gratuit: prices.essaiJours, hebdomadaire: 7, mensuel: 30 };
    try {
      await grantIntercitySubscription({
        intercityDriverId: driverId,
        corridorId,
        plan,
        priceFcfaPaid: priceMap[plan],
        durationDays: durationMap[plan],
      });
      await reloadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d’accorder cet accès.");
    }
  }

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead
        eyebrow="Nouvelle activité"
        title="SentraJet Intercité"
      />
      <p className="sj-muted" style={{ marginBottom: 16 }}>
        Transport interurbain en véhicules partenaires indépendants (façon Allo Dakar) — entièrement
        séparé de la flotte Premium. Commission {prices.commissionPercent}% retenue à la source sur
        chaque réservation payée ; accès de publication par corridor, encaissé d&apos;avance.
      </p>
      {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}

      <div className="sj-toolbar" style={{ marginBottom: 16 }}>
        {(["corridors", "chauffeurs", "departs", "reservations"] as Tab[]).map((t) => (
          <button key={t} type="button" className={tab === t ? "sj-btn sj-btn-primary" : "sj-btn"} onClick={() => setTab(t)}>
            {t === "corridors" ? "Corridors" : t === "chauffeurs" ? "Chauffeurs" : t === "departs" ? "Départs" : "Réservations"}
          </button>
        ))}
      </div>

      {tab === "corridors" ? (
        <>
          <SjCard>
            <h3 style={{ marginTop: 0 }}>Nouveau corridor</h3>
            <form onSubmit={handleCreateCorridor} className="sj-form-grid">
              <div className="sj-field">
                <label>Ville de départ</label>
                <input value={newOrigin} onChange={(e) => setNewOrigin(e.target.value)} placeholder="Dakar" />
              </div>
              <div className="sj-field">
                <label>Ville d’arrivée</label>
                <input value={newDestination} onChange={(e) => setNewDestination(e.target.value)} placeholder="Saint-Louis" />
              </div>
              <div className="sj-field">
                <label>Prix indicatif / place (FCFA)</label>
                <input type="number" value={newRefPrice} onChange={(e) => setNewRefPrice(e.target.value)} placeholder="5000" />
              </div>
              <button type="submit" className="sj-btn sj-btn-primary" style={{ alignSelf: "end" }}>
                Ajouter
              </button>
            </form>
          </SjCard>
          <div className="sj-list" style={{ marginTop: 12 }}>
            {corridors.map((c) => (
              <SjCard key={c.id}>
                <div className="sj-between">
                  <div>
                    <b>{c.origin_city} → {c.destination_city}</b>
                    <div className="sj-muted">
                      {c.reference_price_fcfa ? `${formatFcfa(c.reference_price_fcfa)} indicatif/place` : "Prix libre"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <SjBadge tone={c.is_active ? "success" : "danger"}>{c.is_active ? "Actif" : "Désactivé"}</SjBadge>
                    <button
                      type="button"
                      className="sj-btn sj-btn-ghost"
                      style={{ display: "block", marginTop: 6 }}
                      onClick={() => void setIntercityCorridorActive(c.id, !c.is_active).then(reloadAll)}
                    >
                      {c.is_active ? "Désactiver" : "Réactiver"}
                    </button>
                  </div>
                </div>
              </SjCard>
            ))}
            {!corridors.length ? <SjCard><p className="sj-muted">Aucun corridor créé pour le moment.</p></SjCard> : null}
          </div>
        </>
      ) : null}

      {tab === "chauffeurs" ? (
        <div className="sj-list">
          {drivers.map((d) => {
            const driverSubs = subscriptions.filter((s) => s.intercity_driver_id === d.id);
            return (
              <SjCard key={d.id}>
                <div className="sj-between">
                  <div>
                    <b>{d.full_name}</b>
                    <div className="sj-muted">{d.phone} {d.garage_name ? `· Garage ${d.garage_name}` : ""}</div>
                  </div>
                  <SjBadge tone={driverStatusTone(d.status)}>{DRIVER_STATUS_LABEL[d.status] ?? d.status}</SjBadge>
                </div>
                <div className="sj-toolbar" style={{ marginTop: 10 }}>
                  {d.status !== "actif" ? (
                    <button type="button" className="sj-btn" onClick={() => void setIntercityDriverStatus(d.id, "actif").then(reloadAll)}>
                      Activer
                    </button>
                  ) : null}
                  {d.status !== "suspendu" ? (
                    <button type="button" className="sj-btn" style={{ color: "var(--color-error)" }} onClick={() => void setIntercityDriverStatus(d.id, "suspendu").then(reloadAll)}>
                      Suspendre
                    </button>
                  ) : null}
                </div>
                <div className="sj-muted" style={{ marginTop: 10 }}>Accès par corridor</div>
                <div className="sj-list" style={{ marginTop: 6 }}>
                  {corridors.map((c) => {
                    const active = hasActiveSubscription(driverSubs, c.id);
                    return (
                      <div key={c.id} className="sj-row">
                        <span>{c.origin_city} → {c.destination_city}</span>
                        {active ? (
                          <SjBadge tone="success">Accès actif</SjBadge>
                        ) : (
                          <div className="sj-toolbar">
                            <button type="button" className="sj-btn sj-btn-ghost" onClick={() => void grantAccess(d.id, c.id, "essai_gratuit")}>
                              Essai gratuit ({prices.essaiJours}j)
                            </button>
                            <button type="button" className="sj-btn sj-btn-ghost" onClick={() => void grantAccess(d.id, c.id, "hebdomadaire")}>
                              Semaine ({formatFcfa(prices.hebdo)})
                            </button>
                            <button type="button" className="sj-btn sj-btn-ghost" onClick={() => void grantAccess(d.id, c.id, "mensuel")}>
                              Mois ({formatFcfa(prices.mensuel)})
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SjCard>
            );
          })}
          {!drivers.length ? <SjCard><p className="sj-muted">Aucun chauffeur intercité inscrit pour le moment.</p></SjCard> : null}
        </div>
      ) : null}

      {tab === "departs" ? (
        <div className="sj-list">
          {departures.map((dep) => (
            <SjCard key={dep.id}>
              <div className="sj-between">
                <div>
                  <b>{dep.corridor?.origin_city} → {dep.corridor?.destination_city}</b>
                  <div className="sj-muted">
                    {new Date(dep.departure_at).toLocaleString("fr-FR")} · {dep.driver?.full_name ?? driverById.get(dep.intercity_driver_id)?.full_name} ·{" "}
                    {dep.vehicle?.plate_number} · {formatFcfa(dep.price_per_seat_fcfa)}/place
                  </div>
                  <div className="sj-muted">{dep.seats_available}/{dep.seats_total} places disponibles</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <SjBadge tone={dep.status === "publie" ? "success" : dep.status === "annule" ? "danger" : "info"}>{dep.status}</SjBadge>
                  {dep.status === "publie" ? (
                    <button
                      type="button"
                      className="sj-btn sj-btn-ghost"
                      style={{ display: "block", marginTop: 6 }}
                      onClick={() => void cancelIntercityDeparture(dep.id).then(reloadAll)}
                    >
                      Annuler
                    </button>
                  ) : null}
                </div>
              </div>
            </SjCard>
          ))}
          {!departures.length ? <SjCard><p className="sj-muted">Aucun départ publié pour le moment.</p></SjCard> : null}
        </div>
      ) : null}

      {tab === "reservations" ? (
        <div className="sj-list">
          {bookings.map((b) => (
            <SjCard key={b.id}>
              <div className="sj-between">
                <div>
                  <b>{b.client_full_name}</b>
                  <div className="sj-muted">{b.client_phone} · {b.seats_booked} place{b.seats_booked > 1 ? "s" : ""}</div>
                  <div className="sj-muted">{formatFcfa(b.amount_fcfa)} · commission {formatFcfa(b.commission_fcfa)} · chauffeur {formatFcfa(b.driver_payout_fcfa)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <SjBadge tone={b.status === "annulee" ? "danger" : "info"}>{b.status}</SjBadge>
                  <div className="sj-muted" style={{ marginTop: 4 }}>{b.payment_status}</div>
                </div>
              </div>
            </SjCard>
          ))}
          {!bookings.length ? <SjCard><p className="sj-muted">Aucune réservation pour le moment.</p></SjCard> : null}
        </div>
      ) : null}
    </>
  );
}
