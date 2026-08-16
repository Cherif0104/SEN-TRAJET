import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/** URL publique du projet SEN TRAJET — fallback si env Preview incomplète. */
const FALLBACK_SUPABASE_URL = "https://ootvzknyhkhxroadnclh.supabase.co";
/** Clé anon JWT (publique par design) — fallback Preview uniquement. */
const FALLBACK_ANON_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdHZ6a255aGtoeHJvYWRuY2xoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NDQ4MDAsImV4cCI6MjA5NTAyMDgwMH0.8xyIiOk_VFJVGCjoZioXmmDsthvV-o3WX-QI7y1aLQc";

type DemandeBody = {
  clientId?: string | null;
  partnerContractId?: string | null;
  pickup: string;
  dropoff: string;
  pickupTime: string;
  serviceType: string;
  passengers: number;
  estimatedPrice: number | null;
  pricingSegment?: string;
  distanceKm?: number | null;
  notes?: string | null;
  vehiclesNeeded?: number;
  isRoundTrip?: boolean;
  phone?: string | null;
  flightNumber?: string | null;
  passengerName?: string | null;
  luggageCount?: number | null;
};

function serverSupabase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim() || FALLBACK_SUPABASE_URL;
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
  ).trim();
  // Préférer JWT anon à la publishable key pour le REST legacy
  const key =
    serviceKey ||
    (anonKey.startsWith("eyJ") ? anonKey : "") ||
    FALLBACK_ANON_JWT;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function friendlyFetchError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/fetch failed|failed to fetch|ECONNREFUSED|ENOTFOUND|network/i.test(msg)) {
    return "Connexion à la base indisponible temporairement. Réessayez dans quelques secondes.";
  }
  return msg.split("\n")[0]?.split(" at ")[0]?.trim() || "Impossible d’enregistrer la demande.";
}

export async function POST(req: NextRequest) {
  let body: DemandeBody;
  try {
    body = (await req.json()) as DemandeBody;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!body.pickup?.trim() || !body.dropoff?.trim() || !body.pickupTime || !body.serviceType) {
    return NextResponse.json(
      { error: "Départ, destination, date/heure et type de prestation sont requis." },
      { status: 400 }
    );
  }

  const phoneDigits = String(body.phone ?? "").replace(/\D/g, "");
  if (phoneDigits.length < 9) {
    return NextResponse.json(
      { error: "Indiquez un numéro de téléphone joignable (ex. +221 7X XXX XX XX)." },
      { status: 400 }
    );
  }

  const supabase = serverSupabase();

  try {
    const { data, error } = await supabase.rpc("submit_booking_demande", {
      p_pickup: body.pickup.trim(),
      p_dropoff: body.dropoff.trim(),
      p_pickup_time: body.pickupTime,
      p_service_type: body.serviceType,
      p_passengers: Math.max(1, Number(body.passengers) || 1),
      p_estimated_price: body.estimatedPrice,
      p_pricing_segment: body.pricingSegment ?? "client",
      p_distance_km: body.distanceKm ?? null,
      p_notes: body.notes ?? null,
      p_phone: body.phone?.trim() || null,
      p_flight_number: body.flightNumber ?? null,
      p_passenger_name: body.passengerName ?? null,
      p_luggage_count: body.luggageCount ?? null,
      p_vehicles_needed: body.vehiclesNeeded ?? 1,
      p_is_round_trip: Boolean(body.isRoundTrip),
      p_client_id: body.clientId ?? null,
      p_partner_contract_id: body.partnerContractId ?? null,
    });

    if (error) {
      return NextResponse.json({ error: friendlyFetchError(error.message) }, { status: 502 });
    }

    return NextResponse.json({ booking: data });
  } catch (err) {
    return NextResponse.json({ error: friendlyFetchError(err) }, { status: 502 });
  }
}
