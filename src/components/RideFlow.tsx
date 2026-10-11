"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Check,
  Clock3,
  MessageCircle,
  Navigation,
  Phone,
  Plane,
  ReceiptText,
  Share2,
  ShieldCheck,
  Star,
  UserRound,
  UsersRound
} from "lucide-react";
import { LocationInput } from "@/components/LocationInput";
import { supabase } from "@/lib/supabase";
import { calculateFare, formatFare, RIDE_CLASSES } from "@/lib/fare";
import { readRideDraft, saveRideDraft } from "@/lib/rideDraft";
import type { Place, RideClass, RideRequest, ServiceType } from "@/lib/types";

type Step = "route" | "class" | "review" | "searching" | "confirmed" | "tracking" | "in_progress" | "completed";

const AIBD: Place = {
  id: "aibd",
  label: "Aéroport International Blaise Diagne",
  address: "Aéroport International Blaise Diagne (AIBD), Diass, Sénégal",
  lat: 14.6711,
  lng: -17.0669
};

export function RideFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawService = searchParams.get("service");
  const service: ServiceType = rawService === "airport" || rawService === "intercity" || rawService === "carpool" ? rawService : "ride";
  const plannedOnly = service === "intercity" || service === "carpool";
  const [step, setStep] = useState<Step>("route");
  const [pickup, setPickup] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(service === "airport" ? AIBD : null);
  const [rideClass, setRideClass] = useState<RideClass>("eco");
  const [scheduled, setScheduled] = useState(plannedOnly);
  const [scheduledAt, setScheduledAt] = useState("");
  const [route, setRoute] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [ride, setRide] = useState<RideRequest | null>(null);
  const [driver, setDriver] = useState<{
    full_name: string;
    phone: string | null;
    vehicle: string | null;
    plate: string | null;
    color: string | null;
    rating: number;
    rating_count: number;
  } | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; heading: number | null; updated_at: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingSaved, setRatingSaved] = useState(false);
  const draftRestored = useRef(false);
  const activeRideChecked = useRef(false);

  useEffect(() => {
    if (draftRestored.current || searchParams.get("draft") !== "home") return;
    draftRestored.current = true;
    const draft = readRideDraft();
    if (!draft || draft.service !== service) return;
    setPickup(draft.pickup);
    setDestination(draft.destination);
    setRoute(draft.route);
    setScheduled(service === "intercity" || service === "carpool");
    setStep("class");
  }, [searchParams, service]);

  useEffect(() => {
    if (activeRideChecked.current || searchParams.get("draft") === "home") return;
    activeRideChecked.current = true;
    void supabase
      .from("ride_requests")
      .select("*")
      .eq("service_type", service)
      .in("status", ["scheduled", "searching", "offered", "assigned", "driver_en_route", "driver_arrived", "passenger_on_board"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const activeRide = data as RideRequest | null;
        if (!activeRide) return;
        setRide(activeRide);
        setRideClass(activeRide.ride_class);
        setPickup({
          id: `ride-${activeRide.id}-pickup`,
          label: activeRide.pickup_address,
          address: activeRide.pickup_address,
          lat: activeRide.pickup_lat,
          lng: activeRide.pickup_lng
        });
        setDestination({
          id: `ride-${activeRide.id}-destination`,
          label: activeRide.destination_address,
          address: activeRide.destination_address,
          lat: activeRide.destination_lat,
          lng: activeRide.destination_lng
        });
        setRoute({
          distanceKm: activeRide.distance_km,
          durationMinutes: activeRide.duration_minutes
        });
        setScheduled(Boolean(activeRide.scheduled_for));
        setScheduledAt(activeRide.scheduled_for ? new Date(activeRide.scheduled_for).toISOString().slice(0, 16) : "");
        setStep(stepForRideStatus(activeRide.status));
      });
  }, [searchParams, service]);

  const quote = useMemo(
    () =>
      route
        ? calculateFare({
            ...route,
            rideClass,
            serviceType: service,
            scheduledFor: scheduledAt ? new Date(scheduledAt) : null
          })
        : null,
    [rideClass, route, scheduledAt, service]
  );

  async function calculateRoute() {
    if (!pickup || !destination) return;
    setLoadingRoute(true);
    setError(null);
    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickup, destination })
      });
      const data = (await response.json()) as { distanceKm?: number; durationMinutes?: number; error?: string };
      if (!response.ok || !data.distanceKm || !data.durationMinutes) throw new Error(data.error || "Itinéraire introuvable.");
      const nextRoute = { distanceKm: data.distanceKm, durationMinutes: data.durationMinutes };
      if (service === "ride" && nextRoute.distanceKm > 50) {
        saveRideDraft({
          pickup,
          destination,
          route: nextRoute,
          service: "intercity",
          savedAt: new Date().toISOString()
        });
        router.replace("/ride?service=intercity&draft=home");
        return;
      }
      setRoute(nextRoute);
      setStep("class");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de calculer le trajet.");
    } finally {
      setLoadingRoute(false);
    }
  }

  async function requestDriver() {
    if (!pickup || !destination || !route) return;
    if (scheduled && !scheduledAt) {
      setError("Choisissez la date et l’heure de départ.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: requestError } = await supabase.rpc("create_ride_request", {
        p_service_type: service,
        p_ride_class: rideClass,
        p_pickup_address: pickup.address,
        p_pickup_lat: pickup.lat,
        p_pickup_lng: pickup.lng,
        p_destination_address: destination.address,
        p_destination_lat: destination.lat,
        p_destination_lng: destination.lng,
        p_distance_km: route.distanceKm,
        p_duration_minutes: route.durationMinutes,
        p_scheduled_for: scheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        p_delivery_kind: null,
        p_payment_method: "cash"
      });
      if (requestError) throw requestError;
      const rideId = String(data);
      const { data: created, error: readError } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("id", rideId)
        .single();
      if (readError) throw readError;
      setRide(created as RideRequest);
      setStep(scheduled ? "confirmed" : "searching");
    } catch (reason) {
      const raw = reason instanceof Error
        ? reason.message
        : reason && typeof reason === "object" && "message" in reason
          ? String(reason.message)
          : "";
      setError(
        /urban_distance_limit_exceeded/i.test(raw)
          ? "Cette Course dépasse 50 km. Choisissez le service Interurbain."
          : raw || "La recherche n’a pas pu démarrer."
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!ride?.id) return;
    const channel = supabase
      .channel(`ride:${ride.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ride_requests", filter: `id=eq.${ride.id}` },
        (payload) => {
          const updated = payload.new as RideRequest;
          setRide(updated);
          if (updated.status === "completed") {
            setStep("completed");
          } else if (updated.status === "passenger_on_board") {
            setStep("in_progress");
          } else if (["assigned", "driver_en_route", "driver_arrived"].includes(updated.status)) {
            setStep("tracking");
          } else if (updated.status === "cancelled") {
            setError("Cette course a été annulée.");
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [ride?.id]);

  useEffect(() => {
    if (!ride?.driver_id) return;
    void supabase
      .from("driver_public_profiles")
      .select("full_name, phone, vehicle, plate, color, rating, rating_count")
      .eq("id", ride.driver_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setDriver(data);
      });
    void supabase
      .from("driver_locations")
      .select("lat, lng, heading, updated_at")
      .eq("driver_id", ride.driver_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setDriverLocation(data);
      });
    const locationChannel = supabase
      .channel(`driver-location:${ride.driver_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_locations", filter: `driver_id=eq.${ride.driver_id}` },
        (payload) => setDriverLocation(payload.new as { lat: number; lng: number; heading: number | null; updated_at: string })
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(locationChannel);
    };
  }, [ride?.driver_id]);

  async function cancelRide() {
    if (!ride || submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: cancelError } = await supabase.rpc("cancel_ride_request", {
      p_ride_id: ride.id,
      p_reason: "Annulation demandée par le client"
    });
    setSubmitting(false);
    if (cancelError) {
      setError(cancelError.message || "Impossible d’annuler cette course.");
      return;
    }
    router.replace("/history");
  }

  async function saveRating(value: number) {
    if (!ride || ratingSaved) return;
    setRating(value);
    const { error: ratingError } = await supabase.rpc("rate_completed_ride", {
      p_ride_id: ride.id,
      p_rating: value,
      p_comment: null
    });
    if (ratingError) {
      setError(ratingError.message || "La note n’a pas pu être enregistrée.");
      return;
    }
    setRatingSaved(true);
  }

  const title = service === "airport"
    ? "Taxi Aéroport"
    : service === "intercity"
      ? "Allô Dakar"
      : service === "carpool"
        ? "Covoiturage"
        : "Nouvelle course";
  const eyebrow = service === "intercity"
    ? "Voyage interurbain"
    : service === "carpool"
      ? "Trajet partagé"
      : service === "airport"
        ? "SentraJet AIBD"
        : "SentraJet Ride";

  return (
    <section style={{ padding: "12px 18px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/app" style={{ width: 43, height: 43, borderRadius: 15, background: "white", border: "1px solid var(--line)", display: "grid", placeItems: "center" }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 style={{ margin: "3px 0 0", fontSize: 22 }}>{title}</h1>
        </div>
      </div>

      {step === "route" ? (
        <div style={{ marginTop: 22 }}>
          <div className="map-placeholder">
            <div style={{ position: "absolute", zIndex: 3, left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 46, height: 46, borderRadius: 18, background: "var(--ink)", color: "var(--gold)", display: "grid", placeItems: "center", boxShadow: "0 12px 26px rgba(7,17,31,.25)" }}>
              {service === "airport" ? <Plane /> : service === "carpool" ? <UsersRound /> : <CarFront />}
            </div>
          </div>
          <div className="card" style={{ marginTop: -24, position: "relative", zIndex: 5, padding: 16, display: "grid", gap: 14 }}>
            <LocationInput label="Prise en charge" placeholder="Votre position ou une adresse" value={pickup} onChange={setPickup} allowGeolocation />
            <LocationInput label="Destination" placeholder="Quartier, ville, rue, hôtel ou lieu…" value={destination} onChange={setDestination} />
            {service === "airport" ? (
              <button type="button" className="ghost-button" onClick={() => { setPickup(destination); setDestination(AIBD); }}>
                <Plane size={17} /> Inverser vers / depuis AIBD
              </button>
            ) : null}
            <button className="primary-button" type="button" disabled={!pickup || !destination || loadingRoute} onClick={() => void calculateRoute()}>
              {loadingRoute ? "Calcul de l’itinéraire…" : "Continuer"} <ArrowRight size={18} />
            </button>
            {error ? <div className="error">{error}</div> : null}
          </div>
        </div>
      ) : null}

      {step === "class" && route ? (
        <div style={{ marginTop: 24 }}>
          <div className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between" }}>
            <div><small className="muted">Distance</small><strong style={{ display: "block", marginTop: 4 }}>{route.distanceKm} km</strong></div>
            <div style={{ textAlign: "right" }}><small className="muted">Durée estimée</small><strong style={{ display: "block", marginTop: 4 }}>~{route.durationMinutes} min</strong></div>
          </div>
          <h2 style={{ margin: "24px 0 12px" }}>{service === "carpool" ? "Choisissez votre confort partagé" : "Choisissez votre confort"}</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {(Object.entries(RIDE_CLASSES) as Array<[RideClass, (typeof RIDE_CLASSES)[RideClass]]>)
              .map(([value, item]) => ({ value, label: item.label, description: item.description, icon: CarFront }))
              .map(({ value, label, description, icon: Icon }) => {
              const itemQuote = calculateFare({ ...route, rideClass: value, serviceType: service, scheduledFor: scheduledAt ? new Date(scheduledAt) : null });
              return (
                <button key={value} type="button" onClick={() => setRideClass(value)} className="card" style={{ minHeight: 82, padding: 13, borderWidth: 2, borderColor: rideClass === value ? "var(--gold-deep)" : "var(--line)", display: "flex", alignItems: "center", gap: 13, textAlign: "left" }}>
                  <span style={{ width: 50, height: 50, borderRadius: 17, background: "#f4f6f8", display: "grid", placeItems: "center" }}><Icon /></span>
                  <span style={{ minWidth: 0, flex: 1 }}><strong>{label}</strong><small className="muted" style={{ display: "block", marginTop: 4 }}>{description}</small></span>
                  <strong>{formatFare(itemQuote.total)}</strong>
                </button>
              );
              })}
          </div>
          <div className="card" style={{ marginTop: 14, padding: 15 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
              <input type="checkbox" checked={scheduled} disabled={plannedOnly} onChange={(event) => setScheduled(event.target.checked)} />
              <Clock3 size={18} /> {plannedOnly ? "Départ planifié obligatoire" : "Planifier pour plus tard"}
            </label>
            {scheduled ? <input type="datetime-local" min={new Date(Date.now() + (plannedOnly ? 30 : 0) * 60_000).toISOString().slice(0, 16)} value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} style={{ width: "100%", minHeight: 48, marginTop: 12, border: "1px solid var(--line)", borderRadius: 14, padding: 10 }} /> : null}
          </div>
          <button className="primary-button" style={{ marginTop: 15 }} type="button" disabled={scheduled && !scheduledAt} onClick={() => setStep("review")}>Vérifier la demande</button>
        </div>
      ) : null}

      {step === "review" && pickup && destination && quote ? (
        <div style={{ marginTop: 24 }}>
          <div className="card" style={{ padding: 18 }}>
            <p className="eyebrow">Récapitulatif</p>
            <h2 style={{ margin: "8px 0 0" }}>{formatFare(quote.total)}</h2>
            <div style={{ marginTop: 20, display: "grid", gap: 14 }}>
              <RouteLine label="Départ" value={pickup.address} />
              <RouteLine label="Destination" value={destination.address} />
              <RouteLine label="Service" value={`${title} · ${RIDE_CLASSES[rideClass].label}`} />
              <RouteLine label="Départ" value={scheduled && scheduledAt ? new Date(scheduledAt).toLocaleString("fr-FR") : "Maintenant"} />
            </div>
            <div style={{ marginTop: 18, padding: 13, borderRadius: 15, background: "#eef8f4", display: "flex", gap: 10, color: "#08754a", fontSize: 12 }}>
              <ShieldCheck size={18} /> Prix calculé avant confirmation. Aucun supplément caché.
            </div>
          </div>
          <div className="card" style={{ marginTop: 12, padding: 16 }}>
            <p className="eyebrow">Paiement</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 9 }}>
              <div>
                <strong>Espèces</strong>
                <small className="muted" style={{ display: "block", marginTop: 4 }}>À remettre au chauffeur à l’arrivée</small>
              </div>
              <Check size={19} color="var(--green)" />
            </div>
            <p className="muted" style={{ margin: "12px 0 0", fontSize: 12 }}>Wave et Orange Money seront activés après raccordement sécurisé des encaissements.</p>
          </div>
          {error ? <div className="error" style={{ marginTop: 12 }}>{error}</div> : null}
          <button className="primary-button" style={{ marginTop: 14 }} type="button" disabled={submitting} onClick={() => void requestDriver()}>
            {submitting ? "Création de la demande…" : "Confirmer la réservation"}
          </button>
        </div>
      ) : null}

      {step === "searching" && ride ? (
        <div style={{ minHeight: "calc(100vh - 150px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div className="radar">
            <div style={{ position: "relative", zIndex: 3, width: 58, height: 58, borderRadius: 22, background: "var(--gold)", display: "grid", placeItems: "center" }}><Navigation size={27} /></div>
          </div>
          <h2 style={{ margin: "28px 0 0", fontSize: 26 }}>Recherche en cours…</h2>
          <p className="muted" style={{ maxWidth: 310, lineHeight: 1.55 }}>Nous proposons votre demande aux chauffeurs disponibles les plus proches.</p>
          <div className="card" style={{ width: "100%", marginTop: 22, padding: 15, textAlign: "left" }}>
            <small className="muted">Référence {ride.reference}</small>
            <strong style={{ display: "block", marginTop: 6 }}>{formatFare(ride.estimated_fare)}</strong>
          </div>
          <button className="secondary-button" style={{ marginTop: 14 }} type="button" disabled={submitting} onClick={() => void cancelRide()}>
            {submitting ? "Annulation…" : "Annuler la recherche"}
          </button>
          {error ? <div className="error" style={{ width: "100%", marginTop: 12 }}>{error}</div> : null}
        </div>
      ) : null}

      {step === "confirmed" && ride ? (
        <div className="ride-confirmed">
          <span><Check size={30} /></span>
          <p className="eyebrow">Réservation enregistrée</p>
          <h2>Votre départ est planifié.</h2>
          <p>Nous rechercherons un chauffeur compatible et vous notifierons dès sa confirmation.</p>
          <div className="card">
            <small>{ride.reference}</small>
            <strong>{scheduledAt ? new Date(scheduledAt).toLocaleString("fr-FR") : "Départ planifié"}</strong>
            <em>{pickup?.address} → {destination?.address}</em>
          </div>
          <Link className="primary-button" href="/history">Voir mes trajets</Link>
        </div>
      ) : null}

      {step === "tracking" && ride ? (
        <div style={{ marginTop: 22 }}>
          <div className="live-map" style={{ minHeight: 360 }}>
            {driverLocation ? (
              <iframe
                title="Position du chauffeur"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${driverLocation.lng - 0.018}%2C${driverLocation.lat - 0.012}%2C${driverLocation.lng + 0.018}%2C${driverLocation.lat + 0.012}&layer=mapnik&marker=${driverLocation.lat}%2C${driverLocation.lng}`}
              />
            ) : <div className="map-placeholder" />}
            <div className="live-driver-marker"><CarFront /></div>
          </div>
          <div className="card" style={{ marginTop: -30, position: "relative", zIndex: 5, padding: 18 }}>
            <p className="eyebrow">{ride.status === "driver_arrived" ? "Votre chauffeur est arrivé" : "Chauffeur en route"}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 13, marginTop: 14 }}>
              <div className="avatar"><UserRound size={20} /></div>
              <div style={{ flex: 1 }}>
                <strong>{driver?.full_name || "Chauffeur SentraJet"}</strong>
                <small className="muted" style={{ display: "block", marginTop: 4 }}>{driver?.vehicle || "Véhicule vérifié"} · {driver?.plate || "—"}{driver?.color ? ` · ${driver.color}` : ""}</small>
                {driver?.rating ? <small style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5 }}><Star size={13} fill="var(--gold)" color="var(--gold-deep)" /> {Number(driver.rating).toFixed(1)} ({driver.rating_count})</small> : null}
              </div>
              <div className="pulse-dot" />
            </div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, marginTop: 16 }}>Le suivi de position se met à jour automatiquement jusqu’à la prise en charge.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
              <a className="ghost-button" href={driver?.phone ? `tel:${driver.phone}` : undefined} aria-disabled={!driver?.phone}><Phone size={17} /> Appeler</a>
              <a className="ghost-button" href={driver?.phone ? `sms:${driver.phone}` : undefined} aria-disabled={!driver?.phone}><MessageCircle size={17} /> Message</a>
              <button className="ghost-button" type="button" onClick={() => void navigator.share?.({ title: "Ma course SentraJet", text: `Course ${ride.reference}`, url: window.location.href })}><Share2 size={17} /> Partager</button>
            </div>
            {["assigned", "driver_en_route"].includes(ride.status) ? (
              <button className="secondary-button" style={{ marginTop: 12 }} type="button" disabled={submitting} onClick={() => void cancelRide()}>Annuler la course</button>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === "in_progress" && ride ? (
        <div style={{ marginTop: 22 }}>
          <p className="eyebrow">Course en cours</p>
          <h2 style={{ margin: "7px 0 16px" }}>En route vers votre destination</h2>
          <div className="live-map" style={{ minHeight: 360 }}>
            {driverLocation ? (
              <iframe
                title="Course en cours"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${driverLocation.lng - 0.025}%2C${driverLocation.lat - 0.018}%2C${driverLocation.lng + 0.025}%2C${driverLocation.lat + 0.018}&layer=mapnik&marker=${driverLocation.lat}%2C${driverLocation.lng}`}
              />
            ) : <div className="map-placeholder" />}
            <div className="live-driver-marker"><CarFront /></div>
          </div>
          <div className="card" style={{ marginTop: -28, position: "relative", zIndex: 5, padding: 18 }}>
            <small className="muted">Destination</small>
            <strong style={{ display: "block", marginTop: 5 }}>{ride.destination_address}</strong>
            <div style={{ display: "flex", gap: 20, marginTop: 15 }}>
              <span><small className="muted">Durée estimée</small><strong style={{ display: "block" }}>~{ride.duration_minutes} min</strong></span>
              <span><small className="muted">Distance</small><strong style={{ display: "block" }}>{ride.distance_km} km</strong></span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <a className="secondary-button" href="tel:17"><ShieldCheck size={18} /> Assistance</a>
            <button className="secondary-button" type="button" onClick={() => void navigator.share?.({ title: "Ma course SentraJet", text: `Suivez ma course ${ride.reference}`, url: window.location.href })}><Share2 size={18} /> Partager</button>
          </div>
        </div>
      ) : null}

      {step === "completed" && ride ? (
        <div className="ride-confirmed">
          <span><Check size={30} /></span>
          <p className="eyebrow">Course terminée</p>
          <h2>Merci d’avoir voyagé avec SentraJet.</h2>
          <div className="card" style={{ textAlign: "left" }}>
            <small className="muted">Total payé en espèces</small>
            <strong style={{ fontSize: 26 }}>{formatFare(ride.final_fare ?? ride.estimated_fare)}</strong>
            <em>{ride.pickup_address} → {ride.destination_address}</em>
          </div>
          <div>
            <strong>Évaluer le chauffeur</strong>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" aria-label={`${value} étoile${value > 1 ? "s" : ""}`} onClick={() => void saveRating(value)} style={{ border: 0, background: "transparent", padding: 3 }}>
                  <Star size={29} color="var(--gold-deep)" fill={value <= rating ? "var(--gold)" : "transparent"} />
                </button>
              ))}
            </div>
            {ratingSaved ? <small style={{ color: "var(--green)" }}>Merci, votre note est enregistrée.</small> : null}
          </div>
          <Link className="primary-button" href={`/ride/${ride.id}/receipt`}><ReceiptText size={18} /> Voir le reçu</Link>
          <Link className="secondary-button" href="/app">Retour à l’accueil</Link>
          {error ? <div className="error">{error}</div> : null}
        </div>
      ) : null}
    </section>
  );
}

function RouteLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 11 }}>
      <Check size={18} color="var(--green)" style={{ flex: "0 0 auto", marginTop: 2 }} />
      <div><small className="muted">{label}</small><p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.4 }}>{value}</p></div>
    </div>
  );
}

function stepForRideStatus(status: RideRequest["status"]): Step {
  if (status === "scheduled") return "confirmed";
  if (status === "passenger_on_board") return "in_progress";
  if (status === "completed") return "completed";
  if (["assigned", "driver_en_route", "driver_arrived"].includes(status)) return "tracking";
  return "searching";
}
