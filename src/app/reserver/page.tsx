"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import {
  SERVICE_TYPE_LABELS,
  TRIP_MODE_LABELS,
  computeSentrajetPrice,
  formatFcfa,
  type ServiceType,
  type TripMode,
} from "@/lib/sentrajetPricing";
import { listBusinessRules, ruleNumber, ruleString } from "@/lib/engines/businessRules";
import {
  createPaymentForBooking,
  createPlatformBooking,
  ensureClientForUser,
} from "@/lib/platformOps";
import {
  clearSimulationDraft,
  emptyDraft,
  loadSimulationDraft,
  resumeUrl,
  saveSimulationDraft,
  type SimulationDraft,
} from "@/lib/simulationDraft";

type Step = SimulationDraft["step"];

const SERVICE_CARDS: { value: ServiceType; title: string; hint: string }[] = [
  { value: "transfert_aibd", title: "Transfert aéroport", hint: "AIBD — dès 20 000 FCFA" },
  { value: "aibd_retour", title: "Depuis l’aéroport", hint: "Récupération AIBD + retour" },
  { value: "interurbain", title: "Voyager", hint: "Course & interurbain au km" },
  { value: "mise_a_disposition", title: "Mise à disposition", hint: "50 000 FCFA / 10 h à Dakar" },
  { value: "ceremonie", title: "Cérémonie & sortie", hint: "Dès 45 000 FCFA" },
  { value: "longue_distance", title: "Longue distance", hint: "Devis selon distance & durée" },
  { value: "autre", title: "Autre demande", hint: "Cotation SentraJet" },
];

const STEP_ORDER: Step[] = ["service", "trajet", "prix", "compte", "confirm", "done"];

function stepIndex(step: Step): number {
  return Math.max(0, STEP_ORDER.indexOf(step));
}

function inferServiceFromPlaces(depart: string, destination: string): ServiceType {
  const d = `${depart} ${destination}`.toLowerCase();
  if (d.includes("aibd") || d.includes("aéroport") || d.includes("aeroport")) {
    if (depart.toLowerCase().includes("aibd")) return "aibd_retour";
    return "transfert_aibd";
  }
  return "interurbain";
}

