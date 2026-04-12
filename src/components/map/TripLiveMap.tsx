"use client";

import { useEffect, useRef, useState } from "react";
import { Map } from "./Map";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useTripLocations } from "@/hooks/useTripLocations";
import { pushTripLocation } from "@/lib/tripLocations";
import { MapPin, Navigation } from "lucide-react";
import type { MapMarker } from "./Map";

interface TripLiveMapProps {
  tripId: string;
  fromCity?: string;
  toCity?: string;
  /** Rôle: client partage sa position, driver partage la sienne */
  userRole?: "client" | "driver";
  className?: string;
}

const POSITION_PUSH_INTERVAL_MS = 10000;

export function TripLiveMap({
  tripId,
  fromCity,
  toCity,
  userRole = "client",
  className = "",
}: TripLiveMapProps) {
  const [sharePosition, setSharePosition] = useState(false);
  const { position: myPosition, getPosition, startWatching } =
    useGeolocation({ enableHighAccuracy: true, timeout: 10000 });
  const { clientPosition, driverPosition, loading } =
    useTripLocations(tripId);
  const pushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const markers: MapMarker[] = [];
  const clientCoords =
    userRole === "client" && sharePosition && myPosition
      ? { lat: myPosition.lat, lng: myPosition.lng, label: "Vous (client)" }
      : clientPosition
        ? { lat: clientPosition.lat, lng: clientPosition.lng, label: "Client" }
        : null;
  const driverCoords =
    userRole === "driver" && sharePosition && myPosition
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

  useEffect(() => {
    if (!sharePosition || !tripId || !myPosition) return;

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
  }, [tripId, sharePosition, userRole, myPosition]);

  const handleSharePosition = async () => {
    const pos = await getPosition();
    if (pos && tripId) {
      await pushTripLocation(tripId, userRole, {
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        heading: pos.heading,
        speed: pos.speed,
      });
    }
  };

  const handleStartSharing = () => {
    setSharePosition(true);
    getPosition().then(() => startWatching());
  };

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
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
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSharePosition}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <MapPin className="h-4 w-4" />
            Partager ma position
          </button>
          {!sharePosition && (
            <button
              type="button"
              onClick={handleStartSharing}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark"
            >
              <Navigation className="h-4 w-4" />
              Suivi temps réel
            </button>
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
