"use client";

import { useEffect, useMemo, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { formatFcfa } from "@/lib/sentrajetPricing";
import { listBusinessRules, ruleNumber } from "@/lib/engines/businessRules";
import {
  createAlloDakarCorridor,
  createAlloDakarDriverByStaff,
  createGarageWithManager,
  formatSubscriptionPeriod,
  getActiveSubscription,
  grantAlloDakarSubscription,
  listAllAlloDakarBookings,
  listAllAlloDakarDepartures,
  listAllGarages,
  listAlloDakarCorridors,
  listAlloDakarDrivers,
  listAlloDakarSubscriptions,
  setAlloDakarCorridorActive,
  setAlloDakarDriverStatus,
  setGarageStatus,
  cancelAlloDakarDeparture,
  type AlloDakarBooking,
  type AlloDakarCorridor,
  type AlloDakarDeparture,
  type AlloDakarDriver,
  type AlloDakarGarage,
  type AlloDakarSubscription,
} from "@/lib/alloDakarOps";

type Tab = "corridors" | "chauffeurs" | "garages" | "departs" | "reservations";

const GARAGE_STATUS_LABEL: Record<string, string> = {
  en_attente: "En attente",
  actif: "Actif",
  suspendu: "Suspendu",
};

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

export default function AdminAlloDakarPage() {
  const [tab, setTab] = useState<Tab>("corridors");
  const [corridors, setCorridors] = useState<AlloDakarCorridor[]>([]);
  const [drivers, setDrivers] = useState<AlloDakarDriver[]>([]);
  const [subscriptions, setSubscriptions] = useState<AlloDakarSubscription[]>([]);
  const [garages, setGarages] = useState<AlloDakarGarage[]>([]);
  const [departures, setDepartures] = useState<AlloDakarDeparture[]>([]);
  const [bookings, setBookings] = useState<AlloDakarBooking[]>([]);
  const [prices, setPrices] = useState({ hebdo: 5000, mensuel: 15000, essaiJours: 15, commissionPercent: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showNewDriver, setShowNewDriver] = useState(false);
  const [ndFullName, setNdFullName] = useState("");
  const [ndPhone, setNdPhone] = useState("");
  const [ndIdCard, setNdIdCard] = useState("");
  const [ndGarageId, setNdGarageId] = useState("");

  const [showNewGarage, setShowNewGarage] = useState(false);
  const [ngEmail, setNgEmail] = useState("");
  const [ngPassword, setNgPassword] = useState("");
  const [ngFullName, setNgFullName] = useState("");
  const [ngGarageName, setNgGarageName] = useState("");
  const [ngPhone, setNgPhone] = useState("");
  const [ngCity, setNgCity] = useState("");
  const [creatingGarage, setCreatingGarage] = useState(false);

  const [newOrigin, setNewOrigin] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [newRefPrice, setNewRefPrice] = useState("");

  async function reloadAll() {
    setLoading(true);
    try {
      const [c, d, s, gg, dep, b, rules] = await Promise.all([
        listAlloDakarCorridors(),
        listAlloDakarDrivers(),
        listAlloDakarSubscriptions(),
        listAllGarages(),
        listAllAlloDakarDepartures(),
        listAllAlloDakarBookings(),
        listBusinessRules(),
      ]);
      setCorridors(c);
      setDrivers(d);
      setSubscriptions(s);
      setGarages(gg);
      setDepartures(dep);
      setBookings(b);
      setPrices({
        hebdo: ruleNumber(rules, "allo_dakar", "subscription_price_hebdomadaire_fcfa", 5000),
        mensuel: ruleNumber(rules, "allo_dakar", "subscription_price_mensuel_fcfa", 15000),
        essaiJours: ruleNumber(rules, "allo_dakar", "essai_gratuit_jours", 15),
        commissionPercent: ruleNumber(rules, "allo_dakar", "commission_percent", 10),
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
      await createAlloDakarCorridor({
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

  async function handleCreateDriver(e: React.FormEvent) {
    e.preventDefault();
    if (!ndFullName.trim() || !ndPhone.trim()) return;
    try {
      await createAlloDakarDriverByStaff({
        fullName: ndFullName,
        phone: ndPhone,
        idCardNumber: ndIdCard || null,
        garageId: ndGarageId || null,
      });
      setNdFullName("");
      setNdPhone("");
      setNdIdCard("");
      setNdGarageId("");
      setShowNewDriver(false);
      await reloadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de créer ce chauffeur.");
    }
  }

  async function handleCreateGarage(e: React.FormEvent) {
    e.preventDefault();
    if (!ngEmail.trim() || !ngPassword || !ngFullName.trim() || !ngGarageName.trim() || !ngPhone.trim()) return;
    setCreatingGarage(true);
    try {
      await createGarageWithManager({
        email: ngEmail,
        password: ngPassword,
        fullName: ngFullName,
        garageName: ngGarageName,
        phone: ngPhone,
        city: ngCity || null,
      });
      setNgEmail("");
      setNgPassword("");
      setNgFullName("");
      setNgGarageName("");
      setNgPhone("");
      setNgCity("");
      setShowNewGarage(false);
      await reloadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de créer ce garage.");
    } finally {
      setCreatingGarage(false);
    }
  }

  async function grantAccess(driverId: string, corridorId: string, plan: "essai_gratuit" | "hebdomadaire" | "mensuel") {
    const priceMap = { essai_gratuit: 0, hebdomadaire: prices.hebdo, mensuel: prices.mensuel };
    const durationMap = { essai_gratuit: prices.essaiJours, hebdomadaire: 7, mensuel: 30 };
    try {
      await grantAlloDakarSubscription({
        alloDakarDriverId: driverId,
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
        title="SentraJet Allo Dakar"
      />
      <p className="sj-muted" style={{ marginBottom: 16 }}>
        Transport interurbain en véhicules partenaires indépendants (façon Allo Dakar) — entièrement
        séparé de la flotte Premium. Commission {prices.commissionPercent}% retenue à la source sur
        chaque réservation payée ; accès de publication par corridor, encaissé d&apos;avance.
      </p>
      {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}

      <div className="sj-tabs" style={{ marginBottom: 16 }}>
        {(["corridors", "chauffeurs", "garages", "departs", "reservations"] as Tab[]).map((t) => (
          <button key={t} type="button" className={tab === t ? "sj-btn sj-btn-primary" : "sj-btn"} onClick={() => setTab(t)}>
            {t === "corridors"
              ? "Corridors"
              : t === "chauffeurs"
                ? "Chauffeurs"
                : t === "garages"
                  ? "Garages"
                  : t === "departs"
                    ? "Départs"
                    : "Réservations"}
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
                      onClick={() => void setAlloDakarCorridorActive(c.id, !c.is_active).then(reloadAll)}
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
        <>
          <SjCard>
            <div className="sj-between">
              <h3 style={{ margin: 0 }}>Créer un chauffeur</h3>
              <button type="button" className="sj-btn" onClick={() => setShowNewDriver((v) => !v)}>
                {showNewDriver ? "Fermer" : "+ Nouveau chauffeur"}
              </button>
            </div>
            {showNewDriver ? (
              <form onSubmit={handleCreateDriver} className="sj-form-grid" style={{ marginTop: 12 }}>
                <div className="sj-field">
                  <label>Nom complet</label>
                  <input value={ndFullName} onChange={(e) => setNdFullName(e.target.value)} required />
                </div>
                <div className="sj-field">
                  <label>Téléphone</label>
                  <input value={ndPhone} onChange={(e) => setNdPhone(e.target.value)} placeholder="+221 …" required />
                </div>
                <div className="sj-field">
                  <label>N° CNI (optionnel)</label>
                  <input value={ndIdCard} onChange={(e) => setNdIdCard(e.target.value)} />
                </div>
                <div className="sj-field">
                  <label>Garage de rattachement (optionnel)</label>
                  <select value={ndGarageId} onChange={(e) => setNdGarageId(e.target.value)}>
                    <option value="">Aucun (indépendant)</option>
                    {garages.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="sj-btn sj-btn-primary" style={{ alignSelf: "end" }}>
                  Créer (statut actif d’emblée)
                </button>
              </form>
            ) : null}
          </SjCard>
          <div className="sj-list" style={{ marginTop: 12 }}>
          {drivers.map((d) => {
            const driverSubs = subscriptions.filter((s) => s.allo_dakar_driver_id === d.id);
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
                    <button type="button" className="sj-btn" onClick={() => void setAlloDakarDriverStatus(d.id, "actif").then(reloadAll)}>
                      Activer
                    </button>
                  ) : null}
                  {d.status !== "suspendu" ? (
                    <button type="button" className="sj-btn" style={{ color: "var(--color-error)" }} onClick={() => void setAlloDakarDriverStatus(d.id, "suspendu").then(reloadAll)}>
                      Suspendre
                    </button>
                  ) : null}
                </div>
                <div className="sj-muted" style={{ marginTop: 10 }}>Accès par corridor</div>
                <div className="sj-list" style={{ marginTop: 6 }}>
                  {corridors.map((c) => {
                    const active = getActiveSubscription(driverSubs, c.id);
                    return (
                      <div key={c.id} className="sj-row">
                        <span>{c.origin_city} → {c.destination_city}</span>
                        {active ? (
                          <SjBadge tone="success">{formatSubscriptionPeriod(active)}</SjBadge>
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
          {!drivers.length ? <SjCard><p className="sj-muted">Aucun chauffeur Allo Dakar inscrit pour le moment.</p></SjCard> : null}
          </div>
        </>
      ) : null}

      {tab === "garages" ? (
        <>
          <SjCard>
            <div className="sj-between">
              <h3 style={{ margin: 0 }}>Créer un garage</h3>
              <button type="button" className="sj-btn" onClick={() => setShowNewGarage((v) => !v)}>
                {showNewGarage ? "Fermer" : "+ Nouveau garage"}
              </button>
            </div>
            <p className="sj-muted" style={{ marginTop: 6 }}>
              Crée en un seul geste le compte de connexion du gestionnaire et sa fiche garage (activé d’emblée).
            </p>
            {showNewGarage ? (
              <form onSubmit={handleCreateGarage} className="sj-form-grid" style={{ marginTop: 12 }}>
                {error ? <p style={{ color: "var(--color-error)", gridColumn: "span 2" }}>{error}</p> : null}
                <div className="sj-field">
                  <label>Email du gestionnaire</label>
                  <input type="email" value={ngEmail} onChange={(e) => setNgEmail(e.target.value)} required />
                </div>
                <div className="sj-field">
                  <label>Mot de passe provisoire (12 caractères min.)</label>
                  <input type="password" value={ngPassword} onChange={(e) => setNgPassword(e.target.value)} minLength={12} required />
                </div>
                <div className="sj-field">
                  <label>Nom complet du gestionnaire</label>
                  <input value={ngFullName} onChange={(e) => setNgFullName(e.target.value)} required />
                </div>
                <div className="sj-field">
                  <label>Nom du garage</label>
                  <input value={ngGarageName} onChange={(e) => setNgGarageName(e.target.value)} required />
                </div>
                <div className="sj-field">
                  <label>Téléphone du garage</label>
                  <input value={ngPhone} onChange={(e) => setNgPhone(e.target.value)} placeholder="+221 …" required />
                </div>
                <div className="sj-field">
                  <label>Ville</label>
                  <input value={ngCity} onChange={(e) => setNgCity(e.target.value)} placeholder="Kaolack, Thiès…" />
                </div>
                <button type="submit" className="sj-btn sj-btn-primary" style={{ alignSelf: "end" }} disabled={creatingGarage}>
                  {creatingGarage ? "Création…" : "Créer le garage"}
                </button>
              </form>
            ) : null}
          </SjCard>
          <div className="sj-list" style={{ marginTop: 12 }}>
          {garages.map((g) => {
            const garageDriverCount = drivers.filter((d) => d.garage_id === g.id).length;
            return (
              <SjCard key={g.id}>
                <div className="sj-between">
                  <div>
                    <b>{g.name}</b>
                    <div className="sj-muted">{g.phone}{g.city ? ` · ${g.city}` : ""} · {garageDriverCount} chauffeur{garageDriverCount > 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <SjBadge tone={g.status === "actif" ? "success" : g.status === "suspendu" ? "danger" : "warning"}>
                      {GARAGE_STATUS_LABEL[g.status] ?? g.status}
                    </SjBadge>
                    <div className="sj-toolbar" style={{ marginTop: 6, justifyContent: "flex-end" }}>
                      {g.status !== "actif" ? (
                        <button type="button" className="sj-btn sj-btn-ghost" onClick={() => void setGarageStatus(g.id, "actif").then(reloadAll)}>
                          Activer
                        </button>
                      ) : null}
                      {g.status !== "suspendu" ? (
                        <button type="button" className="sj-btn sj-btn-ghost" style={{ color: "var(--color-error)" }} onClick={() => void setGarageStatus(g.id, "suspendu").then(reloadAll)}>
                          Suspendre
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </SjCard>
            );
          })}
          {!garages.length ? <SjCard><p className="sj-muted">Aucun garage inscrit pour le moment.</p></SjCard> : null}
          </div>
        </>
      ) : null}

      {tab === "departs" ? (
        <div className="sj-list">
          {departures.map((dep) => (
            <SjCard key={dep.id}>
              <div className="sj-between">
                <div>
                  <b>{dep.corridor?.origin_city} → {dep.corridor?.destination_city}</b>
                  <div className="sj-muted">
                    {new Date(dep.departure_at).toLocaleString("fr-FR")} · {dep.driver?.full_name ?? driverById.get(dep.allo_dakar_driver_id)?.full_name} ·{" "}
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
                      onClick={() => void cancelAlloDakarDeparture(dep.id).then(reloadAll)}
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
