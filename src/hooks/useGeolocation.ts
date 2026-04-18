"use client";

import { useCallback, useEffect, useState } from "react";

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

export type GetPositionResult =
  | { ok: true; position: GeoPosition }
  | { ok: false; error: string };

interface UseGeolocationResult {
  position: GeoPosition | null;
  error: string | null;
  loading: boolean;
  getPosition: () => Promise<GetPositionResult>;
  startWatching: () => void;
  stopWatching: () => void;
}

export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationResult {
  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 5000,
    watch = false,
  } = options;

  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const handlePosition = useCallback((pos: GeolocationPosition) => {
    setPosition({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? undefined,
      heading: pos.coords.heading ?? undefined,
      speed: pos.coords.speed != null ? pos.coords.speed * 3.6 : undefined,
      timestamp: pos.timestamp,
    });
    setError(null);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(
      err.code === 1
        ? "Géolocalisation refusée"
        : err.code === 2
          ? "Position indisponible"
          : "Délai dépassé"
    );
    setPosition(null);
  }, []);

  const getPosition = useCallback(async (): Promise<GetPositionResult> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const msg = "Géolocalisation non supportée";
      setError(msg);
      return { ok: false, error: msg };
    }
    setLoading(true);
    setError(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handlePosition(pos);
          setLoading(false);
          resolve({
            ok: true,
            position: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? undefined,
              heading: pos.coords.heading ?? undefined,
              speed: pos.coords.speed != null ? pos.coords.speed * 3.6 : undefined,
              timestamp: pos.timestamp,
            },
          });
        },
        (err) => {
          handleError(err);
          setLoading(false);
          const msg =
            err.code === 1
              ? "Géolocalisation refusée. Autorisez la position dans le navigateur."
              : err.code === 2
                ? "Position indisponible"
                : "Délai dépassé pour la position";
          resolve({ ok: false, error: msg });
        },
        { enableHighAccuracy, timeout, maximumAge }
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge, handlePosition, handleError]);

  const startWatching = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy, timeout, maximumAge }
    );
    setWatchId(id);
  }, [enableHighAccuracy, timeout, maximumAge, handlePosition, handleError]);

  const stopWatching = useCallback(() => {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  useEffect(() => {
    if (watch) startWatching();
    return () => stopWatching();
  }, [watch, startWatching, stopWatching]);

  return {
    position,
    error,
    loading,
    getPosition,
    startWatching,
    stopWatching,
  };
}
