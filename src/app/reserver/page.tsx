"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AddressAutocomplete, type SelectedPlace } from "@/components/booking/AddressAutocomplete";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/providers/PreferencesProvider";
import type { TranslationKey } from "@/i18n";
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
  createBookingWaveCheckout,
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
const SERVICE_CARDS: { value: ServiceType; title: TranslationKey; hint: TranslationKey }[] = [
  { value: "transfert_aibd", title: "landing.service.airport", hint: "landing.service.airportDetail" },
  { value: "interurbain", title: "landing.service.travel", hint: "landing.service.travelDetail" },
  { value: "mise_a_disposition", title: "landing.service.hourly", hint: "landing.service.hourlyDetail" },
  { value: "autre", title: "booking.service.other", hint: "booking.service.otherDetail" },
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

const STEP_ORDER: Step[] = ["service", "trajet", "vehicule", "prix", "compte", "confirm", "done"];

const VEHICLE_OPTIONS: Array<{
  key: string;
  label: string;
  capacityLabel: string;
  minPassengers: number;
  maxPassengers: number;
  luggageHint: string;
}> = [
  { key: "berline", label: "Berline / Monospace", capacityLabel: "1 à 4 passagers", minPassengers: 1, maxPassengers: 4, luggageHint: "jusqu’à ~4 valises" },
  { key: "van7", label: "Van 7 places", capacityLabel: "5 à 7 passagers", minPassengers: 5, maxPassengers: 7, luggageHint: "jusqu’à ~8 valises" },
  { key: "van10", label: "Van 10 places (Hyundai Starex)", capacityLabel: "8 à 10 passagers", minPassengers: 8, maxPassengers: 10, luggageHint: "jusqu’à ~12 valises" },
  { key: "groupe", label: "Groupe / plusieurs véhicules", capacityLabel: "Plus de 10 passagers", minPassengers: 11, maxPassengers: 999, luggageHint: "sur devis" },
];

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
  const { t } = usePreferences();
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
  const [payLink, setPayLink] = useState<string | null>(null);
  const [pendingResumeDraft, setPendingResumeDraft] = useState<SimulationDraft | null>(null);

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
      // Ne jamais reprendre automatiquement et silencieusement une simulation en cours :
      // l'utilisateur doit pouvoir choisir de continuer ou de repartir de zéro.
      setPendingResumeDraft(stored);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resumeStoredDraft() {
    if (!pendingResumeDraft) return;
    setDraft(pendingResumeDraft);
    setPendingResumeDraft(null);
  }

  function startFreshDraft() {
    clearSimulationDraft();
    setPendingResumeDraft(null);
    setDraft(emptyDraft());
    setDoneRef(null);
    setPayLink(null);
    router.replace("/reserver");
  }

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
    patch({ pickupPlace: place, pickup: place.address, distanceKm: null, distanceSource: null });
  }

  function setDropoff(place: SelectedPlace) {
    patch({ dropoffPlace: place, dropoff: place.address, distanceKm: null, distanceSource: null });
  }

  function swapPlaces() {
    const from = draft.pickupPlace;
    const to = draft.dropoffPlace;
    patch({
      pickupPlace: to,
      dropoffPlace: from,
      pickup: to?.address || "",
      dropoff: from?.address || "",
      distanceKm: null,
      distanceSource: null,
    });
  }

  function mapEmbedUrl(from: SelectedPlace, to: SelectedPlace): string {
    const pad = 0.06;
    const minLng = Math.min(from.lng, to.lng) - pad;
    const minLat = Math.min(from.lat, to.lat) - pad;
    const maxLng = Math.max(from.lng, to.lng) + pad;
    const maxLat = Math.max(from.lat, to.lat) + pad;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${to.lat}%2C${to.lng}`;
  }

  function canSimulate(): boolean {
    if (!draft.pickupPlace || !draft.dropoffPlace) return false;
    if (!draft.date || !draft.time || draft.passengers < 1) return false;
    // Prix au km réel dès que les 2 GPS sont posés
    if (!draft.distanceKm || draft.distanceKm <= 0) return false;
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
    if (!draft.distanceKm) {
      setError("Le kilométrage réel n’est pas encore calculé. Choisissez des suggestions d’adresses GPS.");
      return;
    }
    go("vehicule");
  }

  function validateQuote() {
    patch({ validatedQuoteFcfa: quote.amountFcfa || null, step: user ? "confirm" : "compte" });
  }

  async function submitDemande() {
    const phoneDigits = draft.phone.replace(/\D/g, "");
    if (phoneDigits.length < 9) {
      setError("Indiquez un numéro joignable (ex. +221 77 000 00 00).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let clientId: string | null = null;
      if (user) {
        try {
          clientId = await ensureClientForUser({
            userId: user.id,
            fullName: profile?.full_name,
            phone: draft.phone || profile?.phone,
            email: user.email,
          });
        } catch {
          // Ne bloque pas l’envoi de la demande si le profil client CRM échoue.
          clientId = null;
        }
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
        const payment = await createPaymentForBooking({
          bookingId: booking.id,
          amountFcfa: quote.amountFcfa,
          bookingRef: booking.reference,
          status: "pending",
        }).catch(() => null);
        if (payment?.id) {
          const checkoutUrl = await createBookingWaveCheckout(payment.id).catch(() => null);
          if (checkoutUrl) setPayLink(checkoutUrl);
        }
      }

      setDoneRef(booking.reference || booking.id.slice(0, 8));
      clearSimulationDraft();
      patch({ step: "done" });
    } catch (err) {
      const raw =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "Impossible d’envoyer la demande.";
      const msg = raw.split("\n")[0]?.split(" at http")[0]?.trim() || raw;
      setError(
        /failed to fetch|fetch failed/i.test(msg)
          ? "Connexion impossible au serveur. Réessayez dans un instant."
          : msg || "Impossible d’envoyer la demande."
      );
    } finally {
      setSaving(false);
    }
  }

  const progress = Math.min(100, ((stepIndex(draft.step) + 1) / (STEP_ORDER.length - 1)) * 100);
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

  if (pendingResumeDraft) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6 sm:py-10">
        <div className="overflow-hidden rounded-[28px] border border-neutral-200/80 bg-white p-6 shadow-[0_20px_50px_-28px_rgba(7,17,31,0.45)] sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6a1f]">
            SentraJet Premium
          </p>
          <h1 className="mt-2 font-display text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
            Réservation en cours
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Vous avez une simulation non terminée
            {pendingResumeDraft.pickup && pendingResumeDraft.dropoff
              ? ` (${pendingResumeDraft.pickup} → ${pendingResumeDraft.dropoff})`
              : ""}
            . Voulez-vous la reprendre où vous en étiez, ou démarrer une nouvelle réservation ?
          </p>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              className="w-full rounded-2xl bg-[#07111f] px-4 py-3.5 text-sm font-bold text-white hover:bg-[#0d1a2e]"
              onClick={resumeStoredDraft}
            >
              Reprendre ma réservation
            </button>
            <button
              type="button"
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3.5 text-sm font-bold text-neutral-800 hover:bg-neutral-50"
              onClick={startFreshDraft}
            >
              Nouvelle réservation
            </button>
          </div>
        </div>
      </div>
    );
  }

  const livePriceReady = Boolean(draft.pickupPlace && draft.dropoffPlace && draft.distanceKm);
  const currentServiceTitle = t(
    SERVICE_CARDS.find((service) => service.value === draft.serviceType)?.title ??
      "landing.service.travel"
  );

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6 sm:py-10">
      <div className="overflow-hidden rounded-[28px] border border-neutral-200/80 bg-white shadow-[0_20px_50px_-28px_rgba(7,17,31,0.45)]">
        <div className="bg-[#07111f] px-5 py-6 text-white sm:px-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f0c86b]">
            SentraJet Premium
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {draft.step === "service" && t("booking.step.serviceTitle")}
            {draft.step === "trajet" && t("booking.step.journeyTitle")}
            {draft.step === "vehicule" && "Choisissez votre véhicule"}
            {draft.step === "prix" && t("booking.step.priceTitle")}
            {draft.step === "compte" && t("booking.step.accountTitle")}
            {draft.step === "confirm" && t("booking.step.confirmTitle")}
            {draft.step === "done" && t("booking.step.doneTitle")}
          </h1>
          <p className="mt-2 text-sm text-white/70">
            {draft.step === "service"
              ? t("booking.step.serviceSubtitle")
              : draft.step === "trajet"
                ? t("booking.step.journeySubtitle")
                : draft.step === "vehicule"
                  ? "Selon le nombre de passagers indiqué — flotte réelle SentraJet Premium."
                  : draft.step === "prix"
                    ? quote.surDevis
                      ? "Cotation manuelle SentraJet."
                      : "Basé sur vos points GPS et l’itinéraire calculé."
                    : draft.step === "done"
                      ? "Nous validons puis envoyons le paiement Wave."
                      : "Flotte SentraJet · devis clair · Wave."}
          </p>
          {draft.step !== "done" ? (
            <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-[#d5a64a] transition-all" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
          {draft.step !== "service" && draft.step !== "done" ? (
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-white/60 underline underline-offset-2 hover:text-white/90"
              onClick={() => {
                if (window.confirm("Recommencer une nouvelle réservation ? Les informations déjà saisies seront perdues.")) {
                  startFreshDraft();
                }
              }}
            >
              Recommencer une nouvelle réservation
            </button>
          ) : null}
        </div>

        <div className="px-5 py-6 sm:px-7">
      {draft.step === "service" ? (
        <div className="grid gap-3">
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
              className="rounded-2xl border border-neutral-200 bg-neutral-50/80 px-4 py-4 text-start transition hover:border-amber-400 hover:bg-amber-50/50"
            >
              <p className="font-semibold text-neutral-900">{t(s.title)}</p>
              <p className="mt-1 text-sm text-neutral-500">{t(s.hint)}</p>
            </button>
          ))}
        </div>
      ) : null}

      {draft.step === "trajet" ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-amber-800">{currentServiceTitle}</p>
            <button type="button" className="text-xs font-semibold text-neutral-500 underline" onClick={() => go("service")}>
              {t("booking.change")}
            </button>
          </div>

          <div className="relative space-y-3 rounded-3xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white p-4">
            <AddressAutocomplete
              label={t("booking.pickup")}
              placeholder={t("booking.pickupPlaceholder")}
              value={draft.pickupPlace}
              textValue={draft.pickup}
              showMyLocation
              accent="pickup"
              onSelect={setPickup}
              onClear={() => patch({ pickupPlace: null, pickup: "", distanceKm: null, distanceSource: null })}
            />

            <div className="flex justify-center">
              <button
                type="button"
                onClick={swapPlaces}
                disabled={!draft.pickupPlace && !draft.dropoffPlace}
                className="z-10 -my-1 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-lg font-bold text-neutral-700 shadow-sm hover:border-amber-400 disabled:opacity-40"
                title={t("booking.swap")}
                aria-label={t("booking.swap")}
              >
                ↕
              </button>
            </div>

            <AddressAutocomplete
              label={t("booking.destination")}
              placeholder={t("booking.destinationPlaceholder")}
              value={draft.dropoffPlace}
              textValue={draft.dropoff}
              accent="dropoff"
              onSelect={setDropoff}
              onClear={() => patch({ dropoffPlace: null, dropoff: "", distanceKm: null, distanceSource: null })}
            />
          </div>

          {draft.pickupPlace && draft.dropoffPlace ? (
            <div className="overflow-hidden rounded-2xl border border-neutral-200">
              <iframe
                title={t("booking.map")}
                className="h-44 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={mapEmbedUrl(draft.pickupPlace, draft.dropoffPlace)}
              />
            </div>
          ) : null}

          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              livePriceReady
                ? "border border-amber-200 bg-amber-50 text-neutral-900"
                : "border border-neutral-200 bg-neutral-50 text-neutral-600"
            }`}
          >
            {distanceLoading ? (
              <p className="font-medium">{t("booking.distanceLoading")}</p>
            ) : livePriceReady ? (
              <>
                <p className="font-semibold">
                  {draft.distanceKm} km
                  {draft.durationMinutes ? ` · ~${draft.durationMinutes} min` : ""}
                  {" · "}
                  <span className="text-amber-900">
                    {quote.amountFcfa > 0 ? formatFcfa(quote.amountFcfa) : "Sur devis"}
                  </span>
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  {t("booking.distanceEstimate")}
                  {draft.distanceSource === "google_distance_matrix"
                    ? " (Google Maps)"
                    : draft.distanceSource === "osrm"
                      ? " (OpenStreetMap)"
                      : ""}
                </p>
              </>
            ) : (
              <p>
                {t("booking.selectGps")}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="booking-date" className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">{t("booking.date")}</label>
              <input id="booking-date" name="booking_date" type="date" className="input-base mt-1.5" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
            </div>
            <div>
              <label htmlFor="booking-time" className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">{t("booking.time")}</label>
              <input id="booking-time" name="booking_time" type="time" className="input-base mt-1.5" value={draft.time} onChange={(e) => patch({ time: e.target.value })} />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">{t("booking.type")}</p>
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
                  {t(mode === "aller_simple" ? "booking.oneWay" : "booking.roundTrip")}
                </button>
              ))}
            </div>
            {draft.tripMode !== "attente" ? (
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
                {t("booking.addWaiting")}
              </button>
            ) : (
              <div className="mt-3">
                <label htmlFor="booking-waiting" className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                  {t("booking.waitingMinutes")}
                </label>
                <input
                  type="number"
                  id="booking-waiting"
                  name="waiting_minutes"
                  min={0}
                  step={30}
                  className="input-base mt-1.5"
                  value={draft.waitingMinutes}
                  onChange={(e) => patch({ waitingMinutes: Number(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Counter label={t("booking.passengers")} value={draft.passengers} min={1} max={40} onChange={(n) => patch({ passengers: n })} />
            <Counter label={t("booking.luggage")} value={draft.luggage} min={0} max={30} onChange={(n) => patch({ luggage: n })} />
          </div>

          {quote.vehicleSuggestion.alert ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">{quote.vehicleSuggestion.alert}</p>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="button"
            disabled={!canSimulate() || distanceLoading}
            className="w-full rounded-2xl bg-[#d5a64a] px-4 py-3.5 text-sm font-bold text-[#07111f] hover:bg-[#f0c86b] disabled:opacity-45"
            onClick={launchSimulation}
          >
            {distanceLoading
              ? t("booking.calculating")
              : livePriceReady
                ? `${t("booking.details")} · ${quote.amountFcfa > 0 ? formatFcfa(quote.amountFcfa) : t("actions.quote")}`
                : t("booking.selectRoute")}
          </button>
        </div>
      ) : null}

      {draft.step === "vehicule" ? (
        <div className="space-y-4">
          <div className="grid gap-3">
            {VEHICLE_OPTIONS.map((option) => {
              const isSelected = draft.passengers >= option.minPassengers && draft.passengers <= option.maxPassengers;
              const optionQuote = computeSentrajetPrice({
                segment: "client",
                serviceType: draft.serviceType,
                passengers: isSelected ? draft.passengers : option.minPassengers,
                luggage: draft.luggage,
                distanceKm: draft.distanceKm,
                tripMode: draft.tripMode,
                waitingMinutes: draft.waitingMinutes,
                applyAccountDiscount: Boolean(user) && discountPercent > 0,
                accountDiscountPercent: discountPercent,
              });
              return (
                <div
                  key={option.key}
                  className={`rounded-2xl border p-4 transition ${
                    isSelected ? "border-[#d5a64a] bg-amber-50/60 ring-1 ring-[#d5a64a]" : "border-neutral-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-base font-bold text-neutral-900">{option.label}</p>
                      <p className="text-xs text-neutral-500">{option.capacityLabel} · {option.luggageHint}</p>
                    </div>
                    {isSelected ? (
                      <span className="rounded-full bg-[#d5a64a] px-3 py-1 text-xs font-bold text-[#07111f]">
                        Sélectionné
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-neutral-800">
                    {optionQuote.surDevis && !optionQuote.amountFcfa ? "Sur devis" : formatFcfa(optionQuote.amountFcfa)}
                    {!optionQuote.surDevis ? <span className="ml-1 text-xs font-normal text-neutral-500">estimatif</span> : null}
                  </p>
                  {!isSelected ? (
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-[#8a6a1f] underline"
                      onClick={() => go("trajet")}
                    >
                      Modifier le nombre de passagers pour choisir cette option
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-neutral-500">
            Le véhicule affiché correspond au nombre de passagers indiqué à l’étape précédente —
            SentraJet affecte un véhicule réel de sa flotte lors de la confirmation, pas un chauffeur au choix.
          </p>
          <button
            type="button"
            className="w-full rounded-2xl bg-[#d5a64a] px-4 py-3.5 text-sm font-bold text-[#07111f] hover:bg-[#f0c86b]"
            onClick={() => go("prix")}
          >
            Continuer
          </button>
        </div>
      ) : null}

      {draft.step === "prix" ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-neutral-900 px-5 py-6 text-white">
            <p className="text-xs uppercase tracking-wide text-amber-300">
              {quote.surDevis ? "Cotation manuelle" : "Tarif selon distance réelle"}
            </p>
            <p className="mt-2 font-display text-3xl font-extrabold">
              {quote.amountFcfa > 0 ? formatFcfa(quote.amountFcfa) : "Sur devis"}
            </p>
            <p className="mt-2 text-sm text-neutral-300">{quote.formulaApplied}</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
            <p>
              <span className="text-neutral-500">Départ</span> · {draft.pickup}
            </p>
            <p className="mt-1">
              <span className="text-neutral-500">Arrivée</span> · {draft.dropoff}
            </p>
            <p className="mt-1">
              <span className="text-neutral-500">Distance routière</span> ·{" "}
              {draft.distanceKm ? `${draft.distanceKm} km aller` : "—"}
              {quote.returnKm ? ` · ${quote.returnKm} km retour · ${quote.billableKm} km total` : ""}
              {draft.durationMinutes ? ` · ~${draft.durationMinutes} min` : ""}
            </p>
            {quote.ratePerKm ? (
              <p className="mt-1">
                <span className="text-neutral-500">Tarif/km</span> · {quote.ratePerKm} FCFA
                {quote.tariffVersionCode ? ` · ${quote.tariffVersionCode}` : ""}
              </p>
            ) : null}
            <p className="mt-1">
              <span className="text-neutral-500">Passagers / valises</span> · {draft.passengers} / {draft.luggage}
            </p>
            {quote.feeLines?.filter((l) => l.key !== "transport").length ? (
              <ul className="mt-3 space-y-1 text-xs text-neutral-500">
                {quote.feeLines
                  .filter((l) => l.key !== "transport")
                  .map((line) => (
                    <li key={line.key}>
                      {line.label} ·{" "}
                      {line.status === "inclus"
                        ? "inclus"
                        : line.status === "exclu"
                          ? "non inclus"
                          : line.status === "estime"
                            ? "estimé"
                            : "à confirmer"}
                      {line.amountFcfa != null ? ` · ${formatFcfa(line.amountFcfa)}` : ""}
                    </li>
                  ))}
              </ul>
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
            className="w-full rounded-2xl bg-[#d5a64a] px-4 py-3.5 text-sm font-bold text-[#07111f]"
            onClick={validateQuote}
          >
            Valider cette estimation
          </button>
          <button type="button" className="w-full rounded-xl border px-4 py-3 text-sm font-semibold" onClick={() => go("trajet")}>
            Modifier l’itinéraire
          </button>
        </div>
      ) : null}

      {draft.step === "compte" ? (
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">Votre simulation est sauvegardée — reprise après compte.</p>
          <Link
            href={`/inscription?role=client&next=${encodeURIComponent(resumeUrl())}`}
            className="flex w-full items-center justify-center rounded-2xl bg-[#d5a64a] px-4 py-3.5 text-sm font-bold text-[#07111f]"
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
        <div className="space-y-4">
          <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm">
            <p className="font-semibold">{currentServiceTitle}</p>
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
            <label htmlFor="booking-phone" className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">Téléphone</label>
            <input id="booking-phone" name="phone" type="tel" className="input-base mt-1.5" value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="+221 …" />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            disabled={saving}
            onClick={() => void submitDemande()}
            className="w-full rounded-2xl bg-[#d5a64a] px-4 py-3.5 text-sm font-bold text-[#07111f] disabled:opacity-60"
          >
            {saving ? "Envoi…" : "Envoyer ma demande"}
          </button>
        </div>
      ) : null}

      {draft.step === "done" && doneRef ? (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Réf. <strong>{doneRef}</strong> — SentraJet vous recontacte pour valider le devis et le paiement.
          </p>
          {payLink ? (
            <a
              href={payLink}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-white"
            >
              Payer maintenant via Wave
            </a>
          ) : null}
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center rounded-2xl bg-[#25D366] px-4 py-3.5 text-sm font-bold text-white"
          >
            Continuer sur WhatsApp
          </a>
          {!payLink ? (
            <a
              href={waveUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-sm font-semibold text-neutral-600 underline"
            >
              Payer via Wave (si devis déjà validé)
            </a>
          ) : null}
          <button
            type="button"
            className="w-full text-sm font-semibold text-amber-800"
            onClick={startFreshDraft}
          >
            Nouvelle réservation
          </button>
        </div>
      ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ReserverPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,_#e8eef6_0%,_#f4f4f5_50%,_#eceff3_100%)]">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<BrandedLoader />}>
          <ReserverWizard />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
