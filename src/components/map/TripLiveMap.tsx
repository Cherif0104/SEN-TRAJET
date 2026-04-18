"use client";

import { useEffect, useRef, useState } from "react";
import { Map } from "./Map";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useTripLocations } from "@/hooks/useTripLocations";
import { pushTripLocation } from "@/lib/tripLocations";
import { MapPin, Navigation } from "lucide-react";
import type { MapMarker } from "./Map";
import { computeDistanceKm } from "@/lib/geo";

interface TripLiveMapProps {
  tripId: string;
  fromCity?: string;
  toCity?: string;
  /** Rôle: client partage sa position, driver partage la sienne */
  userRole?: "client" | "driver";
  /** Active/désactive le tracking live automatique */
  trackingEnabled?: boolean;
  className?: string;
}

const POSITION_PUSH_INTERVAL_MS = 10000;

export function TripLiveMap({
  tripId,
  fromCity,
  toCity,
  userRole = "client",
  trackingEnabled = true,
  className = "",
}: TripLiveMapProps) {
  const [trackingReady, setTrackingReady] = useState(false);
  const { position: myPosition, getPosition, startWatching, stopWatching } =
    useGeolocation({ enableHighAccuracy: true, timeout: 10000 });
  const { clientPosition, driverPosition, loading } =
    useTripLocations(tripId);
  const pushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const markers: MapMarker[] = [];
  const clientCoords =
    userRole === "client" && trackingReady && myPosition
      ? { lat: myPosition.lat, lng: myPosition.lng, label: "Vous (client)" }
      : clientPosition
        ? { lat: clientPosition.lat, lng: clientPosition.lng, label: "Client" }
        : null;
  const driverCoords =
    userRole === "driver" && trackingReady && myPosition
      ? { lat: myPosition.lat, lng: myPosition.lng, label: "Vous (chauffeur)" }
      : driverPosition
        ? { lat: driverPosition.lat, lng: driverPosition.lng, label: "Chauffeur" }
        : null;
  if (clientCoords) {
    markers.push({ ...clientCoords, type: "depart" });
  }
  if (driverCoords) {
    markers.push({ ...driverCoords, type: "arrival" });
  }

  const driverToClientKm =
    clientCoords && driverCoords
      ? computeDistanceKm(
          { lat: driverCoords.lat, lng: driverCoords.lng },
          { lat: clientCoords.lat, lng: clientCoords.lng }
        )
      : null;

  useEffect(() => {
    if (!trackingEnabled || !trackingReady || !tripId || !myPosition) return;

    const push = async () => {
      await pushTripLocation(tripId, userRole, {
        lat: myPosition.lat,
        lng: myPosition.lng,
        accuracy: myPosition.accuracy,
        heading: myPosition.heading,
        speed: myPosition.speed,
      });
    };

    push();
    pushIntervalRef.current = setInterval(push, POSITION_PUSH_INTERVAL_MS);
    return () => {
      if (pushIntervalRef.current) {
        clearInterval(pushIntervalRef.current);
        pushIntervalRef.current = null;
      }
    };
  }, [tripId, trackingEnabled, trackingReady, userRole, myPosition]);

  useEffect(() => {
    if (!trackingEnabled) {
      setTrackingReady(false);
      stopWatching();
      return;
    }
    let mounted = true;
    getPosition().then((res) => {
      if (!mounted || !res.ok) return;
      setTrackingReady(true);
      startWatching();
    });
    return () => {
      mounted = false;
      stopWatching();
    };
  }, [trackingEnabled, getPosition, startWatching, stopWatching]);

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          {trackingEnabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">
              <Navigation className="h-3.5 w-3.5" />
              Suivi live auto
            </span>
          )}
          {clientPosition && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary">
              <MapPin className="h-3.5 w-3.5" />
              Client localisé
            </span>
          )}
          {driverPosition && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-1 text-secondary">
              <Navigation className="h-3.5 w-3.5" />
              Chauffeur en route
            </span>
          )}
          {loading && (
            <span className="text-neutral-500">Chargement des positions…</span>
          )}
          {driverToClientKm != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-sky-800">
              Distance client/chauffeur: {driverToClientKm.toFixed(1)} km
            </span>
          )}
        </div>
      </div>
      <Map
        height="280px"
        markers={markers.length > 0 ? markers : undefined}
        fromCity={fromCity}
        toCity={toCity}
        zoom={markers.length >= 2 ? 12 : 10}
      />
    </div>
  );
}
