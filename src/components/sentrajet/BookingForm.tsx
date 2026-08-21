"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SERVICE_TYPE_LABELS,
  computeSentrajetPrice,
  formatFcfa,
  type PricingSegment,
  type ServiceType,
} from "@/lib/sentrajetPricing";
import {
  createBookingWaveCheckout,
  createPaymentForBooking,
  createPlatformBooking,
  listPartnerContracts,
  type PartnerContract,
} from "@/lib/platformOps";
import { listBusinessRules, ruleString } from "@/lib/engines/businessRules";
import {
  AddressAutocomplete,
  type SelectedPlace,
} from "@/components/booking/AddressAutocomplete";
import { usePreferences } from "@/providers/PreferencesProvider";
import {
  computePartnerOverrideQuote,
  findOverrideForService,
  listPartnerTariffOverrides,
  type PartnerTariffOverride,
} from "@/lib/partnerTariffs";
import { WhatsAppPasteBox } from "@/components/sentrajet/WhatsAppPasteBox";

type BookingFormProps = {
  segment: PricingSegment;
  clientId?: string | null;
  partnerContractId?: string | null;
  onCreated?: () => void;
  submitDisabledReason?: string | null;
  /** Pré-remplissage (ex. depuis un créneau du calendrier Ops) — format "YYYY-MM-DD". */
  initialDate?: string;
  /** Pré-remplissage — format "HH:MM". */
  initialTime?: string;
};

const SERVICES = Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, string][];

