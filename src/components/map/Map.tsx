"use client";

import { useMemo } from "react";
import {
  SENEGAL_CENTER,
  getBoundsFromPoints,
  getCityCoords,
} from "@/lib/geo";
import { GoogleMap } from "./GoogleMap";

const HAS_GOOGLE_MAPS_KEY = typeof process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY === "string" &&
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.length > 0;

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  type?: "depart" | "arrival" | "trip";
}

interface MapProps {
  /** Hauteur du conteneur (ex: "300px", "100%") */
  height?: string;
  /** Marqueurs à afficher */
  markers?: MapMarker[];
  /** Villes (noms) pour départ/arrivée — utilisées si pas de markers */
  fromCity?: string;
  toCity?: string;
  /** Zoom (1–18) */
  zoom?: number;
  className?: string;
}

/** OSM iframe : hooks isolés pour respecter les règles React (pas de return avant les hooks). */
function OpenStreetMapEmbed({
  height,
  markers = [],
  fromCity,
  toCity,
  className,
}: Pick<MapProps, "height" | "markers" | "fromCity" | "toCity" | "className">) {
  const points = useMemo(() => {
    const list: Array<{ lat: number; lng: number }> = [];
    if (markers.length > 0) {
      markers.forEach((m) => list.push({ lat: m.lat, lng: m.lng }));
    } else {
      if (fromCity) {
        const c = getCityCoords(fromCity);
        if (c) list.push(c);
      }
      if (toCity) {
        const c = getCityCoords(toCity);
        if (c) list.push(c);
      }
    }
    return list;
  }, [markers, fromCity, toCity]);

  const embedUrl = useMemo(() => {
    const centerLat = SENEGAL_CENTER.lat;
    const centerLng = SENEGAL_CENTER.lng;
    if (points.length === 0) {
      const delta = 0.05;
      const bbox = [
        centerLng - delta,
        centerLat - delta,
        centerLng + delta,
        centerLat + delta,
      ].join("%2C");
      return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${centerLat}%2C${centerLng}`;
    }
    const bounds = getBoundsFromPoints(points);
    const bbox = [
      bounds.minLng,
      bounds.minLat,
      bounds.maxLng,
      bounds.maxLat,
    ].join("%2C");
    const markerParam = points.length === 1
      ? `marker=${points[0].lat}%2C${points[0].lng}`
      : `marker=${points[0].lat}%2C${points[0].lng}&marker=${points[1].lat}%2C${points[1].lng}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&${markerParam}`;
  }, [points]);

  return (
    <div
      className={`overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 ${className}`}
      style={{ height }}
    >
      <iframe
        title="Carte du trajet"
        src={embedUrl}
        className="h-full w-full border-0"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

/**
 * Carte interactive via Google Maps si clé dispo, sinon OpenStreetMap (iframe).
 */
export function Map({
  height = "300px",
  markers = [],
  fromCity,
  toCity,
  zoom = 10,
  className = "",
}: MapProps) {
  if (HAS_GOOGLE_MAPS_KEY) {
    return (
      <GoogleMap
        height={height}
        markers={markers}
        fromCity={fromCity}
        toCity={toCity}
        zoom={zoom}
        className={className}
      />
    );
  }

  return (
    <OpenStreetMapEmbed
      height={height}
      markers={markers}
      fromCity={fromCity}
      toCity={toCity}
      className={className}
    />
  );
}
