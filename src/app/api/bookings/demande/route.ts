import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
  ).trim();
  const key = serviceKey || anonKey;
  if (!url || !key || url.includes("placeholder")) {
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Configuration serveur incomplète (Supabase). Ajoutez NEXT_PUBLIC_SUPABASE_URL et une clé API sur Vercel.",
      },
      { status: 503 }
    );
  }

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
    return NextResponse.json(
      { error: error.message || "Impossible d’enregistrer la demande." },
      { status: 502 }
    );
  }

  return NextResponse.json({ booking: data });
}
