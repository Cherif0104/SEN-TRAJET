import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  SENTRAJET_SUPABASE_ANON_KEY,
  SENTRAJET_SUPABASE_URL,
} from "@/lib/supabaseConfig";

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

function serverSupabase(authorization?: string | null) {
  // Cette RPC publique possède ses propres contrôles. Une service_role Vercel
  // obsolète ne doit ni casser la réservation ni contourner inutilement RLS.
  return createClient(SENTRAJET_SUPABASE_URL, SENTRAJET_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: authorization ? { Authorization: authorization } : {},
    },
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

  const supabase = serverSupabase(req.headers.get("authorization"));

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
