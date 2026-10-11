"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, CarFront, LoaderCircle, MapPin, Navigation, Plane, UsersRound } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { LocationInput } from "@/components/LocationInput";
import { saveRideDraft } from "@/lib/rideDraft";
import type { Place, ServiceType } from "@/lib/types";

const AIBD: Place = {
  id: "aibd",
  label: "Aéroport International Blaise Diagne",
  address: "Aéroport International Blaise Diagne (AIBD), Diass, Sénégal",
  lat: 14.6711,
  lng: -17.0669,
  region: "Thiès"
};

const SERVICES: Array<{
  value: ServiceType;
  label: string;
  shortLabel: string;
  icon: typeof CarFront;
}> = [
  { value: "ride", label: "Course urbaine", shortLabel: "Course", icon: CarFront },
  { value: "intercity", label: "Voyage interurbain", shortLabel: "Interurbain", icon: CalendarClock },
  { value: "airport", label: "Taxi Aéroport AIBD", shortLabel: "Aéroport", icon: Plane },
  { value: "carpool", label: "Trajet partagé", shortLabel: "Covoiturage", icon: UsersRound }
];

function normalizedRegion(region?: string) {
  return (region || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(region|department)\b/gi, "")
    .trim()
    .toLocaleLowerCase("fr");
}

export default function ClientHomePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [pickup, setPickup] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [preferredService, setPreferredService] = useState<ServiceType>("ride");
  const [route, setRoute] = useState<{
    distanceKm: number;
    durationMinutes: number;
    geometry?: number[][];
  } | null>(null);
  const [routeKey, setRouteKey] = useState("");
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pickup || !destination) {
      setRoute(null);
      setRouteKey("");
      return;
    }
    const nextKey = `${pickup.lat},${pickup.lng}:${destination.lat},${destination.lng}`;
    if (nextKey === routeKey) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoadingRoute(true);
      setError(null);
      void fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickup, destination }),
        signal: controller.signal
      })
        .then(async (response) => {
          const data = await response.json() as {
            distanceKm?: number;
            durationMinutes?: number;
            geometry?: number[][];
            error?: string;
          };
          if (!response.ok || !data.distanceKm || !data.durationMinutes) {
            throw new Error(data.error || "Itinéraire introuvable.");
          }
          setRoute({
            distanceKm: data.distanceKm,
            durationMinutes: data.durationMinutes,
            geometry: data.geometry
          });
          setRouteKey(nextKey);
        })
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === "AbortError") return;
          setRoute(null);
          setError(reason instanceof Error ? reason.message : "Impossible de calculer cet itinéraire.");
        })
        .finally(() => setLoadingRoute(false));
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [destination, pickup, routeKey]);

  const classification = useMemo(() => {
    if (!route || !pickup || !destination) return null;
    const pickupRegion = normalizedRegion(pickup.region);
    const destinationRegion = normalizedRegion(destination.region);
    const sameRegion = !pickupRegion || !destinationRegion || pickupRegion === destinationRegion;
    const urbanEligible = sameRegion && route.distanceKm <= 50;
    const airportTrip = pickup.id === "aibd" || destination.id === "aibd";
    const service: ServiceType = airportTrip
      ? "airport"
      : preferredService === "ride" && !urbanEligible
        ? "intercity"
        : preferredService;
    return { sameRegion, urbanEligible, service };
  }, [destination, pickup, preferredService, route]);

  function selectService(service: ServiceType) {
    setPreferredService(service);
    if (service === "airport" && destination?.id !== "aibd" && pickup?.id !== "aibd") {
      setDestination(AIBD);
    }
  }

  function continueRide() {
    if (!pickup || !destination || !route || !classification) return;
    saveRideDraft({
      pickup,
      destination,
      route,
      service: classification.service,
      savedAt: new Date().toISOString()
    });
    router.push(`/ride?service=${classification.service}&draft=home`);
  }

  return (
    <AuthGate role="client">
      <AppShell>
        <section className="client-home client-home-v3">
          <div className="client-home-title">
            <div>
              <p className="eyebrow">Bonjour {profile?.full_name?.split(" ")[0] || ""}</p>
              <h1>Où allons-nous ?</h1>
            </div>
            <span><Navigation size={14} /> Sénégal</span>
          </div>

          <div className="client-map-stage" aria-hidden="true">
            <span className="map-road road-one" />
            <span className="map-road road-two" />
            <span className="map-position"><i /><MapPin size={17} /></span>
            <small>{pickup ? pickup.label : "Localisation en cours…"}</small>
          </div>

          <div className="home-route-panel">
            <div className="route-rail" aria-hidden="true"><i /><span /><b /></div>
            <div className="home-route-fields">
              <LocationInput
                label="Départ"
                placeholder="Votre position ou un lieu"
                value={pickup}
                onChange={setPickup}
                allowGeolocation
                autoLocate
              />
              <LocationInput
                label="Destination"
                placeholder="Rue, pharmacie, mosquée, commerce…"
                value={destination}
                onChange={setDestination}
                proximity={pickup}
              />
            </div>
          </div>

          <div className="home-service-tabs" aria-label="Choisir un service">
            {SERVICES.map(({ value, shortLabel, label, icon: Icon }) => (
              <button
                type="button"
                key={value}
                title={label}
                className={preferredService === value ? "active" : ""}
                onClick={() => selectService(value)}
              >
                <Icon size={17} />
                <span>{shortLabel}</span>
              </button>
            ))}
          </div>

          {error ? <div className="home-route-message error">{error}</div> : null}
          {loadingRoute ? (
            <div className="home-route-message"><LoaderCircle className="spin" size={17} /> Calcul de l’itinéraire réel…</div>
          ) : null}
          {route && classification ? (
            <div className={`route-decision ${classification.urbanEligible ? "urban" : "intercity"}`}>
              <div>
                <small>{classification.service === "intercity" ? "Interurbain recommandé" : "Trajet disponible"}</small>
                <strong>{route.distanceKm} km · ~{route.durationMinutes} min</strong>
                {!classification.urbanEligible && preferredService === "ride" ? (
                  <p>{classification.sameRegion ? "La distance dépasse 50 km." : "La destination change de région."} Vos adresses sont conservées.</p>
                ) : null}
              </div>
              <button type="button" onClick={continueRide}>
                {classification.service === "intercity" ? "Voir les départs" : "Voir les prix"} <ArrowRight size={17} />
              </button>
            </div>
          ) : null}
        </section>
      </AppShell>
    </AuthGate>
  );
}
