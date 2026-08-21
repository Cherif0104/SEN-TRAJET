"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  SERVICE_TYPE_LABELS,
  computeSentrajetPrice,
  formatFcfa,
  type ServiceType,
} from "@/lib/sentrajetPricing";
import {
  createBookingWaveCheckout,
  createPaymentForBooking,
  createPlatformBooking,
} from "@/lib/platformOps";
import { listBusinessRules, ruleString } from "@/lib/engines/businessRules";
import { listPartnerClients, type PartnerClient } from "@/lib/partnerClients";
import { AddressAutocomplete, type SelectedPlace } from "@/components/booking/AddressAutocomplete";
import { SjCard } from "@/components/sentrajet/PremiumShell";
import {
  computePartnerOverrideQuote,
  findOverrideForService,
  listPartnerTariffOverrides,
  type PartnerTariffOverride,
} from "@/lib/partnerTariffs";
import { WhatsAppPasteBox } from "@/components/sentrajet/WhatsAppPasteBox";

type WizardStep = "client" | "trajet" | "service" | "confirmation" | "done";
const STEPS: WizardStep[] = ["client", "trajet", "service", "confirmation", "done"];
const STEP_LABELS: Record<WizardStep, string> = {
  client: "Client",
  trajet: "Trajet",
  service: "Service",
  confirmation: "Confirmation",
  done: "Terminé",
};

const SERVICES = Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, string][];

type Props = {
  contractId: string | null;
  ownClientId: string | null;
  initialClientId?: string | null;
  submitDisabledReason?: string | null;
  onCreated?: () => void;
};

