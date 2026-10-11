"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import type { Place } from "@/lib/types";

const DEFAULT_CENTER: [number, number] = [-17.4441, 14.6937];

export function ClientRouteMap({
  pickup,
  destination,
  geometry
}: {
  pickup: Place | null;
  destination: Place | null;
  geometry?: number[][];
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!container.current || map.current) return;
    let active = true;
    void import("maplibre-gl").then(({ Map }) => {
      if (!active || !container.current) return;
      map.current = new Map({
        container: container.current,
        style: process.env.NEXT_PUBLIC_MAP_STYLE_URL
          || "https://tiles.openfreemap.org/styles/bright",
        center: DEFAULT_CENTER,
        zoom: 11.5,
        attributionControl: false
      });
      map.current.dragRotate.disable();
      map.current.touchZoomRotate.disableRotation();
      map.current.once("load", () => setMapReady(true));
    });
    return () => {
      active = false;
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapReady) return;

    async function syncMap() {
      if (!map.current) return;
      const { LngLatBounds, Marker: MapMarker } = await import("maplibre-gl");
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];

      if (pickup) {
        markers.current.push(
          new MapMarker({ color: "#087d63" })
            .setLngLat([pickup.lng, pickup.lat])
            .addTo(map.current)
        );
      }
      if (destination) {
        markers.current.push(
          new MapMarker({ color: "#f2b824" })
            .setLngLat([destination.lng, destination.lat])
            .addTo(map.current)
        );
      }

      const routeData = {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: geometry ?? []
        }
      };
      const source = map.current.getSource("sentrajet-route") as GeoJSONSource | undefined;
      if (source) {
        source.setData(routeData);
      } else if (geometry?.length) {
        map.current.addSource("sentrajet-route", { type: "geojson", data: routeData });
        map.current.addLayer({
          id: "sentrajet-route-line",
          type: "line",
          source: "sentrajet-route",
          paint: {
            "line-color": "#087d63",
            "line-width": 5,
            "line-opacity": 0.9
          },
          layout: {
            "line-cap": "round",
            "line-join": "round"
          }
        });
      }

      const points = [pickup, destination].filter((place): place is Place => Boolean(place));
      if (points.length === 2) {
        const bounds = new LngLatBounds();
        points.forEach((place) => bounds.extend([place.lng, place.lat]));
        map.current.fitBounds(bounds, { padding: 42, maxZoom: 14, duration: 650 });
      } else if (points.length === 1) {
        map.current.easeTo({ center: [points[0].lng, points[0].lat], zoom: 14, duration: 500 });
      }
    }

    void syncMap();
  }, [destination, geometry, mapReady, pickup]);

  return <div ref={container} className="client-route-map" aria-label="Carte du trajet" />;
}
