"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { checkVehicleConflict, type ConflictCheck } from "@/lib/engines/dispatchConflict";

export default function AdminDispatchPage() {
  const [bookings, setBookings] = useState<PlatformBooking[]>([]);
  const [drivers, setDrivers] = useState<PlatformDriver[]>([]);
  const [vehicles, setVehicles] = useState<PlatformVehicle[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [conflict, setConflict] = useState<ConflictCheck | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
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

  const selected = useMemo(
    () => bookings.find((b) => b.id === selectedBooking) ?? null,
    [bookings, selectedBooking]
  );

  useEffect(() => {
    if (!selected || !vehicleId) {
      setConflict(null);
      return;
    }
    let cancelled = false;
    setCheckingConflict(true);
    void checkVehicleConflict({
      vehicleId,
      pickupAt: new Date(selected.pickup_time),
      excludeBookingId: selected.id,
    })
      .then((c) => {
        if (!cancelled) setConflict(c);
      })
      .finally(() => {
        if (!cancelled) setCheckingConflict(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, vehicleId]);

  const pending = bookings.filter(
    (b) =>
      ["a_assigner", "chauffeur_a_assigner", "payee", "confirmee", "en_attente_de_paiement"].includes(b.status) ||
      !b.service_order?.dispatch
  );
  const availableDrivers = drivers.filter((d) => !["on_trip", "offline", "Hors ligne"].includes(d.status));
  const availableVehicles = vehicles.filter((v) => ["available", "Disponible"].includes(v.status) || v.status === "available");

  async function confirmAssign() {
    if (!selectedBooking || !driverId || !vehicleId) return;
    if (conflict?.hasConflict) {
      setError(`Impossible d’affecter : conflit dans ±${conflict.bufferMinutes} min.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await assignDispatch({ bookingId: selectedBooking, driverId, vehicleId });
      setMessage("Chauffeur et véhicule affectés par SentraJet (flotte entreprise).");
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
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Affectation manuelle par l’entreprise — pas de matching chauffeur côté client. Anti-conflit
        actif (~90 min autour du créneau).
      </p>

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
          <h3>Chauffeurs flotte</h3>
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

      {selectedBooking && selected ? (
        <SjCard style={{ marginTop: 16 }}>
          <h3>Confirmer l’affectation</h3>
          <p className="sj-muted">
            {selected.reference || selected.id.slice(0, 8)} ·{" "}
            {new Date(selected.pickup_time).toLocaleString("fr-FR")}
          </p>
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
          {checkingConflict ? (
            <p className="sj-muted" style={{ marginTop: 10 }}>
              Vérification des conflits…
            </p>
          ) : null}
          {conflict?.hasConflict ? (
            <p style={{ color: "#ff9ea5", marginTop: 10 }}>
              Conflit : ce véhicule a déjà une mission dans ±{conflict.bufferMinutes} min (
              {conflict.conflictingBookingIds.map((id) => id.slice(0, 8)).join(", ")}).
            </p>
          ) : conflict ? (
            <p style={{ color: "#6de0b0", marginTop: 10 }}>
              Créneau libre (±{conflict.bufferMinutes} min).
            </p>
          ) : null}
          <div className="sj-toolbar mt-3.5 justify-start">
            <button
              type="button"
              className="sj-btn sj-btn-primary"
              disabled={saving || Boolean(conflict?.hasConflict)}
              onClick={() => void confirmAssign()}
            >
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
          <table className="sj-table sj-responsive-table">
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
                  <td data-label="Référence">
                    <b>{b.reference || "—"}</b>
                  </td>
                  <td data-label="Trajet">
                    {b.pickup} → {b.dropoff}
                  </td>
                  <td data-label="Date">{new Date(b.pickup_time).toLocaleString("fr-FR")}</td>
                  <td data-label="Chauffeur">{b.service_order?.dispatch?.driver?.full_name || "À assigner"}</td>
                  <td data-label="Statut">
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
