"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import {
  SERVICE_TYPE_LABELS,
  computeSentrajetPrice,
  formatFcfa,
  getSentrajetTariffs,
  type ServiceType,
  type SentrajetTariff,
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
  { value: "transfert_aibd", title: "Transfert aéroport", hint: "Vers AIBD — forfait selon passagers" },
  { value: "aibd_retour", title: "Depuis l’aéroport", hint: "Récupération AIBD + retour" },
  { value: "interurbain", title: "Voyager", hint: "Trajet interurbain au km" },
  { value: "mise_a_disposition", title: "Mise à disposition", hint: "Avec chauffeur — matinée 50 000 F" },
  { value: "groupe_evenement", title: "Groupe / Événement", hint: "Plusieurs véhicules si besoin" },
  { value: "autre", title: "Autre demande", hint: "On vous rappelle avec un devis" },
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

function ReserverWizard() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tariffs, setTariffs] = useState<SentrajetTariff[]>([]);
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

  // Hydratation : URL + brouillon local (reprise après compte)
  useEffect(() => {
    const resume = searchParams.get("resume") === "1";
    const stored = loadSimulationDraft();
    const depart = searchParams.get("depart") || searchParams.get("from") || "";
    const destination = searchParams.get("destination") || searchParams.get("to") || "";
    const serviceParam = searchParams.get("service") as ServiceType | null;

    if (resume && stored) {
      setDraft({
        ...stored,
        step: stored.step === "done" ? "prix" : stored.validatedQuoteFcfa != null ? (user ? "confirm" : "compte") : stored.step,
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
          pickup: depart || (serviceType === "aibd_retour" ? "AIBD" : ""),
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
    void getSentrajetTariffs("client").then(setTariffs);
    void listBusinessRules().then((rules) => {
      setDiscountPercent(ruleNumber(rules, "pricing", "account_discount_percent", 10));
      setWhatsappPhone(ruleString(rules, "contact", "whatsapp_phone", "221788324069"));
      setWaveUrl(ruleString(rules, "payment", "wave_checkout_url", waveUrl));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistance continue du brouillon
  useEffect(() => {
    if (!hydrated) return;
    saveSimulationDraft(draft);
  }, [draft, hydrated]);

  // Si connecté pendant l’étape compte → avancer
  useEffect(() => {
    if (!hydrated || !user) return;
    if (draft.step === "compte" && draft.validatedQuoteFcfa != null) {
      setDraft((d) => ({ ...d, step: "confirm" }));
    }
  }, [user, hydrated, draft.step, draft.validatedQuoteFcfa]);

  // Defaults AIBD
  useEffect(() => {
    if (draft.serviceType === "transfert_aibd" && !draft.dropoff) {
      setDraft((d) => ({ ...d, dropoff: "AIBD" }));
    }
    if (draft.serviceType === "aibd_retour" && !draft.pickup) {
      setDraft((d) => ({ ...d, pickup: "AIBD" }));
    }
  }, [draft.serviceType, draft.dropoff, draft.pickup]);

  // Distance auto
  useEffect(() => {
    if (!["interurbain", "mise_a_disposition", "groupe_evenement"].includes(draft.serviceType)) return;
    if (!draft.pickup.trim() || !draft.dropoff.trim()) return;
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/distance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromPlace: draft.pickup.trim(), toPlace: draft.dropoff.trim() }),
          });
          if (!res.ok) return;
          const data = (await res.json()) as { distanceKm?: number };
          if (!cancelled && typeof data.distanceKm === "number" && data.distanceKm > 0) {
            setDraft((d) => ({ ...d, distanceKm: Math.round(data.distanceKm!) }));
            setDistanceMsg(`Distance estimée : ${Math.round(data.distanceKm)} km`);
          }
        } catch {
          /* ignore */
        }
      })();
    }, 400);
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
        distanceKm: draft.distanceKm,
        isRoundTrip: draft.isRoundTrip,
        tariffs,
        applyAccountDiscount: Boolean(user),
        accountDiscountPercent: discountPercent,
      }),
    [draft.serviceType, draft.passengers, draft.distanceKm, draft.isRoundTrip, tariffs, user, discountPercent]
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
      setGeoMsg("Géolocalisation indisponible — saisissez le départ.");
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
          setGeoMsg("Position GPS reprise.");
        }
      },
      () => setGeoMsg("Impossible d’obtenir la position.")
    );
  }

  function canSimulate(): boolean {
    return Boolean(
      draft.pickup.trim() && draft.dropoff.trim() && draft.date && draft.time && draft.passengers >= 1
    );
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
        notes: draft.notes.trim() || null,
        isRoundTrip: draft.isRoundTrip,
        phone: draft.phone.trim(),
        flightNumber: draft.flightNumber.trim() || null,
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
        `Bonjour SentraJet Premium, ma réservation ${doneRef} a bien été prise en compte. ${draft.pickup} → ${draft.dropoff} le ${draft.date} à ${draft.time}.`
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
        {draft.step === "trajet" && "Où et quand ?"}
        {draft.step === "prix" && "Votre estimation"}
        {draft.step === "compte" && "Presque terminé"}
        {draft.step === "confirm" && "Confirmez votre demande"}
        {draft.step === "done" && "Demande bien reçue"}
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        {draft.step === "service" && "Choisissez une prestation. SentraJet s’occupe du véhicule et du chauffeur."}
        {draft.step === "trajet" && "Quelques infos essentielles — pas de catalogue véhicule."}
        {draft.step === "prix" && "Tarif client. Les tarifs partenaires sont dans l’espace B2B."}
        {draft.step === "compte" && "Créez un compte pour −10 % et retrouver votre simulation."}
        {draft.step === "confirm" && "On enregistre votre demande. SentraJet vous recontacte."}
        {draft.step === "done" && "Notre équipe étudie votre demande et vous envoie le devis."}
      </p>

      {draft.step !== "done" ? (
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full rounded-full bg-amber-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      {/* STEP: SERVICE */}
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
                };
                if (s.value === "transfert_aibd") next.dropoff = draft.dropoff || "AIBD";
                if (s.value === "aibd_retour") next.pickup = draft.pickup || "AIBD";
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

      {/* STEP: TRAJET */}
      {draft.step === "trajet" ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-amber-800">{SERVICE_TYPE_LABELS[draft.serviceType]}</p>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Point de départ</label>
            <input
              className="input-base mt-1"
              value={draft.pickup}
              onChange={(e) => patch({ pickup: e.target.value })}
              placeholder="Ex. Dakar Plateau"
            />
            {(draft.serviceType === "transfert_aibd" || draft.serviceType === "interurbain") && (
              <button type="button" onClick={useMyLocation} className="mt-1 text-xs font-semibold text-amber-800">
                Utiliser ma position
              </button>
            )}
            {geoMsg ? <p className="mt-1 text-xs text-neutral-500">{geoMsg}</p> : null}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Destination</label>
            <input
              className="input-base mt-1"
              value={draft.dropoff}
              onChange={(e) => patch({ dropoff: e.target.value })}
              placeholder="Ex. AIBD, Saly, Thiès…"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Date</label>
              <input
                type="date"
                className="input-base mt-1"
                value={draft.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Heure</label>
              <input
                type="time"
                className="input-base mt-1"
                value={draft.time}
                onChange={(e) => patch({ time: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Combien êtes-vous ?
              </label>
              <input
                type="number"
                min={1}
                max={60}
                className="input-base mt-1"
                value={draft.passengers}
                onChange={(e) => patch({ passengers: Number(e.target.value) || 1 })}
              />
            </div>
            {draft.serviceType === "interurbain" ? (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Trajet</label>
                <select
                  className="input-base mt-1"
                  value={draft.isRoundTrip ? "ar" : "as"}
                  onChange={(e) => patch({ isRoundTrip: e.target.value === "ar" })}
                >
                  <option value="as">Aller simple</option>
                  <option value="ar">Aller-retour</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Distance (km)
                </label>
                <input
                  type="number"
                  min={0}
                  className="input-base mt-1"
                  value={draft.distanceKm ?? ""}
                  onChange={(e) =>
                    patch({ distanceKm: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  placeholder="Auto si possible"
                />
                {distanceMsg ? <p className="mt-1 text-xs text-neutral-500">{distanceMsg}</p> : null}
              </div>
            )}
          </div>

          {(draft.serviceType === "transfert_aibd" || draft.serviceType === "aibd_retour") && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                N° de vol (optionnel)
              </label>
              <input
                className="input-base mt-1"
                value={draft.flightNumber}
                onChange={(e) => patch({ flightNumber: e.target.value })}
                placeholder="Ex. AT555"
              />
            </div>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex gap-2 pt-2">
            <button type="button" className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold" onClick={() => go("service")}>
              Retour
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-neutral-900 hover:bg-amber-400"
              onClick={launchSimulation}
            >
              Lancer la simulation
            </button>
          </div>
        </div>
      ) : null}

      {/* STEP: PRIX */}
      {draft.step === "prix" ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-[#07111f] px-5 py-6 text-white">
            <p className="text-xs uppercase tracking-wide text-amber-300">Estimation tarif client</p>
            <p className="mt-2 font-display text-3xl font-extrabold">
              {quote.amountFcfa > 0 ? formatFcfa(quote.amountFcfa) : "Sur devis"}
            </p>
            <p className="mt-2 text-sm text-neutral-300">{quote.label}</p>
            {quote.discountFcfa > 0 ? (
              <p className="mt-2 text-sm text-emerald-300">
                Remise compte −{quote.discountPercent}% déjà appliquée
              </p>
            ) : !user ? (
              <p className="mt-2 text-sm text-amber-200/90">−{discountPercent}% si vous validez avec un compte</p>
            ) : null}
            <p className="mt-3 text-xs text-neutral-400">
              {draft.pickup} → {draft.dropoff} · {draft.date} à {draft.time} · {draft.passengers} pers.
            </p>
            {quote.vehiclesNeeded > 1 ? (
              <p className="mt-1 text-xs text-amber-200">
                Environ {quote.vehiclesNeeded} véhicules — SentraJet organise l’affectation.
              </p>
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
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-800"
            onClick={() => go("trajet")}
          >
            Modifier le trajet
          </button>
          <p className="text-center text-xs text-neutral-500">
            Vous ne choisissez ni véhicule ni chauffeur — SentraJet s’en charge.
          </p>
        </div>
      ) : null}

      {/* STEP: COMPTE */}
      {draft.step === "compte" ? (
        <div className="mt-6 space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-neutral-600">
            Votre simulation est sauvegardée. Après connexion ou création de compte, vous revenez
            automatiquement ici pour finaliser.
          </p>
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Estimation :{" "}
            <strong>
              {draft.validatedQuoteFcfa != null && draft.validatedQuoteFcfa > 0
                ? formatFcfa(draft.validatedQuoteFcfa)
                : quote.amountFcfa > 0
                  ? formatFcfa(quote.amountFcfa)
                  : "Sur devis"}
            </strong>
            {user ? null : ` · −${discountPercent}% avec un compte`}
          </div>
          <Link
            href={`/inscription?role=client&next=${encodeURIComponent(resumeUrl())}`}
            className="flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-neutral-900 hover:bg-amber-400"
          >
            Créer un compte et continuer
          </Link>
          <Link
            href={`/connexion?next=${encodeURIComponent(resumeUrl())}`}
            className="flex w-full items-center justify-center rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-900"
          >
            J’ai déjà un compte
          </Link>
          <button
            type="button"
            className="w-full text-sm font-semibold text-neutral-600 underline"
            onClick={() => go("confirm")}
          >
            Continuer sans compte
          </button>
          <button type="button" className="w-full text-sm text-neutral-500" onClick={() => go("prix")}>
            Retour au prix
          </button>
        </div>
      ) : null}

      {/* STEP: CONFIRM */}
      {draft.step === "confirm" ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            <p className="font-semibold text-neutral-900">{SERVICE_TYPE_LABELS[draft.serviceType]}</p>
            <p className="mt-1">
              {draft.pickup} → {draft.dropoff}
            </p>
            <p>
              {draft.date} à {draft.time} · {draft.passengers} pers.
            </p>
            <p className="mt-2 font-bold text-amber-800">
              {quote.amountFcfa > 0 ? formatFcfa(quote.amountFcfa) : "Sur devis SentraJet"}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Téléphone WhatsApp
            </label>
            <input
              className="input-base mt-1"
              value={draft.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              placeholder="+221 …"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Note (optionnel)
            </label>
            <textarea
              className="input-base mt-1 min-h-[72px]"
              value={draft.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Besoin particulier…"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="button"
            disabled={saving}
            onClick={() => void submitDemande()}
            className="w-full rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-neutral-900 hover:bg-amber-400 disabled:opacity-60"
          >
            {saving ? "Envoi…" : "Envoyer ma demande"}
          </button>
          <button type="button" className="w-full text-sm text-neutral-500" onClick={() => go(user ? "prix" : "compte")}>
            Retour
          </button>
        </div>
      ) : null}

      {/* STEP: DONE */}
      {draft.step === "done" && doneRef ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-600">
            Référence <strong className="text-neutral-900">{doneRef}</strong>. SentraJet étudie votre
            demande et vous envoie le devis.
          </p>
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center rounded-xl bg-[#25D366] px-4 py-3.5 text-sm font-bold text-white"
          >
            Suivre sur WhatsApp
          </a>
          <a
            href={waveUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white"
          >
            Payer via Wave (après devis)
          </a>
          {user ? (
            <Link
              href="/compte/reservations"
              className="flex w-full items-center justify-center rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold"
            >
              Voir mes réservations
            </Link>
          ) : (
            <Link
              href={`/inscription?role=client&next=${encodeURIComponent("/compte/reservations")}`}
              className="flex w-full items-center justify-center rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold"
            >
              Créer un compte pour suivre
            </Link>
          )}
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
          Espace partenaire
        </Link>{" "}
        (tarifs négociés)
      </p>
    </div>
  );
}

export default function ReserverPage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">
              Chargement de la simulation…
            </div>
          }
        >
          <ReserverWizard />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