export function PartnerBookingWizard({ contractId, ownClientId, initialClientId, submitDisabledReason, onCreated }: Props) {
  const [step, setStep] = useState<WizardStep>(initialClientId ? "trajet" : "client");
  const [clients, setClients] = useState<PartnerClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId ?? null);
  const [useOwnOrg, setUseOwnOrg] = useState(false);

  const [pickupPlace, setPickupPlace] = useState<SelectedPlace | null>(null);
  const [dropoffPlace, setDropoffPlace] = useState<SelectedPlace | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | "">("");
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [distanceError, setDistanceError] = useState<string | null>(null);

  const [serviceType, setServiceType] = useState<ServiceType>("transfert_aibd");
  const [passengers, setPassengers] = useState(1);
  const [phone, setPhone] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [passengerName, setPassengerName] = useState("");
  const [luggageCount, setLuggageCount] = useState<number | "">(0);
  const [notes, setNotes] = useState("");

  const [waveUrl, setWaveUrl] = useState("https://pay.wave.com/m/M_sn_Sc0CT6Qo7LkY/c/sn/");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneRef, setDoneRef] = useState<string | null>(null);
  const [payLink, setPayLink] = useState<string | null>(null);
  const [partnerOverrides, setPartnerOverrides] = useState<PartnerTariffOverride[]>([]);

  useEffect(() => {
    void listBusinessRules().then((rules) => {
      setWaveUrl(ruleString(rules, "payment", "wave_checkout_url", waveUrl));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!contractId) {
      setPartnerOverrides([]);
      return;
    }
    void listPartnerTariffOverrides(contractId)
      .then(setPartnerOverrides)
      .catch(() => setPartnerOverrides([]));
  }, [contractId]);

  useEffect(() => {
    if (!contractId) {
      setLoadingClients(false);
      return;
    }
    void listPartnerClients(contractId)
      .then(setClients)
      .catch(() => setClients([]))
      .finally(() => setLoadingClients(false));
  }, [contractId]);

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
          if (!cancelled) setDistanceKm(data.distanceKm);
        } catch (distanceFailure) {
          if (!cancelled) {
            setDistanceKm("");
            setDistanceError(distanceFailure instanceof Error ? distanceFailure.message : "Distance routière indisponible.");
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
    () => findOverrideForService(partnerOverrides, serviceType),
    [partnerOverrides, serviceType]
  );

  const genericQuote = useMemo(
    () =>
      computeSentrajetPrice({
        segment: "partner",
        serviceType,
        passengers,
        luggage: luggageCount === "" ? 0 : Number(luggageCount),
        distanceKm: distanceKm === "" ? null : Number(distanceKm),
        tripMode: isRoundTrip ? "aller_retour" : "aller_simple",
      }),
    [serviceType, passengers, luggageCount, distanceKm, isRoundTrip]
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

  const finalClientId = useOwnOrg ? ownClientId : selectedClientId;
  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;
  const needsDistance = serviceType === "interurbain" || serviceType === "mise_a_disposition" || serviceType === "longue_distance" || serviceType === "ceremonie";
  const isAirport = serviceType === "transfert_aibd" || serviceType === "aibd_retour";

  function stepIndex(s: WizardStep) {
    return STEPS.indexOf(s);
  }

  function canContinueFromClient() {
    return Boolean(finalClientId);
  }
  function canContinueFromTrajet() {
    if (!pickupPlace || !dropoffPlace || !date || !time) return false;
    if (needsDistance && (distanceLoading || distanceKm === "")) return false;
    return true;
  }
  function canContinueFromService() {
    return phone.trim().length >= 9;
  }

  async function submit() {
    if (submitDisabledReason) {
      setError(submitDisabledReason);
      return;
    }
    if (!pickupPlace || !dropoffPlace) return;
    setSaving(true);
    setError(null);
    try {
      const pickupTime = new Date(`${date}T${time}:00`).toISOString();
      const booking = await createPlatformBooking({
        clientId: finalClientId,
        partnerContractId: contractId,
        pickup: pickupPlace.address,
        dropoff: dropoffPlace.address,
        pickupTime,
        serviceType,
        passengers,
        estimatedPrice: quote.surDevis ? null : quote.amountFcfa,
        pricingSegment: "partner",
        distanceKm: distanceKm === "" ? null : Number(distanceKm),
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
        }).catch(() => null);
        if (payment?.id) {
          checkoutUrl = await createBookingWaveCheckout(payment.id).catch(() => null);
        }
      }

      setDoneRef(booking.reference || booking.id.slice(0, 8));
      setPayLink(checkoutUrl || waveUrl);
      setStep("done");
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer la réservation.");
    } finally {
      setSaving(false);
    }
  }

  const progress = Math.round(((stepIndex(step) + 1) / (STEPS.length - 1)) * 100);

  return (
    <SjCard>
      {step !== "done" ? (
        <div style={{ marginBottom: 18 }}>
          <div className="sj-muted" style={{ marginBottom: 6 }}>
            Étape {stepIndex(step) + 1} / {STEPS.length - 1} · {STEP_LABELS[step]}
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "var(--color-surface-secondary)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, progress)}%`, background: "var(--color-accent)" }} />
          </div>
        </div>
      ) : null}

      {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}

      {step === "client" ? (
        <div className="sj-form">
          <p className="sj-muted">Pour qui réservez-vous ?</p>
          {loadingClients ? (
            <p className="sj-muted">Chargement du carnet clients…</p>
          ) : (
            <div className="sj-list">
              <div
                className="sj-row"
                style={{ cursor: "pointer", borderColor: useOwnOrg ? "var(--color-accent)" : undefined }}
                onClick={() => {
                  setUseOwnOrg(true);
                  setSelectedClientId(null);
                }}
              >
                <span>Réserver pour mon organisation</span>
                {useOwnOrg ? <span className="sj-gold">Sélectionné</span> : null}
              </div>
              {clients.map((c) => (
                <div
                  key={c.id}
                  className="sj-row"
                  style={{ cursor: "pointer", borderColor: selectedClientId === c.id ? "var(--color-accent)" : undefined }}
                  onClick={() => {
                    setUseOwnOrg(false);
                    setSelectedClientId(c.id);
                  }}
                >
                  <span>{c.full_name || c.company_name || "Client"}</span>
                  {selectedClientId === c.id ? <span className="sj-gold">Sélectionné</span> : null}
                </div>
              ))}
            </div>
          )}
          <p className="sj-muted" style={{ marginTop: 4 }}>
            Client absent de la liste ?{" "}
            <Link href="/partenaire/clients" className="sj-gold">Ajoutez-le dans votre carnet</Link>.
          </p>
          <button type="button" className="sj-btn sj-btn-primary" disabled={!canContinueFromClient()} onClick={() => setStep("trajet")}>
            Continuer
          </button>
        </div>
      ) : null}

      {step === "trajet" ? (
        <div className="sj-form">
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
          <div className="sj-form-grid">
            <AddressAutocomplete label="Départ" placeholder="Adresse de départ" value={pickupPlace} onSelect={setPickupPlace} onClear={() => setPickupPlace(null)} showMyLocation accent="pickup" />
            <AddressAutocomplete label="Destination" placeholder="Adresse d’arrivée" value={dropoffPlace} onSelect={setDropoffPlace} onClear={() => setDropoffPlace(null)} accent="dropoff" />
            <div className="sj-field">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="sj-field">
              <label>Heure</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          {needsDistance ? (
            <div className="sj-form-grid">
              <div className="sj-field">
                <label>Distance routière aller</label>
                <input value={distanceLoading ? "Calcul…" : distanceKm === "" ? "Sélectionnez départ/arrivée" : `${distanceKm} km`} readOnly />
                {distanceError ? <small style={{ color: "var(--color-error)" }}>{distanceError}</small> : null}
              </div>
              <div className="sj-field">
                <label>Aller-retour</label>
                <select value={isRoundTrip ? "yes" : "no"} onChange={(e) => setIsRoundTrip(e.target.value === "yes")}>
                  <option value="no">Aller simple</option>
                  <option value="yes">Aller-retour (×2)</option>
                </select>
              </div>
            </div>
          ) : null}
          <div className="sj-toolbar">
            <button type="button" className="sj-btn" onClick={() => setStep("client")}>Retour</button>
            <button type="button" className="sj-btn sj-btn-primary" disabled={!canContinueFromTrajet()} onClick={() => setStep("service")}>
              Continuer
            </button>
          </div>
        </div>
      ) : null}

      {step === "service" ? (
        <div className="sj-form">
          <div className="sj-form-grid">
            <div className="sj-field">
              <label>Type de prestation</label>
              <select value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)}>
                {SERVICES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="sj-field">
              <label>Passagers</label>
              <input type="number" min={1} max={60} value={passengers} onChange={(e) => setPassengers(Number(e.target.value) || 1)} />
            </div>
            <div className="sj-field">
              <label>Téléphone du passager *</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 …" required />
            </div>
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
                  <input type="number" min={0} value={luggageCount} onChange={(e) => setLuggageCount(e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
              </>
            ) : null}
          </div>
          <div className="sj-field">
            <label>Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="sj-toolbar">
            <button type="button" className="sj-btn" onClick={() => setStep("trajet")}>Retour</button>
            <button type="button" className="sj-btn sj-btn-primary" disabled={!canContinueFromService()} onClick={() => setStep("confirmation")}>
              Continuer
            </button>
          </div>
        </div>
      ) : null}

      {step === "confirmation" ? (
        <div className="sj-form">
          <SjCard style={{ background: "var(--color-surface-secondary)" }}>
            <div className="sj-muted">Client</div>
            <b>{useOwnOrg ? "Votre organisation" : selectedClient?.full_name || selectedClient?.company_name || "Client"}</b>
            <div className="sj-muted" style={{ marginTop: 10 }}>Trajet</div>
            <b>{pickupPlace?.address} → {dropoffPlace?.address}</b>
            <div className="sj-muted">{date} à {time} · {passengers} passager{passengers > 1 ? "s" : ""}</div>
            <div className="sj-muted" style={{ marginTop: 10 }}>
              Prix partenaire (net, hors marge éventuelle){activeOverride ? " · tarif personnalisé" : ""}
            </div>
            <div className="sj-metric" style={{ marginTop: 2 }}>
              {quote.surDevis && !quote.amountFcfa ? "Sur devis" : formatFcfa(quote.amountFcfa)}
            </div>
            <div className="sj-metric-sub">{quote.formulaApplied}</div>
          </SjCard>
          {submitDisabledReason ? (
            <p className="rounded-xl border border-[var(--color-warning)]/30 bg-amber-500/10 p-3 text-sm text-[var(--color-text-secondary)]">
              {submitDisabledReason}
            </p>
          ) : null}
          <div className="sj-toolbar">
            <button type="button" className="sj-btn" onClick={() => setStep("service")} disabled={saving}>Retour</button>
            <button type="button" className="sj-btn sj-btn-primary" disabled={saving || Boolean(submitDisabledReason)} onClick={() => void submit()}>
              {saving ? "Envoi…" : "Confirmer la réservation"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="sj-form">
          <p style={{ color: "#6de0b0" }}>
            Demande {doneRef} bien prise en compte. SentraJet confirme le devis puis assigne un véhicule de la flotte.
          </p>
          {payLink ? (
            <a className="sj-btn sj-btn-primary" href={payLink} target="_blank" rel="noreferrer">
              Payer maintenant via Wave
            </a>
          ) : null}
          <button
            type="button"
            className="sj-btn"
            onClick={() => {
              setStep("client");
              setSelectedClientId(null);
              setUseOwnOrg(false);
              setPickupPlace(null);
              setDropoffPlace(null);
              setDate("");
              setTime("");
              setPhone("");
              setDoneRef(null);
              setPayLink(null);
            }}
          >
            Nouvelle réservation
          </button>
        </div>
      ) : null}
    </SjCard>
  );
}
