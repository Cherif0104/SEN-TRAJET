"use client";

import Script from "next/script";
import { useRef, useEffect, useState, useMemo } from "react";
import { getCityCoords, getBoundsFromPoints, SENEGAL_CENTER } from "@/lib/geo";
import type { MapMarker } from "./Map";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface GoogleMapProps {
  height?: string;
  markers?: MapMarker[];
  fromCity?: string;
  toCity?: string;
  zoom?: number;
  className?: string;
}


export function GoogleMap({
  height = "300px",
  markers = [],
  fromCity,
  toCity,
  zoom = 10,
  className = "",
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  /** Évite conflit de noms avec Map ES6 (types Google). */
  const mapRef = useRef<unknown>(null);
  /** Références marqueurs (type minimal pour éviter conflits de définitions @types). */
  const markersRef = useRef<Array<{ setMap: (map: google.maps.Map | null) => void }>>([]);
  const [scriptReady, setScriptReady] = useState(false);

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

  useEffect(() => {
    if (!scriptReady || !window.google || !containerRef.current) return;

    const center = points.length > 0
      ? (() => {
          const b = getBoundsFromPoints(points);
          return { lat: (b.minLat + b.maxLat) / 2, lng: (b.minLng + b.maxLng) / 2 };
        })()
      : SENEGAL_CENTER;

    const map = new window.google.maps.Map(containerRef.current, {
      center,
      zoom: points.length >= 2 ? 10 : zoom,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [],
    });

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (markers.length > 0) {
      markers.forEach((m, i) => {
        const marker = new window.google!.maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map,
          title: m.label ?? (m.type === "depart" ? "Départ" : m.type === "arrival" ? "Arrivée" : "Point"),
          label: markers.length <= 2 && (m.type === "depart" || m.type === "arrival")
            ? (m.type === "depart" ? "A" : "B")
            : undefined,
        });
        markersRef.current.push(marker);
      });
    } else if (points.length > 0) {
      points.forEach((p, i) => {
        const marker = new window.google!.maps.Marker({
          position: p,
          map,
          title: i === 0 && fromCity ? fromCity : i === 1 && toCity ? toCity : undefined,
          label: points.length === 2 ? (i === 0 ? "A" : "B") : undefined,
        });
        markersRef.current.push(marker);
      });
    }

    if (points.length >= 2) {
      const b = getBoundsFromPoints(points);
      map.fitBounds({
        north: b.maxLat,
        south: b.minLat,
        east: b.maxLng,
        west: b.minLng,
      }, { top: 24, right: 24, bottom: 24, left: 24 });
    }

    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      mapRef.current = null;
    };
  }, [scriptReady, fromCity, toCity, zoom, points, markers]);

  if (!API_KEY) return null;

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${API_KEY}`}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div
        ref={containerRef}
        className={`overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 ${className}`}
        style={{ height }}
        aria-label="Carte Google Maps du trajet"
      />
    </>
  );
}
