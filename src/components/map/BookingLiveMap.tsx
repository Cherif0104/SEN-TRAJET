"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Map } from "./Map";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useBookingLocations } from "@/hooks/useBookingLocations";
import { pushBookingLocation } from "@/lib/bookingLocations";
import { MapPin, Navigation } from "lucide-react";
import type { MapMarker } from "./Map";
import { computeDistanceKm } from "@/lib/geo";

const LeafletMap = dynamic(() => import("./LeafletMap").then((mod) => mod.LeafletMap), { ssr: false });

interface BookingLiveMapProps {
  bookingId: string;
  fromCity?: string;
  toCity?: string;
  /** Rôle : le client partage sa position, le chauffeur partage la sienne. */
  userRole?: "client" | "driver";
  /** Active/désactive le partage automatique de la position de l'utilisateur courant. */
  trackingEnabled?: boolean;
  className?: string;
}

const POSITION_PUSH_INTERVAL_MS = 15000;

export function BookingLiveMap({
  bookingId,
  fromCity,
  toCity,
  userRole = "client",
  trackingEnabled = true,
  className = "",
}: BookingLiveMapProps) {
  const [trackingReady, setTrackingReady] = useState(false);
  const { position: myPosition, getPosition, startWatching, stopWatching } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
  });
  const { clientPosition, driverPosition, loading } = useBookingLocations(bookingId);
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
  if (clientCoords) markers.push({ ...clientCoords, type: "depart" });
  if (driverCoords) markers.push({ ...driverCoords, type: "arrival" });

  const straightLineKm =
    clientCoords && driverCoords
      ? computeDistanceKm(
          { lat: driverCoords.lat, lng: driverCoords.lng },
          { lat: clientCoords.lat, lng: clientCoords.lng }
        )
      : null;

  const [route, setRoute] = useState<{ points: { lat: number; lng: number }[]; durationMinutes: number | null } | null>(null);

  useEffect(() => {
    if (!driverCoords || !clientCoords) {
      setRoute(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromLat: driverCoords.lat,
            fromLng: driverCoords.lng,
            toLat: clientCoords.lat,
            toLng: clientCoords.lng,
          }),
        });
        const data = (await res.json().catch(() => null)) as
          | { points?: { lat: number; lng: number }[]; durationMinutes?: number | null }
          | null;
        if (!cancelled && res.ok && data?.points?.length) {
          setRoute({ points: data.points, durationMinutes: data.durationMinutes ?? null });
        } else if (!cancelled) {
          setRoute(null);
        }
      } catch {
        if (!cancelled) setRoute(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverCoords?.lat, driverCoords?.lng, clientCoords?.lat, clientCoords?.lng]);

  useEffect(() => {
    if (!trackingEnabled || !trackingReady || !bookingId || !myPosition) return;

    const push = async () => {
      await pushBookingLocation(bookingId, userRole, {
        lat: myPosition.lat,
        lng: myPosition.lng,
        accuracy: myPosition.accuracy,
        heading: myPosition.heading,
        speed: myPosition.speed,
      });
    };

    void push();
    pushIntervalRef.current = setInterval(push, POSITION_PUSH_INTERVAL_MS);
    return () => {
      if (pushIntervalRef.current) {
        clearInterval(pushIntervalRef.current);
        pushIntervalRef.current = null;
      }
    };
  }, [bookingId, trackingEnabled, trackingReady, userRole, myPosition]);

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
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {trackingEnabled ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">
            <Navigation className="h-3.5 w-3.5" /> Suivi live actif
          </span>
        ) : null}
        {driverPosition ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900">
            <MapPin className="h-3.5 w-3.5" /> Chauffeur localisé
          </span>
        ) : null}
        {loading ? <span className="text-xs text-neutral-500">Chargement de la position…</span> : null}
        {route?.durationMinutes != null ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-800">
            ≈ {route.durationMinutes} min par la route
          </span>
        ) : straightLineKm != null ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-800">
            Distance à vol d’oiseau : {straightLineKm.toFixed(1)} km
          </span>
        ) : null}
      </div>
      {route?.points?.length ? (
        <LeafletMap height="240px" markers={markers.length > 0 ? markers : undefined} routePoints={route.points} />
      ) : (
        <Map
          height="240px"
          markers={markers.length > 0 ? markers : undefined}
          fromCity={fromCity}
          toCity={toCity}
          zoom={markers.length >= 2 ? 12 : 10}
        />
      )}
      {!driverPosition && !loading ? (
        <p className="mt-2 text-xs text-neutral-500">
          Position du chauffeur pas encore disponible — elle apparaît dès qu&apos;il active le suivi.
        </p>
      ) : null}
    </div>
  );
}
