"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SERVICE_TYPE_LABELS,
  computeSentrajetPrice,
  formatFcfa,
  getSentrajetTariffs,
  type PricingSegment,
  type SentrajetTariff,
  type ServiceType,
} from "@/lib/sentrajetPricing";
import { createPlatformBooking } from "@/lib/platformOps";

type BookingFormProps = {
  segment: PricingSegment;
  clientId?: string | null;
  partnerContractId?: string | null;
  onCreated?: () => void;
};

const SERVICES = Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, string][];

export function BookingForm({ segment, clientId, partnerContractId, onCreated }: BookingFormProps) {
  const [tariffs, setTariffs] = useState<SentrajetTariff[]>([]);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [serviceType, setServiceType] = useState<ServiceType>("transfert_aibd");
  const [distanceKm, setDistanceKm] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getSentrajetTariffs(segment).then(setTariffs);
  }, [segment]);

  const quote = useMemo(
    () =>
      computeSentrajetPrice({
        segment,
        serviceType,
        passengers,
        distanceKm: distanceKm === "" ? null : Number(distanceKm),
        tariffs,
      }),
    [segment, serviceType, passengers, distanceKm, tariffs]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!pickup.trim() || !dropoff.trim() || !date || !time) {
      setError("Renseignez départ, destination, date et heure.");
      return;
    }
    setSaving(true);
    try {
      const pickupTime = new Date(`${date}T${time}:00`).toISOString();
      const booking = await createPlatformBooking({
        clientId,
        partnerContractId,
        pickup: pickup.trim(),
        dropoff: dropoff.trim(),
        pickupTime,
        serviceType,
        passengers,
        estimatedPrice: quote.surDevis ? null : quote.amountFcfa,
        pricingSegment: segment,
        distanceKm: distanceKm === "" ? null : Number(distanceKm),
        notes: notes.trim() || null,
      });
      setMessage(`Demande ${booking.reference ?? booking.id.slice(0, 8)} créée — en attente d’affectation.`);
      setPickup("");
      setDropoff("");
      setNotes("");
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer la réservation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="sj-form" onSubmit={submit}>
      <div className="sj-form-grid">
        <div className="sj-field">
          <label>Départ</label>
          <input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Ex. Dakar Centre / AIBD" />
        </div>
        <div className="sj-field">
          <label>Destination</label>
          <input value={dropoff} onChange={(e) => setDropoff(e.target.value)} placeholder="Ex. Saly / Mbour / AIBD" />
        </div>
        <div className="sj-field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="sj-field">
          <label>Heure</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="sj-field">
          <label>Passagers</label>
          <input
            type="number"
            min={1}
            max={11}
            value={passengers}
            onChange={(e) => setPassengers(Number(e.target.value) || 1)}
          />
        </div>
        <div className="sj-field">
          <label>Type de prestation</label>
          <select value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)}>
            {SERVICES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {(serviceType === "interurbain" || serviceType === "mise_a_disposition") && (
          <div className="sj-field">
            <label>Distance (km)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Ex. 95"
            />
          </div>
        )}
      </div>
      <div className="sj-field">
        <label>Notes</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Bagages, n° de vol, arrêts, besoins particuliers…"
        />
      </div>

      <div className="sj-card" style={{ background: "#0b1828" }}>
        <div className="sj-muted">Estimation {segment === "partner" ? "partenaire B2B" : "client direct"}</div>
        <div className="sj-metric" style={{ marginTop: 6 }}>
          {quote.surDevis && !quote.amountFcfa ? "Sur devis" : formatFcfa(quote.amountFcfa)}
        </div>
        <div className="sj-metric-sub">{quote.label}</div>
      </div>

      {error ? <p style={{ color: "#ff9ea5", margin: 0 }}>{error}</p> : null}
      {message ? <p style={{ color: "#6de0b0", margin: 0 }}>{message}</p> : null}

      <button type="submit" className="sj-btn sj-btn-primary" disabled={saving}>
        {saving ? "Envoi…" : "Calculer & envoyer la demande"}
      </button>
    </form>
  );
}
