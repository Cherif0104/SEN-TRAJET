"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

const SERVICES: ServiceType[] = ["transfert_aibd", "aibd_retour", "interurbain", "mise_a_disposition"];

function ReserverPageContent() {
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const [tariffs, setTariffs] = useState<SentrajetTariff[]>([]);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [whatsappPhone, setWhatsappPhone] = useState("221788324069");
  const [waveUrl, setWaveUrl] = useState("https://pay.wave.com/m/M_sn_Sc0CT6Qo7LkY/c/sn/");

  const [serviceType, setServiceType] = useState<ServiceType>("transfert_aibd");
  const [pickup, setPickup] = useState(searchParams.get("depart") || "");
  const [dropoff, setDropoff] = useState(
    searchParams.get("destination") ||
      (serviceType.startsWith("transfert") || serviceType === "aibd_retour" ? "AIBD" : "")
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [passengers, setPassengers] = useState(2);
  const [distanceKm, setDistanceKm] = useState<number | "">("");
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [phone, setPhone] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [distanceMsg, setDistanceMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ ref: string; wa: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getSentrajetTariffs("client").then(setTariffs);
    void listBusinessRules().then((rules) => {
      setDiscountPercent(ruleNumber(rules, "pricing", "account_discount_percent", 10));
      setWhatsappPhone(ruleString(rules, "contact", "whatsapp_phone", "221788324069"));
      setWaveUrl(ruleString(rules, "payment", "wave_checkout_url", waveUrl));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (serviceType === "transfert_aibd" && !dropoff) setDropoff("AIBD");
    if (serviceType === "aibd_retour" && !pickup) setPickup("AIBD");
  }, [serviceType, dropoff, pickup]);

  // Estimation distance auto (voyage / MAD) pour prix au km
  useEffect(() => {
    if (serviceType !== "interurbain" && serviceType !== "mise_a_disposition") return;
    if (!pickup.trim() || !dropoff.trim()) return;
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/distance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromPlace: pickup.trim(), toPlace: dropoff.trim() }),
          });
          if (!res.ok) return;
          const data = (await res.json()) as { distanceKm?: number };
          if (!cancelled && typeof data.distanceKm === "number" && data.distanceKm > 0) {
            setDistanceKm(Math.round(data.distanceKm));
            setDistanceMsg(`Distance estimée : ${Math.round(data.distanceKm)} km`);
          }
        } catch {
          /* ignore */
        }
      })();
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pickup, dropoff, serviceType]);

  const quote = useMemo(
    () =>
      computeSentrajetPrice({
        segment: "client",
        serviceType,
        passengers,
        distanceKm: distanceKm === "" ? null : Number(distanceKm),
        isRoundTrip,
        tariffs,
        applyAccountDiscount: Boolean(user),
        accountDiscountPercent: discountPercent,
      }),
    [serviceType, passengers, distanceKm, isRoundTrip, tariffs, user, discountPercent]
  );

  function useMyLocation() {
    setGeoMsg(null);
    if (!navigator.geolocation) {
      setGeoMsg("Géolocalisation non disponible sur cet appareil.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
          if (res.ok) {
            const data = (await res.json()) as { label?: string; display_name?: string };
            setPickup(data.label || data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          } else {
            setPickup(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
          setGeoMsg("Position reprise. Ajustez si besoin.");
        } catch {
          setPickup(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          setGeoMsg("Position GPS reprise.");
        }
      },
      () => setGeoMsg("Impossible d’obtenir la position. Saisissez le départ manuellement.")
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pickup.trim() || !dropoff.trim() || !date || !time || !phone.trim()) {
      setError("Renseignez départ, destination, date, heure et téléphone.");
      return;
    }
    setSaving(true);
    try {
      let clientId: string | null = null;
      if (user) {
        clientId = await ensureClientForUser({
          userId: user.id,
          fullName: profile?.full_name,
          phone: phone || profile?.phone,
          email: user.email,
        });
      }

      const pickupTime = new Date(`${date}T${time}:00`).toISOString();
      const booking = await createPlatformBooking({
        clientId,
        pickup: pickup.trim(),
        dropoff: dropoff.trim(),
        pickupTime,
        serviceType,
        passengers,
        estimatedPrice: quote.surDevis && !quote.amountFcfa ? null : quote.amountFcfa,
        pricingSegment: "client",
        distanceKm: distanceKm === "" ? null : Number(distanceKm),
        notes: notes.trim() || null,
        isRoundTrip,
        phone: phone.trim(),
        flightNumber: flightNumber.trim() || null,
        vehiclesNeeded: quote.vehiclesNeeded,
      });

      // marque remise compte si applicable
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
      const waText = encodeURIComponent(
        `Bonjour SentraJet Premium, ma réservation ${ref} a bien été prise en compte. Départ: ${pickup} → ${dropoff} le ${date} à ${time}.`
      );
      setDone({
        ref,
        wa: `https://wa.me/${whatsappPhone.replace(/\D/g, "")}?text=${waText}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d’envoyer la demande.");
    } finally {
      setSaving(false);
    }
  }

  const needsDistance = serviceType === "interurbain" || serviceType === "mise_a_disposition";

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">SentraJet Premium</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900">
          Simulez et réservez en toute simplicité
        </h1>
        <p className="mt-2 text-neutral-600">
          Transfert aéroport, voyage ou mise à disposition. SentraJet traite votre demande, vous
          confirme le tarif, puis assigne un véhicule de sa flotte.
        </p>

        {!user ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Créez un compte pour bénéficier de <strong>−{discountPercent}%</strong> sur les tarifs
            clients.{" "}
            <Link href="/inscription" className="font-semibold underline">
              Créer un compte
            </Link>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Remise compte active : <strong>−{discountPercent}%</strong> appliquée à votre estimation.
          </div>
        )}

        {done ? (
          <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-neutral-900">Demande bien prise en compte</h2>
            <p className="mt-2 text-neutral-600">
              Référence <strong>{done.ref}</strong>. Notre équipe vous recontacte pour confirmation /
              paiement. Vous pouvez aussi poursuivre le suivi sur WhatsApp.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <a
                href={done.wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white"
              >
                Continuer sur WhatsApp
              </a>
              <a
                href={waveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white"
              >
                Payer via Wave
              </a>
              {user ? (
                <Link
                  href="/compte/reservations"
                  className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-800"
                >
                  Voir mes réservations
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Je souhaite
              </label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {SERVICES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setServiceType(s)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold ${
                      serviceType === s
                        ? "border-amber-500 bg-amber-50 text-neutral-900"
                        : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    {SERVICE_TYPE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Départ</label>
                <input
                  className="input-base mt-1"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="Votre position ou adresse"
                />
                <button type="button" onClick={useMyLocation} className="mt-1 text-xs font-semibold text-emerald-700">
                  Utiliser ma position
                </button>
                {geoMsg ? <p className="mt-1 text-xs text-neutral-500">{geoMsg}</p> : null}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Destination
                </label>
                <input
                  className="input-base mt-1"
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  placeholder="AIBD, Saly, Thiès…"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Date</label>
                <input type="date" className="input-base mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Heure</label>
                <input type="time" className="input-base mt-1" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Passagers</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  className="input-base mt-1"
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Téléphone</label>
                <input
                  className="input-base mt-1"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+221 …"
                  required
                />
              </div>
              {needsDistance ? (
                <>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Distance estimée (km)
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="input-base mt-1"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder={serviceType === "mise_a_disposition" ? "Ex. 80 (inclus jusqu’à 100)" : "Ex. 95"}
                    />
                    {distanceMsg ? <p className="mt-1 text-xs text-neutral-500">{distanceMsg}</p> : null}
                  </div>
                  {serviceType === "interurbain" ? (
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Trajet
                      </label>
                      <select
                        className="input-base mt-1"
                        value={isRoundTrip ? "ar" : "as"}
                        onChange={(e) => setIsRoundTrip(e.target.value === "ar")}
                      >
                        <option value="as">Aller simple</option>
                        <option value="ar">Aller-retour</option>
                      </select>
                    </div>
                  ) : null}
                </>
              ) : null}
              {(serviceType === "transfert_aibd" || serviceType === "aibd_retour") && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    N° de vol (recommandé)
                  </label>
                  <input
                    className="input-base mt-1"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    placeholder="Ex. AT555"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Notes</label>
              <textarea
                className="input-base mt-1 min-h-[90px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bagages, arrêt, besoin particulier…"
              />
            </div>

            <div className="rounded-xl bg-neutral-900 px-4 py-4 text-white">
              <p className="text-xs uppercase tracking-wide text-amber-300">Estimation tarif client</p>
              <p className="mt-1 text-2xl font-extrabold">
                {quote.amountFcfa > 0 ? formatFcfa(quote.amountFcfa) : "Sur devis"}
              </p>
              <p className="mt-1 text-sm text-neutral-300">{quote.label}</p>
              {quote.discountFcfa > 0 ? (
                <p className="mt-1 text-sm text-emerald-300">
                  Avant remise : {formatFcfa(quote.amountBeforeDiscountFcfa)} (−
                  {formatFcfa(quote.discountFcfa)})
                </p>
              ) : null}
              <p className="mt-2 text-xs text-neutral-400">
                Les tarifs partenaires ne s’appliquent que depuis l’espace Partenaire B2B.
              </p>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-neutral-900 hover:bg-amber-400 disabled:opacity-60"
            >
              {saving ? "Envoi…" : "Envoyer ma demande de réservation"}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function ReserverPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-sm text-neutral-600">
          Chargement de la réservation…
        </div>
      }
    >
      <ReserverPageContent />
    </Suspense>
  );
}
