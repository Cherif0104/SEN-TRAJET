"use client";

import { useCallback, useEffect, useState } from "react";
import { SjBadge, SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  BOOKING_STATUS_LABEL,
  assignDispatch,
  bookingStatusTone,
  listDrivers,
  listPlatformBookings,
  listVehicles,
  type PlatformBooking,
  type PlatformDriver,
  type PlatformVehicle,
} from "@/lib/platformOps";

export default function AdminDispatchPage() {
  const [bookings, setBookings] = useState<PlatformBooking[]>([]);
  const [drivers, setDrivers] = useState<PlatformDriver[]>([]);
  const [vehicles, setVehicles] = useState<PlatformVehicle[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    const [b, d, v] = await Promise.all([listPlatformBookings(), listDrivers(), listVehicles()]);
    setBookings(b);
    setDrivers(d);
    setVehicles(v);
    if (!driverId && d[0]) setDriverId(d[0].id);
    if (!vehicleId && v[0]) setVehicleId(v[0].id);
  }, [driverId, vehicleId]);

  useEffect(() => {
    void reload().catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, [reload]);

  const pending = bookings.filter(
    (b) =>
      ["a_assigner", "chauffeur_a_assigner", "payee", "confirmee", "en_attente_de_paiement"].includes(b.status) ||
      !b.service_order?.dispatch
  );
  const availableDrivers = drivers.filter((d) => !["on_trip", "offline", "Hors ligne"].includes(d.status));
  const availableVehicles = vehicles.filter((v) => ["available", "Disponible"].includes(v.status) || v.status === "available");

  async function confirmAssign() {
    if (!selectedBooking || !driverId || !vehicleId) return;
    setSaving(true);
    setError(null);
    try {
      await assignDispatch({ bookingId: selectedBooking, driverId, vehicleId });
      setMessage("Chauffeur et véhicule affectés.");
      setSelectedBooking(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Affectation impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SjSectionHead
        eyebrow="Dispatch"
        title="Centre d’affectation"
        action={
          <button type="button" className="sj-btn" onClick={() => void reload()}>
            ↻ Actualiser
          </button>
        }
      />

      {error ? <p style={{ color: "#ff9ea5" }}>{error}</p> : null}
      {message ? <p style={{ color: "#6de0b0" }}>{message}</p> : null}

      <div className="sj-grid sj-grid-2">
        <SjCard>
          <h3>À assigner</h3>
          <div className="sj-list">
            {pending.map((b) => (
              <div key={b.id} className="sj-row">
                <div>
                  <b>
                    {b.reference || b.id.slice(0, 8)} · {b.pickup} → {b.dropoff}
                  </b>
                  <div className="sj-muted">
                    {new Date(b.pickup_time).toLocaleString("fr-FR")} · {b.passengers} passagers
                  </div>
                </div>
                <button type="button" className="sj-btn sj-btn-primary" onClick={() => setSelectedBooking(b.id)}>
                  Affecter
                </button>
              </div>
            ))}
            {!pending.length ? <div className="sj-muted">Aucune course à assigner.</div> : null}
          </div>
        </SjCard>

        <SjCard>
          <h3>Chauffeurs disponibles</h3>
          <div className="sj-list">
            {availableDrivers.map((d) => (
              <div key={d.id} className="sj-row">
                <div>
                  <b>{d.full_name}</b>
                  <div className="sj-muted">{d.phone || "—"}</div>
                </div>
                <SjBadge tone={bookingStatusTone(d.status)}>{d.status}</SjBadge>
              </div>
            ))}
            {!availableDrivers.length ? <div className="sj-muted">Aucun chauffeur disponible.</div> : null}
          </div>
        </SjCard>
      </div>

      {selectedBooking ? (
        <SjCard style={{ marginTop: 16 }}>
          <h3>Confirmer l’affectation</h3>
          <div className="sj-form-grid" style={{ marginTop: 12 }}>
            <div className="sj-field">
              <label>Chauffeur</label>
              <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} — {d.status}
                  </option>
                ))}
              </select>
            </div>
            <div className="sj-field">
              <label>Véhicule</label>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                {(availableVehicles.length ? availableVehicles : vehicles).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} ({v.plate_number}) — {v.seats ?? "?"} places
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button type="button" className="sj-btn sj-btn-primary" disabled={saving} onClick={() => void confirmAssign()}>
              {saving ? "Affectation…" : "Confirmer l’affectation"}
            </button>
            <button type="button" className="sj-btn" onClick={() => setSelectedBooking(null)}>
              Annuler
            </button>
          </div>
        </SjCard>
      ) : null}

      <SjSectionHead title="Toutes les réservations" />
      <SjCard>
        <div className="sj-table-wrap">
          <table className="sj-table">
            <thead>
              <tr>
                <th>Réf.</th>
                <th>Trajet</th>
                <th>Date</th>
                <th>Chauffeur</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <b>{b.reference || "—"}</b>
                  </td>
                  <td>
                    {b.pickup} → {b.dropoff}
                  </td>
                  <td>{new Date(b.pickup_time).toLocaleString("fr-FR")}</td>
                  <td>{b.service_order?.dispatch?.driver?.full_name || "À assigner"}</td>
                  <td>
                    <SjBadge tone={bookingStatusTone(b.status)}>
                      {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                    </SjBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SjCard>
    </>
  );
}