function Counter({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <div className="mt-1 flex items-center gap-3">
        <button
          type="button"
          aria-label={`Diminuer ${label}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-300 bg-white text-xl font-bold text-neutral-800 hover:bg-neutral-50"
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <span className="min-w-[2rem] text-center text-xl font-extrabold text-neutral-900">{value}</span>
        <button
          type="button"
          aria-label={`Augmenter ${label}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-300 bg-white text-xl font-bold text-neutral-800 hover:bg-neutral-50"
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}

function ReserverWizard() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [discountPercent, setDiscountPercent] = useState(10);
  const [whatsappPhone, setWhatsappPhone] = useState("221788324069");
  const [waveUrl, setWaveUrl] = useState("https://pay.wave.com/m/M_sn_Sc0CT6Qo7LkY/c/sn/");
  const [draft, setDraft] = useState<SimulationDraft>(() => emptyDraft());
  const [hydrated, setHydrated] = useState(false);
  const [distanceMsg, setDistanceMsg] = useState<string | null>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneRef, setDoneRef] = useState<string | null>(null);

  useEffect(() => {
    const resume = searchParams.get("resume") === "1";
    const stored = loadSimulationDraft();
    const depart = searchParams.get("depart") || searchParams.get("from") || "";
    const destination = searchParams.get("destination") || searchParams.get("to") || "";
    const serviceParam = searchParams.get("service") as ServiceType | null;

    if (resume && stored) {
      setDraft({
        ...stored,
        step:
          stored.step === "done"
            ? "prix"
            : stored.validatedQuoteFcfa != null
              ? user
                ? "confirm"
                : "compte"
              : stored.step,
      });
    } else if (depart || destination || serviceParam) {
      const serviceType =
        serviceParam && SERVICE_TYPE_LABELS[serviceParam]
          ? serviceParam
          : inferServiceFromPlaces(depart, destination);
      setDraft(
        emptyDraft({
          step: "trajet",
          serviceType,
          pickup: depart || (serviceType === "aibd_retour" ? "AIBD" : "Dakar"),
          dropoff: destination || (serviceType === "transfert_aibd" ? "AIBD" : ""),
        })
      );
    } else if (stored && stored.step !== "done" && stored.step !== "service") {
      setDraft(stored);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void listBusinessRules().then((rules) => {
      setDiscountPercent(ruleNumber(rules, "pricing", "account_discount_percent", 10));
      setWhatsappPhone(ruleString(rules, "contact", "whatsapp_phone", "221788324069"));
      setWaveUrl(ruleString(rules, "payment", "wave_checkout_url", waveUrl));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSimulationDraft(draft);
  }, [draft, hydrated]);

  useEffect(() => {
    if (!hydrated || !user) return;
    if (draft.step === "compte" && draft.validatedQuoteFcfa != null) {
      setDraft((d) => ({ ...d, step: "confirm" }));
    }
  }, [user, hydrated, draft.step, draft.validatedQuoteFcfa]);

  useEffect(() => {
    if (draft.serviceType === "transfert_aibd" && !draft.dropoff) {
      setDraft((d) => ({ ...d, dropoff: "AIBD" }));
    }
    if (draft.serviceType === "aibd_retour" && !draft.pickup) {
      setDraft((d) => ({ ...d, pickup: "AIBD" }));
    }
  }, [draft.serviceType, draft.dropoff, draft.pickup]);

  // Distance routière (API → seed → fallback)
  useEffect(() => {
    if (["mise_a_disposition", "autre", "ceremonie"].includes(draft.serviceType) && !draft.dropoff) {
      return;
    }
    if (!draft.pickup.trim() || !draft.dropoff.trim()) return;
    if (draft.serviceType === "transfert_aibd" || draft.serviceType === "aibd_retour") {
      // AIBD forfait — distance informative
    }
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/distance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromPlace: draft.pickup.trim(), toPlace: draft.dropoff.trim() }),
          });
          if (!res.ok) {
            if (!cancelled) setDistanceMsg("Distance non trouvée — saisissez le km ou précisez la ville.");
            return;
          }
          const data = (await res.json()) as { distanceKm?: number; source?: string };
          if (!cancelled && typeof data.distanceKm === "number" && data.distanceKm > 0) {
            setDraft((d) => ({
              ...d,
              distanceKm: data.distanceKm!,
              distanceSource: data.source || null,
            }));
            setDistanceMsg(
              `Distance routière : ${data.distanceKm} km${data.source === "google_distance_matrix" ? "" : " (réf. secours)"}`
            );
          }
        } catch {
          /* ignore */
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [draft.pickup, draft.dropoff, draft.serviceType]);

  const quote = useMemo(
    () =>
      computeSentrajetPrice({
        segment: "client",
        serviceType: draft.serviceType,
        passengers: draft.passengers,
        luggage: draft.luggage,
        distanceKm: draft.distanceKm,
        tripMode: draft.tripMode,
        waitingMinutes: draft.waitingMinutes,
        applyAccountDiscount: Boolean(user),
        accountDiscountPercent: discountPercent,
      }),
    [
      draft.serviceType,
      draft.passengers,
      draft.luggage,
      draft.distanceKm,
      draft.tripMode,
      draft.waitingMinutes,
      user,
      discountPercent,
    ]
  );

  function patch(p: Partial<SimulationDraft>) {
    setDraft((d) => ({ ...d, ...p }));
    setError(null);
  }

  function go(step: Step) {
    patch({ step });
  }

  function useMyLocation() {
    setGeoMsg(null);
    if (!navigator.geolocation) {
      setGeoMsg("Géolocalisation indisponible.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
          if (res.ok) {
            const data = (await res.json()) as { label?: string; display_name?: string };
            patch({ pickup: data.label || data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
          } else {
            patch({ pickup: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
          }
          setGeoMsg("Position reprise.");
        } catch {
          patch({ pickup: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` });
        }
      },
      () => setGeoMsg("Impossible d’obtenir la position.")
    );
  }

  function canSimulate(): boolean {
    return Boolean(draft.pickup.trim() && draft.dropoff.trim() && draft.date && draft.time && draft.passengers >= 1);
  }

  function launchSimulation() {
    if (!canSimulate()) {
      setError("Indiquez départ, destination, date et heure.");
      return;
    }
    go("prix");
  }

  function validateQuote() {
    patch({ validatedQuoteFcfa: quote.amountFcfa || null, step: user ? "confirm" : "compte" });
  }

  async function submitDemande() {
    if (!draft.phone.trim()) {
      setError("Votre téléphone permet à SentraJet de vous recontacter.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let clientId: string | null = null;
      if (user) {
        clientId = await ensureClientForUser({
          userId: user.id,
          fullName: profile?.full_name,
          phone: draft.phone || profile?.phone,
          email: user.email,
        });
      }

      const pickupTime = new Date(`${draft.date}T${draft.time}:00`).toISOString();
      const notesParts = [
        draft.notes.trim(),
        `Mode: ${TRIP_MODE_LABELS[draft.tripMode]}`,
        `Valises: ${draft.luggage}`,
        draft.waitingMinutes ? `Attente: ${draft.waitingMinutes} min` : "",
        quote.formulaApplied,
      ].filter(Boolean);

      const booking = await createPlatformBooking({
        clientId,
        pickup: draft.pickup.trim(),
        dropoff: draft.dropoff.trim(),
        pickupTime,
        serviceType: draft.serviceType,
        passengers: draft.passengers,
        estimatedPrice: quote.surDevis && !quote.amountFcfa ? null : quote.amountFcfa,
        pricingSegment: "client",
        distanceKm: draft.distanceKm,
        notes: notesParts.join(" · "),
        isRoundTrip: draft.tripMode === "aller_retour",
        phone: draft.phone.trim(),
        flightNumber: draft.flightNumber.trim() || null,
        luggageCount: draft.luggage,
        vehiclesNeeded: quote.vehiclesNeeded,
      });

      if (user && quote.discountPercent > 0) {
        const { supabase } = await import("@/lib/supabase");
        await supabase
          .from("bookings")
          .update({ account_discount_percent: quote.discountPercent })
          .eq("id", booking.id);
      }

      if (quote.amountFcfa > 0) {
        await createPaymentForBooking({
          bookingId: booking.id,
          amountFcfa: quote.amountFcfa,
          bookingRef: booking.reference,
          status: "pending",
        }).catch(() => null);
      }

      const ref = booking.reference || booking.id.slice(0, 8);
      setDoneRef(ref);
      clearSimulationDraft();
      patch({ step: "done" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d’envoyer la demande.");
    } finally {
      setSaving(false);
    }
  }

  const progress = Math.min(100, ((stepIndex(draft.step) + 1) / 5) * 100);
  const waHref = doneRef
    ? `https://wa.me/${whatsappPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Bonjour SentraJet Premium, ma réservation ${doneRef} — ${draft.pickup} → ${draft.dropoff} le ${draft.date} à ${draft.time}.`
      )}`
    : "#";

  if (!hydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-neutral-500">
        Préparation de la simulation…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Simulation SentraJet</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-neutral-900">
        {draft.step === "service" && "Que souhaitez-vous faire ?"}
        {draft.step === "trajet" && "Votre trajet"}
        {draft.step === "prix" && "Votre estimation"}
        {draft.step === "compte" && "Presque terminé"}
        {draft.step === "confirm" && "Confirmez"}
        {draft.step === "done" && "Demande bien reçue"}
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        {draft.step === "prix"
          ? quote.surDevis
            ? "Cotation manuelle requise — indication ci-dessous."
            : "Prix estimatif — SentraJet confirme après étude."
          : "Simple, rapide. SentraJet affecte le véhicule."}
      </p>

      {draft.step !== "done" ? (
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      {draft.step === "service" ? (
        <div className="mt-6 grid gap-3">
          {SERVICE_CARDS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => {
                const next: Partial<SimulationDraft> = { serviceType: s.value, step: "trajet" };
                if (s.value === "transfert_aibd") {
                  next.pickup = draft.pickup || "Dakar";
                  next.dropoff = "AIBD";
                }
                if (s.value === "aibd_retour") {
                  next.pickup = "AIBD";
                  next.dropoff = draft.dropoff || "Dakar";
                }
                if (s.value === "mise_a_disposition") {
                  next.pickup = draft.pickup || "Dakar";
                  next.dropoff = draft.dropoff || "Dakar";
                }
                patch(next);
              }}
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-amber-400 hover:bg-amber-50/40"
            >
              <p className="font-semibold text-neutral-900">{s.title}</p>
              <p className="mt-1 text-sm text-neutral-500">{s.hint}</p>
            </button>
          ))}
        </div>
      ) : null}

      {draft.step === "trajet" ? (
        <div className="mt-6 space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-amber-800">{SERVICE_TYPE_LABELS[draft.serviceType]}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Départ</label>
              <input
                className="input-base mt-1"
                value={draft.pickup}
                onChange={(e) => patch({ pickup: e.target.value })}
                placeholder="Dakar"
              />
              <button type="button" onClick={useMyLocation} className="mt-1 text-xs font-semibold text-amber-800">
                Ma position
              </button>
              {geoMsg ? <p className="text-xs text-neutral-500">{geoMsg}</p> : null}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Destination</label>
              <input
                className="input-base mt-1"
                value={draft.dropoff}
                onChange={(e) => patch({ dropoff: e.target.value })}
                placeholder="Thiès, Saly, AIBD…"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Date</label>
              <input type="date" className="input-base mt-1" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Heure de départ</label>
              <input type="time" className="input-base mt-1" value={draft.time} onChange={(e) => patch({ time: e.target.value })} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Type de trajet</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(Object.keys(TRIP_MODE_LABELS) as TripMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    patch({
                      tripMode: mode,
                      waitingMinutes: mode === "attente" ? Math.max(draft.waitingMinutes, 60) : draft.waitingMinutes,
                    })
                  }
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold ${
                    draft.tripMode === mode
                      ? "border-amber-500 bg-amber-50 text-neutral-900"
                      : "border-neutral-200 text-neutral-600"
                  }`}
                >
                  {TRIP_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>

          {(draft.tripMode === "aller_retour" || draft.tripMode === "retour_differe") && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Heure de retour</label>
              <input
                type="time"
                className="input-base mt-1"
                value={draft.returnTime}
                onChange={(e) => patch({ returnTime: e.target.value })}
              />
            </div>
          )}

          {draft.tripMode === "attente" && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Attente sur place (minutes)
              </label>
              <input
                type="number"
                min={0}
                step={30}
                className="input-base mt-1"
                value={draft.waitingMinutes}
                onChange={(e) => patch({ waitingMinutes: Number(e.target.value) || 0 })}
              />
              <p className="mt-1 text-xs text-neutral-500">30 min offertes, puis 2 500 FCFA / 30 min (hors MAD).</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Counter
              label="Passagers"
              value={draft.passengers}
              min={1}
              max={40}
              onChange={(n) => patch({ passengers: n })}
            />
            <Counter
              label="Valises"
              value={draft.luggage}
              min={0}
              max={30}
              onChange={(n) => patch({ luggage: n })}
            />
          </div>

          {distanceMsg ? <p className="text-xs text-neutral-500">{distanceMsg}</p> : null}
          {quote.vehicleSuggestion.alert ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">{quote.vehicleSuggestion.alert}</p>
          ) : null}

          {(draft.serviceType === "transfert_aibd" || draft.serviceType === "aibd_retour") && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">N° de vol (optionnel)</label>
              <input
                className="input-base mt-1"
                value={draft.flightNumber}
                onChange={(e) => patch({ flightNumber: e.target.value })}
                placeholder="AT555"
              />
            </div>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex gap-2 pt-1">
            <button type="button" className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold" onClick={() => go("service")}>
              Retour
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-neutral-900 hover:bg-amber-400"
              onClick={launchSimulation}
            >
              Calculer le tarif
            </button>
          </div>
        </div>
      ) : null}

      {draft.step === "prix" ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-[#07111f] px-5 py-6 text-white">
            <p className="text-xs uppercase tracking-wide text-amber-300">
              {quote.surDevis ? "Cotation manuelle requise" : "Prix estimatif"}
            </p>
            <p className="mt-2 font-display text-3xl font-extrabold">
              {quote.amountFcfa > 0 ? formatFcfa(quote.amountFcfa) : "Sur devis"}
            </p>
            <p className="mt-2 text-sm text-neutral-300">{quote.formulaApplied}</p>
            {!user && !quote.surDevis && quote.amountFcfa > 0 ? (
              <p className="mt-2 text-sm text-amber-200">−{discountPercent}% avec un compte</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700 shadow-sm">
            <p>
              <span className="text-neutral-500">Départ</span> · {draft.pickup}
            </p>
            <p className="mt-1">
              <span className="text-neutral-500">Destination</span> · {draft.dropoff}
            </p>
            <p className="mt-1">
              <span className="text-neutral-500">Distance</span> ·{" "}
              {draft.distanceKm ? `${draft.distanceKm} km` : "—"}{" "}
              {draft.distanceSource && draft.distanceSource !== "google_distance_matrix"
                ? "(réf. secours)"
                : ""}
            </p>
            <p className="mt-1">
              <span className="text-neutral-500">Passagers / valises</span> · {draft.passengers} /{" "}
              {draft.luggage}
            </p>
            <p className="mt-1">
              <span className="text-neutral-500">Prestation</span> · {SERVICE_TYPE_LABELS[draft.serviceType]} ·{" "}
              {TRIP_MODE_LABELS[draft.tripMode]}
            </p>
            <p className="mt-1">
              <span className="text-neutral-500">Véhicule suggéré</span> · {quote.vehicleSuggestion.label} (
              {quote.vehicleSuggestion.luggageHint})
            </p>
            {quote.waitingFeeFcfa > 0 ? (
              <p className="mt-1">
                <span className="text-neutral-500">Attente</span> · {formatFcfa(quote.waitingFeeFcfa)}
              </p>
            ) : null}
            {quote.breakdown.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-neutral-500">
                {quote.breakdown.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <button
            type="button"
            className="w-full rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-neutral-900 hover:bg-amber-400"
            onClick={validateQuote}
          >
            Je valide cette estimation
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold"
            onClick={() => go("trajet")}
          >
            Modifier
          </button>
        </div>
      ) : null}

      {draft.step === "compte" ? (
        <div className="mt-6 space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-neutral-600">
            Simulation sauvegardée. Après compte, vous revenez ici automatiquement.
          </p>
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {quote.amountFcfa > 0 ? formatFcfa(quote.amountFcfa) : "Sur devis"} · −{discountPercent}% avec compte
          </div>
          <Link
            href={`/inscription?role=client&next=${encodeURIComponent(resumeUrl())}`}
            className="flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-neutral-900"
          >
            Créer un compte et continuer
          </Link>
          <Link
            href={`/connexion?next=${encodeURIComponent(resumeUrl())}`}
            className="flex w-full items-center justify-center rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold"
          >
            J’ai déjà un compte
          </Link>
          <button type="button" className="w-full text-sm font-semibold text-neutral-600 underline" onClick={() => go("confirm")}>
            Continuer sans compte
          </button>
        </div>
      ) : null}

      {draft.step === "confirm" ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm">
            <p className="font-semibold">{SERVICE_TYPE_LABELS[draft.serviceType]}</p>
            <p className="mt-1">
              {draft.pickup} → {draft.dropoff}
            </p>
            <p>
              {draft.date} {draft.time} · {draft.passengers} pers. · {draft.luggage} valise(s)
            </p>
            <p className="mt-2 font-bold text-amber-800">
              {quote.amountFcfa > 0 ? formatFcfa(quote.amountFcfa) : "Sur devis"}
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Téléphone</label>
            <input
              className="input-base mt-1"
              value={draft.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              placeholder="+221 …"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Note</label>
            <textarea
              className="input-base mt-1 min-h-[72px]"
              value={draft.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            disabled={saving}
            onClick={() => void submitDemande()}
            className="w-full rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-neutral-900 disabled:opacity-60"
          >
            {saving ? "Envoi…" : "Envoyer ma demande"}
          </button>
        </div>
      ) : null}

      {draft.step === "done" && doneRef ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-600">
            Réf. <strong>{doneRef}</strong> — SentraJet étudie et vous envoie le devis.
          </p>
          <a href={waHref} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center rounded-xl bg-[#25D366] px-4 py-3.5 text-sm font-bold text-white">
            WhatsApp
          </a>
          <a href={waveUrl} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white">
            Wave (après devis)
          </a>
          <Link href={user ? "/compte/reservations" : "/inscription?role=client"} className="flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold">
            {user ? "Mes réservations" : "Créer un compte"}
          </Link>
          <button
            type="button"
            className="w-full text-sm font-semibold text-amber-800"
            onClick={() => {
              clearSimulationDraft();
              setDoneRef(null);
              setDraft(emptyDraft());
              router.replace("/reserver");
            }}
          >
            Nouvelle simulation
          </button>
        </div>
      ) : null}

      <p className="mt-8 text-center text-xs text-neutral-400">
        Partenaire B2B ?{" "}
        <Link href="/partenaire/reserver" className="font-semibold text-amber-800 underline">
          Tarifs négociés
        </Link>
      </p>
    </div>
  );
}

export default function ReserverPage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">Chargement…</div>}>
          <ReserverWizard />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
