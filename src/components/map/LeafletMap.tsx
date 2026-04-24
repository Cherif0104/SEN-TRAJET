"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { getBoundsFromPoints, getCityCoords, SENEGAL_CENTER } from "@/lib/geo";
import type { MapMarker } from "./Map";

// Fix icônes Leaflet (Next/webpack ne copie pas automatiquement les assets).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
});

function FitBounds({ points }: { points: Array<{ lat: number; lng: number }> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], Math.max(map.getZoom(), 12), { animate: true });
      return;
    }
    const b = getBoundsFromPoints(points);
    map.fitBounds(
      [
        [b.minLat, b.minLng],
        [b.maxLat, b.maxLng],
      ],
      { padding: [24, 24] }
    );
  }, [map, points]);
  return null;
}

export function LeafletMap({
  height = "300px",
  markers = [],
  fromCity,
  toCity,
  zoom = 10,
  className = "",
}: {
  height?: string;
  markers?: MapMarker[];
  fromCity?: string;
  toCity?: string;
  zoom?: number;
  className?: string;
}) {
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

  const center = points.length > 0 ? points[0] : SENEGAL_CENTER;

  return (
    <div className={`overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 ${className}`} style={{ height }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={points.length >= 2 ? 10 : zoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds points={points} />

        {(markers.length > 0 ? markers : (points.map((p, i) => ({ ...p, label: i === 0 ? fromCity : toCity })) as MapMarker[])).map(
          (m, idx) => (
            <Marker key={`${m.lat}-${m.lng}-${idx}`} position={[m.lat, m.lng]}>
              {(m.label || m.type) && (
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{m.label ?? "Point"}</p>
                    {m.type && <p className="text-xs opacity-70">{m.type}</p>}
                  </div>
                </Popup>
              )}
            </Marker>
          )
        )}
      </MapContainer>
    </div>
  );
}

