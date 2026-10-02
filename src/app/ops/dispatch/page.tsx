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
import { triggerAutoDispatch } from "@/lib/rosterOps";

export default function OpsDispatchPage() {
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
  const [autoDispatchingId, setAutoDispatchingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [b, d, v] = await Promise.all([listPlatformBookings(), listDrivers(), listVehicles()]);
    setBookings(b);
    setDrivers(d);
    setVehicles(v);
  }, []);

  useEffect(() => {
    void reload().catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, [reload]);

  const selected = useMemo(() => bookings.find((b) => b.id === selectedBooking) ?? null, [bookings, selectedBooking]);

  useEffect(() => {
    if (!selected || !vehicleId) {
      setConflict(null);
      return;
    }
    let cancelled = false;
    setCheckingConflict(true);
    void checkVehicleConflict({ vehicleId, pickupAt: new Date(selected.pickup_time), excludeBookingId: selected.id })
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

  const toAssign = bookings
    .filter((b) => ["a_assigner", "chauffeur_a_assigner", "payee", "confirmee", "en_attente_de_paiement"].includes(b.status) || !b.service_order?.dispatch)
    .sort((a, b) => new Date(a.pickup_time).getTime() - new Date(b.pickup_time).getTime());
  const availableDrivers = drivers.filter((d) => !["on_trip", "offline", "Hors ligne"].includes(d.status));
  const availableVehicles = vehicles.filter((v) => ["available", "Disponible"].includes(v.status));

  function selectBooking(id: string) {
    setSelectedBooking(id);
    const firstDriver = availableDrivers[0]?.id || drivers[0]?.id || "";
    const firstVehicle = availableVehicles[0]?.id || vehicles[0]?.id || "";
    setDriverId(firstDriver);
    setVehicleId(firstVehicle);
  }

  async function handleAutoDispatch(bookingId: string) {
    setAutoDispatchingId(bookingId);
    setError(null);
    setMessage(null);
    try {
      const result = await triggerAutoDispatch(bookingId);
      if (result.ok) {
        setMessage("Véhicule et chauffeur affectés automatiquement.");
        await reload();
      } else if (result.reason === "no_match") {
        setError(
          `Aucun véhicule/chauffeur disponible ne correspond automatiquement (mini ${result.min_seats ?? "?"} places) — affectez manuellement ci-dessous.`
        );
        selectBooking(bookingId);
      } else if (result.reason === "already_dispatched") {
        setMessage("Cette course est déjà affectée.");
        await reload();
      } else {
        setError("Dispatch automatique impossible pour cette course.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dispatch automatique impossible");
    } finally {
      setAutoDispatchingId(null);
    }
  }

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
      <SjSectionHead eyebrow="Dispatch" title="Affectation rapide" />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Missions triées par heure de départ — anti-conflit actif (±90 min autour du créneau). Le dispatch automatique
        s&apos;exécute déjà à la confirmation de paiement ; utilisez « Dispatch auto » pour relancer une course restée
        sans affectation, ou affectez manuellement si aucune correspondance n&apos;est trouvée.
      </p>

      {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}
      {message ? <p style={{ color: "#6de0b0" }}>{message}</p> : null}

      <div className="sj-grid sj-grid-2">
        <SjCard>
          <h3>À assigner ({toAssign.length})</h3>
          <div className="sj-list">
            {toAssign.map((b) => (
              <div key={b.id} className="sj-row">
                <div>
                  <b>{b.reference || b.id.slice(0, 8)} · {b.pickup} → {b.dropoff}</b>
                  <div className="sj-muted">{new Date(b.pickup_time).toLocaleString("fr-FR")} · {b.passengers} passagers</div>
                </div>
                <div className="sj-toolbar" style={{ justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="sj-btn"
                    disabled={autoDispatchingId === b.id}
                    onClick={() => void handleAutoDispatch(b.id)}
                  >
                    {autoDispatchingId === b.id ? "…" : "Dispatch auto"}
                  </button>
                  <button type="button" className="sj-btn sj-btn-primary" onClick={() => selectBooking(b.id)}>
                    Affecter
                  </button>
                </div>
              </div>
            ))}
            {!toAssign.length ? <div className="sj-muted">Aucune course à assigner.</div> : null}
          </div>
        </SjCard>

        <SjCard>
          <h3>Disponibilités flotte</h3>
          <div className="sj-muted" style={{ marginBottom: 6 }}>
            {availableDrivers.length} chauffeur{availableDrivers.length !== 1 ? "s" : ""} · {availableVehicles.length} véhicule{availableVehicles.length !== 1 ? "s" : ""} disponibles
          </div>
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
            {selected.reference || selected.id.slice(0, 8)} · {selected.pickup} → {selected.dropoff} ·{" "}
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
            <p className="sj-muted" style={{ marginTop: 10 }}>Vérification des conflits…</p>
          ) : conflict?.hasConflict ? (
            <p style={{ color: "var(--color-error)", marginTop: 10 }}>
              Conflit : ce véhicule a déjà une mission dans ±{conflict.bufferMinutes} min (
              {conflict.conflictingBookingIds.map((id) => id.slice(0, 8)).join(", ")}).
            </p>
          ) : conflict ? (
            <p style={{ color: "#6de0b0", marginTop: 10 }}>Créneau libre (±{conflict.bufferMinutes} min).</p>
          ) : null}
          <div className="sj-toolbar" style={{ marginTop: 14, justifyContent: "flex-start" }}>
            <button type="button" className="sj-btn sj-btn-primary" disabled={saving || Boolean(conflict?.hasConflict)} onClick={() => void confirmAssign()}>
              {saving ? "Affectation…" : "Confirmer l’affectation"}
            </button>
            <button type="button" className="sj-btn" onClick={() => setSelectedBooking(null)}>
              Annuler
            </button>
          </div>
        </SjCard>
      ) : null}
    </>
  );
}
