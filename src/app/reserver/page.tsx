"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AddressAutocomplete, type SelectedPlace } from "@/components/booking/AddressAutocomplete";
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

/** Offre publique courte — le reste passe par « Autre / devis ». */
const SERVICE_CARDS: { value: ServiceType; title: string; hint: string }[] = [
  { value: "transfert_aibd", title: "Transfert aéroport", hint: "AIBD — dès 20 000 FCFA" },
  { value: "interurbain", title: "Voyager", hint: "Course & interurbain — km réel" },
  { value: "mise_a_disposition", title: "Mise à disposition", hint: "50 000 FCFA / 10 h à Dakar" },
  { value: "autre", title: "Autre / devis", hint: "Cérémonie, longue distance, besoin spécifique" },
];

const PRIMARY_TRIP_MODES: TripMode[] = ["aller_simple", "aller_retour"];

const AIBD_PLACE: SelectedPlace = {
  id: "seed:aibd",
  label: "Aéroport AIBD",
  address: "Aéroport Blaise Diagne (AIBD), Diass, Sénégal",
  lat: 14.6711,
  lng: -17.0669,
  source: "reference",
};

const STEP_ORDER: Step[] = ["service", "trajet", "prix", "compte", "confirm", "done"];

function stepIndex(step: Step): number {
  return Math.max(0, STEP_ORDER.indexOf(step));
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
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-300 bg-white text-xl font-bold"
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <span className="min-w-[2rem] text-center text-xl font-extrabold">{value}</span>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-300 bg-white text-xl font-bold"
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
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneRef, setDoneRef] = useState<string | null>(null);

  useEffect(() => {
    const resume = searchParams.get("resume") === "1";
    const stored = loadSimulationDraft();
    const destination = searchParams.get("destination") || searchParams.get("to") || "";
    const depart = searchParams.get("depart") || searchParams.get("from") || "";
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
    } else if (serviceParam || destination || depart) {
      const serviceType =
        serviceParam && SERVICE_TYPE_LABELS[serviceParam] ? serviceParam : "interurbain";
      const next = emptyDraft({ step: "trajet", serviceType });
      if (serviceType === "transfert_aibd") {
        next.dropoffPlace = AIBD_PLACE;
        next.dropoff = AIBD_PLACE.address;
      }
      if (serviceType === "aibd_retour") {
        next.pickupPlace = AIBD_PLACE;
        next.pickup = AIBD_PLACE.address;
      }
      // Les query depart/destination ouvrent juste un indice — l’utilisateur doit confirmer via suggestions
      if (depart && !next.pickup) next.pickup = depart;
      if (destination && !next.dropoff) next.dropoff = destination;
      setDraft(next);
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

  // Distance routière réelle UNIQUEMENT si les 2 adresses ont des GPS
  useEffect(() => {
    const from = draft.pickupPlace;
    const to = draft.dropoffPlace;
    if (!from || !to) {
      setDistanceMsg(
        from || to
          ? "Sélectionnez départ et arrivée dans les suggestions pour un kilométrage réel."
          : null
      );
      if (draft.distanceKm != null) {
        setDraft((d) => ({ ...d, distanceKm: null, durationMinutes: null, distanceSource: null }));
      }
      return;
    }

    let cancelled = false;
    setDistanceLoading(true);
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/distance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromPlace: from.address,
              toPlace: to.address,
              fromLat: from.lat,
              fromLng: from.lng,
              toLat: to.lat,
              toLng: to.lng,
            }),
          });
          const data = (await res.json()) as {
            distanceKm?: number;
            durationMinutes?: number;
            source?: string;
            error?: string;
          };
          if (cancelled) return;
          if (!res.ok || !data.distanceKm) {
            setDraft((d) => ({ ...d, distanceKm: null, durationMinutes: null, distanceSource: null }));
            setDistanceMsg(data.error || "Itinéraire introuvable entre ces deux adresses.");
            return;
          }
          setDraft((d) => ({
            ...d,
            distanceKm: data.distanceKm!,
            durationMinutes: data.durationMinutes ?? null,
            distanceSource: data.source || null,
          }));
          const provider =
            data.source === "google_distance_matrix"
              ? "Google Maps"
              : data.source === "osrm"
                ? "OpenStreetMap (OSRM)"
                : data.source;
          setDistanceMsg(
            `Distance routière réelle : ${data.distanceKm} km` +
              (data.durationMinutes ? ` · ~${data.durationMinutes} min` : "") +
              ` · ${provider}`
          );
        } catch {
          if (!cancelled) setDistanceMsg("Erreur de calcul d’itinéraire.");
        } finally {
          if (!cancelled) setDistanceLoading(false);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.pickupPlace?.id, draft.dropoffPlace?.id, draft.pickupPlace?.lat, draft.dropoffPlace?.lat]);

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

  function setPickup(place: SelectedPlace) {
    patch({ pickupPlace: place, pickup: place.address });
  }

  function setDropoff(place: SelectedPlace) {
    patch({ dropoffPlace: place, dropoff: place.address });
  }

  function canSimulate(): boolean {
    if (!draft.pickupPlace || !draft.dropoffPlace) return false;
    if (!draft.date || !draft.time || draft.passengers < 1) return false;
    // Forfaits AIBD / MAD peuvent avancer même si distance en cours ; sinon km requis
    const needsKm = ["interurbain", "longue_distance"].includes(draft.serviceType);
    if (needsKm && (!draft.distanceKm || draft.distanceKm <= 0)) return false;
    return true;
  }

  function launchSimulation() {
    if (!draft.pickupPlace || !draft.dropoffPlace) {
      setError("Choisissez le départ et l’arrivée dans les suggestions d’adresses (Google / OpenStreetMap).");
      return;
    }
    if (!draft.date || !draft.time) {
      setError("Indiquez la date et l’heure.");
      return;
    }
    if (["interurbain", "longue_distance"].includes(draft.serviceType) && !draft.distanceKm) {
      setError("Le kilométrage réel n’est pas encore calculé. Vérifiez les adresses sélectionnées.");
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
        draft.distanceKm ? `Km réel: ${draft.distanceKm} (${draft.distanceSource || "route"})` : "",
        draft.pickupPlace ? `Pickup GPS: ${draft.pickupPlace.lat},${draft.pickupPlace.lng}` : "",
        draft.dropoffPlace ? `Dropoff GPS: ${draft.dropoffPlace.lat},${draft.dropoffPlace.lng}` : "",
        quote.formulaApplied,
      ].filter(Boolean);

      const booking = await createPlatformBooking({
        clientId,
        pickup: draft.pickup,
        dropoff: draft.dropoff,
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

      setDoneRef(booking.reference || booking.id.slice(0, 8));
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
        `Bonjour SentraJet Premium, réservation ${doneRef} — ${draft.pickup} → ${draft.dropoff} le ${draft.date} à ${draft.time}.`
      )}`
    : "#";

  if (!hydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-neutral-500">
        Préparation…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">SentraJet Premium</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-neutral-900">
        {draft.step === "service" && "Réserver"}
        {draft.step === "trajet" && "Votre trajet"}
        {draft.step === "prix" && "Estimation"}
        {draft.step === "compte" && "Compte"}
        {draft.step === "confirm" && "Confirmer"}
        {draft.step === "done" && "Demande reçue"}
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        {draft.step === "service"
          ? "Choisissez une prestation — SentraJet s’occupe du reste."
          : draft.step === "trajet"
            ? "Sélectionnez départ et arrivée dans les suggestions. Distance routière réelle."
            : draft.step === "prix"
              ? quote.surDevis
                ? "Cotation manuelle SentraJet."
                : "Tarif estimatif — plus loin = plus cher."
              : draft.step === "done"
                ? "Nous revenons vers vous pour valider et encaisser."
                : "Flotte SentraJet · devis clair · paiement Wave."}
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
                const next: Partial<SimulationDraft> = {
                  serviceType: s.value,
                  step: "trajet",
                  distanceKm: null,
                  distanceSource: null,
                };
                if (s.value === "transfert_aibd") {
                  next.dropoffPlace = AIBD_PLACE;
                  next.dropoff = AIBD_PLACE.address;
                }
                patch(next);
              }}
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-left shadow-sm hover:border-amber-400 hover:bg-amber-50/40"
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

          <AddressAutocomplete
            label="Point de prise en charge"
            placeholder="Ex. Rue 10, Plateau, Dakar…"
            value={draft.pickupPlace}
            textValue={draft.pickup}
            showMyLocation
            onSelect={setPickup}
            onClear={() => patch({ pickupPlace: null, pickup: "", distanceKm: null })}
          />

          <AddressAutocomplete
            label="Destination"
            placeholder="Ex. AIBD, Saly, Thiès centre…"
            value={draft.dropoffPlace}
            textValue={draft.dropoff}
            onSelect={setDropoff}
            onClear={() => patch({ dropoffPlace: null, dropoff: "", distanceKm: null })}
          />

          <div className="rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            {distanceLoading
              ? "Calcul de l’itinéraire routier (Google Maps ou OpenStreetMap)…"
              : distanceMsg ||
                "Choisissez départ et arrivée dans les suggestions d’adresse. Le tarif suit le km routier réel — plus loin = plus cher."}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Date</label>
              <input type="date" className="input-base mt-1" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Heure</label>
              <input type="time" className="input-base mt-1" value={draft.time} onChange={(e) => patch({ time: e.target.value })} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Trajet</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PRIMARY_TRIP_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => patch({ tripMode: mode, waitingMinutes: 0 })}
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
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-amber-800 underline"
              onClick={() =>
                patch({
                  tripMode: "attente",
                  waitingMinutes: Math.max(draft.waitingMinutes, 60),
                })
              }
            >
              Besoin d’une attente sur place ?
            </button>
          </div>

          {draft.tripMode === "attente" ? (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Attente (minutes)
              </label>
              <input
                type="number"
                min={0}
                step={30}
                className="input-base mt-1"
                value={draft.waitingMinutes}
                onChange={(e) => patch({ waitingMinutes: Number(e.target.value) || 0 })}
              />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Counter label="Passagers" value={draft.passengers} min={1} max={40} onChange={(n) => patch({ passengers: n })} />
            <Counter label="Valises" value={draft.luggage} min={0} max={30} onChange={(n) => patch({ luggage: n })} />
          </div>

          {quote.vehicleSuggestion.alert ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">{quote.vehicleSuggestion.alert}</p>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex gap-2">
            <button type="button" className="rounded-xl border px-4 py-3 text-sm font-semibold" onClick={() => go("service")}>
              Retour
            </button>
            <button
              type="button"
              disabled={!canSimulate() || distanceLoading}
              className="flex-1 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-neutral-900 hover:bg-amber-400 disabled:opacity-50"
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
          </div>
          <div className="rounded-2xl border bg-white p-4 text-sm text-neutral-700 shadow-sm">
            <p>
              <span className="text-neutral-500">Départ</span> · {draft.pickup}
            </p>
            <p className="mt-1">
              <span className="text-neutral-500">Arrivée</span> · {draft.dropoff}
            </p>
            <p className="mt-1">
              <span className="text-neutral-500">Distance réelle</span> ·{" "}
              {draft.distanceKm ? `${draft.distanceKm} km` : "—"}
              {draft.durationMinutes ? ` · ~${draft.durationMinutes} min` : ""}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Source :{" "}
              {draft.distanceSource === "google_distance_matrix"
                ? "Google Maps"
                : draft.distanceSource === "osrm"
                  ? "OpenStreetMap / OSRM"
                  : draft.distanceSource || "—"}
            </p>
            <p className="mt-1">
              <span className="text-neutral-500">Passagers / valises</span> · {draft.passengers} / {draft.luggage}
            </p>
            <p className="mt-1">
              <span className="text-neutral-500">Prestation</span> · {SERVICE_TYPE_LABELS[draft.serviceType]} ·{" "}
              {TRIP_MODE_LABELS[draft.tripMode]}
            </p>
            {quote.breakdown.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-neutral-500">
                {quote.breakdown.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <button type="button" className="w-full rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-neutral-900" onClick={validateQuote}>
            Je valide cette estimation
          </button>
          <button type="button" className="w-full rounded-xl border px-4 py-3 text-sm font-semibold" onClick={() => go("trajet")}>
            Modifier les adresses
          </button>
        </div>
      ) : null}

      {draft.step === "compte" ? (
        <div className="mt-6 space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-neutral-600">Simulation sauvegardée — retour automatique après compte.</p>
          <Link
            href={`/inscription?role=client&next=${encodeURIComponent(resumeUrl())}`}
            className="flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-neutral-900"
          >
            Créer un compte et continuer
          </Link>
          <Link
            href={`/connexion?next=${encodeURIComponent(resumeUrl())}`}
            className="flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold"
          >
            J’ai déjà un compte
          </Link>
          <button type="button" className="w-full text-sm font-semibold underline" onClick={() => go("confirm")}>
            Continuer sans compte
          </button>
        </div>
      ) : null}

      {draft.step === "confirm" ? (
        <div className="mt-6 space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm">
            <p className="font-semibold">{SERVICE_TYPE_LABELS[draft.serviceType]}</p>
            <p className="mt-1">{draft.pickup} → {draft.dropoff}</p>
            <p>
              {draft.date} {draft.time}
              {draft.distanceKm ? ` · ${draft.distanceKm} km` : ""}
            </p>
            <p className="mt-2 font-bold text-amber-800">
              {quote.amountFcfa > 0 ? formatFcfa(quote.amountFcfa) : "Sur devis"}
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Téléphone</label>
            <input className="input-base mt-1" value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="+221 …" />
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
        <div className="mt-6 space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-600">
            Réf. <strong>{doneRef}</strong> — SentraJet vous recontacte pour valider le devis et le paiement.
          </p>
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center rounded-xl bg-[#25D366] px-4 py-3.5 text-sm font-bold text-white"
          >
            Continuer sur WhatsApp
          </a>
          <a
            href={waveUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-sm font-semibold text-neutral-600 underline"
          >
            Payer via Wave (si devis déjà validé)
          </a>
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
            Nouvelle réservation
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function ReserverPage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<div className="py-20 text-center text-sm text-neutral-500">Chargement…</div>}>
          <ReserverWizard />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
