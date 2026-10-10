"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Check,
  Clock3,
  Navigation,
  Plane,
  ShieldCheck,
  UserRound,
  UsersRound
} from "lucide-react";
import { LocationInput } from "@/components/LocationInput";
import { supabase } from "@/lib/supabase";
import { calculateFare, formatFare, RIDE_CLASSES } from "@/lib/fare";
import type { Place, RideClass, RideRequest, ServiceType } from "@/lib/types";

type Step = "route" | "class" | "review" | "searching" | "confirmed" | "tracking";

const AIBD: Place = {
  id: "aibd",
  label: "Aéroport International Blaise Diagne",
  address: "Aéroport International Blaise Diagne (AIBD), Diass, Sénégal",
  lat: 14.6711,
  lng: -17.0669
};

export function RideFlow() {
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
  const [driver, setDriver] = useState<{ full_name: string; phone: string | null; vehicle: string | null; plate: string | null } | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; heading: number | null; updated_at: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setRoute({ distanceKm: data.distanceKm, durationMinutes: data.durationMinutes });
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
        p_delivery_kind: null
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
      setError(reason instanceof Error ? reason.message : "La recherche n’a pas pu démarrer.");
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
          if (["assigned", "driver_en_route", "driver_arrived", "passenger_on_board"].includes(updated.status)) {
            setStep("tracking");
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
      .select("full_name, phone, vehicle, plate")
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
            {scheduled ? <input type="datetime-local" min={new Date().toISOString().slice(0, 16)} value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} style={{ width: "100%", minHeight: 48, marginTop: 12, border: "1px solid var(--line)", borderRadius: 14, padding: 10 }} /> : null}
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
          {error ? <div className="error" style={{ marginTop: 12 }}>{error}</div> : null}
          <button className="primary-button" style={{ marginTop: 14 }} type="button" disabled={submitting} onClick={() => void requestDriver()}>
            {submitting ? "Création de la demande…" : scheduled ? "Confirmer la réservation" : "Trouver un chauffeur"}
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
              <div style={{ flex: 1 }}><strong>{driver?.full_name || "Chauffeur SentraJet"}</strong><small className="muted" style={{ display: "block", marginTop: 4 }}>{driver?.vehicle || "Véhicule vérifié"} · {driver?.plate || "—"}</small></div>
              <div className="pulse-dot" />
            </div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, marginTop: 16 }}>Le suivi de position se met à jour automatiquement jusqu’à la prise en charge.</p>
          </div>
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
