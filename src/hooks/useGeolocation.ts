"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  /** Ignore les positions trop imprécises (en mètres). */
  minAccuracyMeters?: number;
  /** Ignore les mises à jour si déplacement trop faible (en mètres). */
  minDistanceMeters?: number;
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
    maximumAge = 15000,
    watch = false,
    minAccuracyMeters = 1500,
    minDistanceMeters = 30,
  } = options;

  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const positionRef = useRef<GeoPosition | null>(null);
  const errorRef = useRef<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const enableHighAccuracyRef = useRef(enableHighAccuracy);
  const timeoutRef = useRef(timeout);
  const maximumAgeRef = useRef(maximumAge);
  const skipOptionsRestartRef = useRef(true);

  useEffect(() => {
    enableHighAccuracyRef.current = enableHighAccuracy;
    timeoutRef.current = timeout;
    maximumAgeRef.current = maximumAge;
  }, [enableHighAccuracy, timeout, maximumAge]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  const computeDistanceMeters = useCallback((a: GeoPosition, b: GeoPosition): number => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371e3;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  }, []);

  const normalizePosition = useCallback((pos: GeolocationPosition): GeoPosition => {
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? undefined,
      heading: pos.coords.heading ?? undefined,
      speed: pos.coords.speed != null ? pos.coords.speed * 3.6 : undefined,
      timestamp: pos.timestamp,
    };
  }, []);

  const shouldAccept = useCallback(
    (next: GeoPosition, prev: GeoPosition | null): boolean => {
      const acc = Number(next.accuracy ?? 999999);
      if (!Number.isFinite(acc)) return true;

      // Si on n'a rien encore, on accepte même si imparfait, sauf aberration.
      if (!prev) return acc <= Math.max(minAccuracyMeters, 5000);

      const prevAcc = Number(prev.accuracy ?? 999999);

      // Évite de remplacer une bonne position par une mauvaise.
      if (acc > minAccuracyMeters && prevAcc <= minAccuracyMeters) return false;

      // Ignore les “bruits” : faible déplacement sans gain de précision.
      const moved = computeDistanceMeters(prev, next);
      const improved = acc < prevAcc - 25;
      return moved >= minDistanceMeters || improved;
    },
    [computeDistanceMeters, minAccuracyMeters, minDistanceMeters]
  );

  const handlePosition = useCallback(
    (pos: GeolocationPosition) => {
      const next = normalizePosition(pos);
      const prev = positionRef.current;
      if (!shouldAccept(next, prev)) return;

      // Évite les rerenders inutiles si la position n'a pas changé (watchPosition spam).
      if (
        prev &&
        prev.lat === next.lat &&
        prev.lng === next.lng &&
        prev.accuracy === next.accuracy &&
        prev.heading === next.heading &&
        prev.speed === next.speed &&
        prev.timestamp === next.timestamp
      ) {
        return;
      }

      setPosition(next);
      if (errorRef.current) setError(null);
    },
    [normalizePosition, shouldAccept]
  );

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
    const getOnce = (opts: PositionOptions) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, opts);
      });

    try {
      // 1) Tentative rapide (souvent suffisante, moins coûteuse batterie).
      const quick = await getOnce({
        enableHighAccuracy: false,
        timeout: Math.min(timeout, 9000),
        maximumAge: Math.max(maximumAge, 60000),
      });
      const quickNorm = normalizePosition(quick);
      handlePosition(quick);

      const quickAcc = Number(quickNorm.accuracy ?? 999999);
      if (!enableHighAccuracy || quickAcc <= minAccuracyMeters) {
        setLoading(false);
        return { ok: true, position: quickNorm };
      }

      // 2) Raffinement haute précision si la première position est trop vague.
      const refined = await getOnce({
        enableHighAccuracy: true,
        timeout,
        maximumAge: 0,
      });
      const refinedNorm = normalizePosition(refined);
      handlePosition(refined);
      setLoading(false);
      return { ok: true, position: refinedNorm };
    } catch (err) {
      handleError(err as GeolocationPositionError);
      const e = err as GeolocationPositionError;
      const msg =
        e?.code === 1
          ? "Géolocalisation refusée. Autorisez la position dans le navigateur."
          : e?.code === 2
            ? "Position indisponible"
            : "Délai dépassé pour la position";
      setLoading(false);
      return { ok: false, error: msg };
    }
  }, [enableHighAccuracy, timeout, maximumAge, normalizePosition, handlePosition, handleError, minAccuracyMeters]);

  const startWatching = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (watchIdRef.current != null) return;
    const id = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: enableHighAccuracyRef.current,
        timeout: timeoutRef.current,
        maximumAge: maximumAgeRef.current,
      }
    );
    watchIdRef.current = id;
  }, [handlePosition, handleError]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!watch) {
      skipOptionsRestartRef.current = true;
      return;
    }
    startWatching();
    skipOptionsRestartRef.current = false;
    return () => stopWatching();
  }, [watch, startWatching, stopWatching]);

  useEffect(() => {
    if (!watch) return;
    if (skipOptionsRestartRef.current) return;
    if (watchIdRef.current == null) return;
    stopWatching();
    startWatching();
  }, [watch, enableHighAccuracy, timeout, maximumAge, startWatching, stopWatching]);

  return {
    position,
    error,
    loading,
    getPosition,
    startWatching,
    stopWatching,
  };
}
