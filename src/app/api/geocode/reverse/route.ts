import { NextRequest, NextResponse } from "next/server";
import { formatCoordinatesLabel } from "@/lib/geoFormat";

async function reverseWithGoogle(lat: number, lng: number, key: string): Promise<string | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}&language=fr`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status: string;
    results?: Array<{
      formatted_address?: string;
      address_components?: Array<{ long_name: string; types: string[] }>;
    }>;
  };
  if (data.status !== "OK" || !data.results?.[0]) return null;
  const comp = data.results[0].address_components ?? [];
  const locality = comp.find((c) => c.types.includes("locality"))?.long_name;
  const admin2 = comp.find((c) => c.types.includes("administrative_area_level_2"))?.long_name;
  const admin1 = comp.find((c) => c.types.includes("administrative_area_level_1"))?.long_name;
  return locality || admin2 || admin1 || data.results[0].formatted_address || null;
}

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
};

async function reverseWithNominatim(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&format=json&accept-language=fr`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "SenTrajet/1.0 (+https://sentrajet.sn)",
      Accept: "application/json",
    },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { address?: NominatimAddress; display_name?: string };
  const a = data.address;
  if (!a) {
    const parts = data.display_name?.split(",").map((s) => s.trim()) ?? [];
    return parts.slice(0, 2).join(", ") || null;
  }
  return (
    a.city ||
    a.town ||
    a.village ||
    a.municipality ||
    a.county ||
    a.state ||
    a.region ||
    data.display_name?.split(",")[0]?.trim() ||
    null
  );
}

/**
 * GET /api/geocode/reverse?lat=...&lng=...
 * Google si clé présente, sinon (ou en secours) Nominatim.
 */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat et lng invalides" }, { status: 400 });
  }

  const googleKey =
    process.env.GOOGLE_MAPS_SERVER_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    "";

  let label: string | null = null;
  if (googleKey) {
    try {
      label = await reverseWithGoogle(lat, lng, googleKey);
    } catch {
      label = null;
    }
  }
  if (!label) {
    try {
      label = await reverseWithNominatim(lat, lng);
    } catch {
      label = null;
    }
  }

  return NextResponse.json({
    label,
    fallback: label ? null : formatCoordinatesLabel(lat, lng),
  });
}