export function BookingForm({
  segment,
  clientId,
  partnerContractId,
  onCreated,
  submitDisabledReason,
  initialDate,
  initialTime,
}: BookingFormProps) {
  const { t } = usePreferences();
  const [waveUrl, setWaveUrl] = useState("https://pay.wave.com/m/M_sn_Sc0CT6Qo7LkY/c/sn/");
  const [pickupPlace, setPickupPlace] = useState<SelectedPlace | null>(null);
  const [dropoffPlace, setDropoffPlace] = useState<SelectedPlace | null>(null);
  const [date, setDate] = useState(initialDate ?? "");
  const [time, setTime] = useState(initialTime ?? "");
  const [passengers, setPassengers] = useState(1);
  const [serviceType, setServiceType] = useState<ServiceType>("transfert_aibd");
  const [distanceKm, setDistanceKm] = useState<number | "">("");
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [phone, setPhone] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [passengerName, setPassengerName] = useState("");
  const [luggageCount, setLuggageCount] = useState<number | "">(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payLink, setPayLink] = useState<string | null>(null);
  const [partnerOverrides, setPartnerOverrides] = useState<PartnerTariffOverride[]>([]);
  const [partnerContracts, setPartnerContracts] = useState<PartnerContract[]>([]);
  const [selectedPartnerContractId, setSelectedPartnerContractId] = useState<string>("");

  // Contrat effectif : celui imposé par le parent (ex. le partenaire réserve pour lui-même) sinon
  // celui choisi manuellement dans le sélecteur ci-dessous (ex. staff qui crée une réservation
  // "à la main" pour un partenaire précis, depuis /ops/calendrier ou /admin/reservations).
  const effectivePartnerContractId = partnerContractId ?? (selectedPartnerContractId || null);

  useEffect(() => {
    void listBusinessRules().then((rules) => {
      setWaveUrl(ruleString(rules, "payment", "wave_checkout_url", waveUrl));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment]);

  // Si le composant reçoit déjà un partnerContractId figé (espace partenaire), pas besoin de
  // sélecteur : on ne charge la liste des contrats que lorsque le staff doit choisir lui-même.
  useEffect(() => {
    if (segment !== "partner" || partnerContractId) {
      setPartnerContracts([]);
      return;
    }
    void listPartnerContracts()
      .then((contracts) => setPartnerContracts(contracts.filter((c) => c.status === "active")))
      .catch(() => setPartnerContracts([]));
  }, [segment, partnerContractId]);

  useEffect(() => {
    if (segment !== "partner" || !effectivePartnerContractId) {
      setPartnerOverrides([]);
      return;
    }
    void listPartnerTariffOverrides(effectivePartnerContractId)
      .then(setPartnerOverrides)
      .catch(() => setPartnerOverrides([]));
  }, [segment, effectivePartnerContractId]);

  useEffect(() => {
    if (!pickupPlace || !dropoffPlace) {
      setDistanceKm("");
      setDistanceError(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        setDistanceLoading(true);
        setDistanceError(null);
        try {
          const res = await fetch("/api/distance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromPlace: pickupPlace.address,
              toPlace: dropoffPlace.address,
              fromLat: pickupPlace.lat,
              fromLng: pickupPlace.lng,
              toLat: dropoffPlace.lat,
              toLng: dropoffPlace.lng,
            }),
          });
          const data = (await res.json()) as { distanceKm?: number; error?: string };
          if (!res.ok || typeof data.distanceKm !== "number") {
            throw new Error(data.error || "Distance routière indisponible.");
          }
          if (!cancelled && typeof data.distanceKm === "number") setDistanceKm(data.distanceKm);
        } catch (distanceFailure) {
          if (!cancelled) {
            setDistanceKm("");
            setDistanceError(
              distanceFailure instanceof Error
                ? distanceFailure.message
                : "Distance routière indisponible.",
            );
          }
        } finally {
          if (!cancelled) setDistanceLoading(false);
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pickupPlace, dropoffPlace]);

  const activeOverride = useMemo(
    () => (segment === "partner" ? findOverrideForService(partnerOverrides, serviceType) : null),
    [segment, partnerOverrides, serviceType]
  );

  const genericQuote = useMemo(
    () =>
      computeSentrajetPrice({
        segment,
        serviceType,
        passengers,
        luggage: luggageCount === "" ? 0 : Number(luggageCount),
        distanceKm: distanceKm === "" ? null : Number(distanceKm),
        tripMode: isRoundTrip ? "aller_retour" : "aller_simple",
        applyAccountDiscount: segment === "client" && Boolean(clientId),
      }),
    [segment, serviceType, passengers, luggageCount, distanceKm, isRoundTrip, clientId]
  );

  const quote = useMemo(() => {
    if (activeOverride) {
      return computePartnerOverrideQuote(activeOverride, {
        passengers,
        distanceKm: distanceKm === "" ? null : Number(distanceKm),
        isRoundTrip,
      });
    }
    return genericQuote;
  }, [activeOverride, genericQuote, passengers, distanceKm, isRoundTrip]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitDisabledReason) {
      setError(submitDisabledReason);
      return;
    }
    setError(null);
    setMessage(null);
    setPayLink(null);
    if (!pickupPlace || !dropoffPlace || !date || !time || !phone.trim()) {
      setError("Renseignez départ, destination, date, heure et téléphone.");
      return;
    }
    if (segment === "partner" && !effectivePartnerContractId) {
      setError("Choisissez le partenaire B2B concerné par cette réservation.");
      return;
    }
    if (distanceLoading || distanceKm === "") {
      setError("Attendez le calcul de la distance routière avant de continuer.");
      return;
    }
    setSaving(true);
    try {
      const pickupTime = new Date(`${date}T${time}:00`).toISOString();
      const booking = await createPlatformBooking({
        clientId,
        partnerContractId: effectivePartnerContractId,
        pickup: pickupPlace.address,
        dropoff: dropoffPlace.address,
        pickupTime,
        serviceType,
        passengers,
        estimatedPrice: quote.surDevis ? null : quote.amountFcfa,
        pricingSegment: segment,
        distanceKm,
        notes: notes.trim() || null,
        vehiclesNeeded: quote.vehiclesNeeded,
        isRoundTrip,
        phone: phone.trim(),
        flightNumber: flightNumber.trim() || null,
        passengerName: passengerName.trim() || null,
        luggageCount: luggageCount === "" ? null : Number(luggageCount),
      });

      let checkoutUrl: string | null = null;
      if (!quote.surDevis && quote.amountFcfa > 0) {
        const payment = await createPaymentForBooking({
          bookingId: booking.id,
          amountFcfa: quote.amountFcfa,
          bookingRef: booking.reference,
          status: "pending",
        });
        if (payment.id) {
          checkoutUrl = await createBookingWaveCheckout(payment.id).catch(() => null);
        }
      }

      setMessage(
        `Demande ${booking.reference ?? booking.id.slice(0, 8)} bien prise en compte. SentraJet confirme le devis puis assigne un véhicule de la flotte.`
      );
      setPayLink(checkoutUrl || waveUrl);
      onCreated?.();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "Impossible de créer la réservation.";
      setError(msg || "Impossible de créer la réservation.");
    } finally {
      setSaving(false);
    }
  }

  const needsDistance =
    serviceType === "interurbain" ||
    serviceType === "mise_a_disposition" ||
    serviceType === "longue_distance" ||
    serviceType === "ceremonie";
  const isAirport = serviceType === "transfert_aibd" || serviceType === "aibd_retour";

  return (
    <form className="sj-form" onSubmit={submit}>
      <WhatsAppPasteBox
        onApply={(result) => {
          if (result.phone) setPhone(result.phone);
          if (result.date) setDate(result.date);
          if (result.time) setTime(result.time);
          if (result.passengers) setPassengers(result.passengers);
          if (result.flightNumber) setFlightNumber(result.flightNumber);
          if (result.passengerName) setPassengerName(result.passengerName);
          if (result.routeHint) {
            setNotes((prev) => (prev ? `${prev}\nTrajet (WhatsApp) : ${result.routeHint}` : `Trajet (WhatsApp) : ${result.routeHint}`));
          }
        }}
      />
      {segment === "partner" && !partnerContractId ? (
        <div className="sj-field">
          <label>Partenaire B2B concerné *</label>
          <select value={selectedPartnerContractId} onChange={(e) => setSelectedPartnerContractId(e.target.value)} required>
            <option value="">Choisir un partenaire…</option>
            {partnerContracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.partner_name} · {c.contract_number}
              </option>
            ))}
          </select>
          {!partnerContracts.length ? (
            <small className="sj-muted">Aucun contrat partenaire actif trouvé.</small>
          ) : null}
        </div>
      ) : null}
      <div className="sj-form-grid">
        <AddressAutocomplete
          label={t("booking.pickup")}
          placeholder={t("booking.pickupPlaceholder")}
          value={pickupPlace}
          onSelect={setPickupPlace}
          onClear={() => setPickupPlace(null)}
          showMyLocation
          accent="pickup"
        />
        <AddressAutocomplete
          label={t("booking.destination")}
          placeholder={t("booking.destinationPlaceholder")}
          value={dropoffPlace}
          onSelect={setDropoffPlace}
          onClear={() => setDropoffPlace(null)}
          accent="dropoff"
        />
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
            max={60}
            value={passengers}
            onChange={(e) => setPassengers(Number(e.target.value) || 1)}
          />
        </div>
        <div className="sj-field">
          <label>Téléphone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 …" required />
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
        {needsDistance ? (
          <div className="sj-field">
            <label>Distance routière aller</label>
            <input
              value={
                distanceLoading
                  ? t("booking.calculating")
                  : distanceKm === ""
                    ? t("booking.selectRoute")
                    : `${distanceKm} km`
              }
              readOnly
            />
            {distanceError ? <small className="text-[var(--color-error)]">{distanceError}</small> : null}
          </div>
        ) : null}
        {needsDistance ? (
          <div className="sj-field">
            <label>Aller-retour</label>
            <select value={isRoundTrip ? "yes" : "no"} onChange={(e) => setIsRoundTrip(e.target.value === "yes")}>
              <option value="no">Aller simple</option>
              <option value="yes">Aller-retour (×2)</option>
            </select>
          </div>
        ) : null}
        {isAirport ? (
          <>
            <div className="sj-field">
              <label>N° de vol</label>
              <input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="Ex. AT555" />
            </div>
            <div className="sj-field">
              <label>Nom du passager</label>
              <input value={passengerName} onChange={(e) => setPassengerName(e.target.value)} />
            </div>
            <div className="sj-field">
              <label>Bagages</label>
              <input
                type="number"
                min={0}
                value={luggageCount}
                onChange={(e) => setLuggageCount(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </>
        ) : null}
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

      <div className="sj-card" style={{ background: "#0b1828", color: "#fff" }}>
        <div className="sj-muted" style={{ color: "rgba(255,255,255,0.65)" }}>
          Estimation {segment === "partner" ? "partenaire B2B" : "client direct"}
          {activeOverride ? " · tarif personnalisé" : ""}
        </div>
        <div className="sj-metric" style={{ marginTop: 6, color: "#fff" }}>
          {quote.surDevis && !quote.amountFcfa ? "Sur devis" : formatFcfa(quote.amountFcfa)}
        </div>
        <div className="sj-metric-sub" style={{ color: "rgba(255,255,255,0.65)" }}>{quote.formulaApplied}</div>
        <div className="sj-metric-sub" style={{ color: "rgba(255,255,255,0.65)" }}>{quote.label}</div>
        {quote.distanceKm > 0 ? (
          <div className="sj-metric-sub" style={{ color: "rgba(255,255,255,0.65)" }}>{quote.distanceKm} km routiers</div>
        ) : null}
        {quote.vehiclesNeeded > 1 ? (
          <div className="sj-metric-sub" style={{ color: "rgba(255,255,255,0.65)" }}>{quote.vehiclesNeeded} véhicules nécessaires</div>
        ) : null}
        {activeOverride ? (
          <div className="sj-metric-sub" style={{ color: "#f6c96c" }}>
            Ce tarif remplace la grille partenaire générique pour ce type de prestation.
          </div>
        ) : null}
      </div>

      {error ? <p style={{ color: "#ff9ea5", margin: 0 }}>{error}</p> : null}
      {message ? <p style={{ color: "#6de0b0", margin: 0 }}>{message}</p> : null}
      {payLink ? (
        <a className="sj-btn sj-btn-primary" href={payLink} target="_blank" rel="noreferrer">
          Payer maintenant via Wave
        </a>
      ) : null}

      {submitDisabledReason ? (
        <p className="rounded-xl border border-[var(--color-warning)]/30 bg-amber-500/10 p-3 text-sm text-[var(--color-text-secondary)]">
          {submitDisabledReason}
        </p>
      ) : null}
      <button type="submit" className="sj-btn sj-btn-primary" disabled={saving || Boolean(submitDisabledReason)}>
        {saving ? "Envoi…" : "Calculer & envoyer la demande"}
      </button>
    </form>
  );
}
