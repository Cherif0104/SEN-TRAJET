import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { computePriceBreakdown, type PickupMode } from "@/lib/pricing";
import {
  FREE_TRIP_PUBLICATIONS,
  TRIP_PUBLICATION_COST_CREDITS,
  TRIP_PUBLICATION_COST_FCFA,
  TRIP_PUBLICATION_MAX_LOAN_CREDITS,
} from "@/lib/tripPublishing";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

type PublishTripPayload = {
  driverId: string;
  driverName: string;
  fromCity: string;
  toCity: string;
  fromPlace?: string;
  toPlace?: string;
  departureTime: string;
  arrivalTime?: string;
  distanceKm?: number;
  durationMinutes?: number;
  vehicleName?: string;
  vehicleCategory?: string;
  totalSeats: number;
  availableSeats: number;
  priceFcfa: number;
  pickupMode?: PickupMode;
  driverPickupPointLabel?: string;
  driverPickupLat?: number;
  driverPickupLng?: number;
  homePickupExtraFcfa?: number;
  tripType?: "interurbain_location" | "interurbain_covoiturage" | "urbain" | "aeroport" | "colis";
};

export async function POST(request: NextRequest) {
  let body: {
    payload?: PublishTripPayload;
    access_token?: string;
    refresh_token?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const payload = body.payload;
  if (!payload || !body.access_token) {
    return NextResponse.json({ error: "Requête incomplète" }, { status: 400 });
  }

  if (payload.priceFcfa <= 0 || payload.totalSeats < 1 || payload.availableSeats < 1) {
    return NextResponse.json({ error: "Paramètres de trajet invalides" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.setSession({
    access_token: body.access_token,
    refresh_token: body.refresh_token ?? "",
  });
  if (authError || !user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (payload.driverId !== user.id) {
    return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
  }

  const { count } = await supabaseAdmin
    .from("trips")
    .select("id", { count: "exact", head: true })
    .eq("driver_id", user.id);

  const publishedTrips = Number(count ?? 0);
  const freeTripsRemaining = Math.max(0, FREE_TRIP_PUBLICATIONS - publishedTrips);
  const requiresWalletDebit = freeTripsRemaining === 0;

  if (requiresWalletDebit) {
    let { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("id, balance_credits")
      .eq("driver_id", user.id)
      .maybeSingle();

    if (!wallet) {
      const created = await supabaseAdmin
        .from("wallets")
        .insert({ driver_id: user.id, balance_credits: 0 })
        .select("id, balance_credits")
        .single();
      if (created.error) {
        return NextResponse.json({ error: "Impossible d'initialiser le wallet publication." }, { status: 500 });
      }
      wallet = created.data;
    }

    const currentBalance = Number(wallet.balance_credits ?? 0);
    if (currentBalance <= -TRIP_PUBLICATION_MAX_LOAN_CREDITS) {
      return NextResponse.json(
        {
          error:
            "Publication bloquée: découvert maximum atteint (-2000 FCFA). Rechargez votre compte pour continuer.",
        },
        { status: 402 }
      );
    }

    const nextBalance = currentBalance - TRIP_PUBLICATION_COST_CREDITS;
    const { error: walletError } = await supabaseAdmin
      .from("wallets")
      .update({ balance_credits: nextBalance })
      .eq("id", wallet.id);
    if (walletError) {
      return NextResponse.json({ error: "Impossible de débiter le wallet publication." }, { status: 500 });
    }

    await supabaseAdmin.from("transactions").insert({
      wallet_id: wallet.id,
      type: "debit",
      credits: -TRIP_PUBLICATION_COST_CREDITS,
      reference: `trip_publish_${Date.now()}`,
      description:
        currentBalance > 0
          ? `Publication trajet (-${TRIP_PUBLICATION_COST_FCFA} FCFA)`
          : `Publication trajet en découvert (-${TRIP_PUBLICATION_COST_FCFA} FCFA)`,
    });
  }

  const pickupMode = payload.pickupMode ?? "driver_point";
  const price = await computePriceBreakdown({
    basePriceFcfa: payload.priceFcfa,
    pickupMode,
    homePickupExtraFcfa: payload.homePickupExtraFcfa,
  });

  const tripInsertPayload = {
    driver_id: payload.driverId,
    driver_name: payload.driverName,
    pickup_mode: pickupMode,
    driver_pickup_point_label: payload.driverPickupPointLabel ?? null,
    driver_pickup_lat: payload.driverPickupLat ?? null,
    driver_pickup_lng: payload.driverPickupLng ?? null,
    from_city: payload.fromCity,
    to_city: payload.toCity,
    from_place: payload.fromPlace || null,
    to_place: payload.toPlace || null,
    departure_time: payload.departureTime,
    arrival_time: payload.arrivalTime || null,
    distance_km: payload.distanceKm ?? 0,
    duration_minutes: payload.durationMinutes ?? 0,
    vehicle_name: payload.vehicleName || null,
    vehicle_category: payload.vehicleCategory || "Standard",
    total_seats: payload.totalSeats,
    available_seats: Math.min(payload.availableSeats, payload.totalSeats),
    base_price_fcfa: price.basePriceFcfa,
    home_pickup_extra_fcfa:
      price.pickupExtraFcfa > 0 ? price.pickupExtraFcfa : payload.homePickupExtraFcfa ?? 2000,
    price_fcfa: price.basePriceFcfa,
    status: "active",
    trip_type: payload.tripType || "interurbain_covoiturage",
  };

  const { data: trip, error: tripError } = await supabaseAdmin
    .from("trips")
    .insert(tripInsertPayload)
    .select("*")
    .single();

  if (tripError) {
    return NextResponse.json({ error: tripError.message }, { status: 500 });
  }

  return NextResponse.json({
    trip,
    billing: {
      freeTripsRemainingBeforePublish: freeTripsRemaining,
      debitedCredits: requiresWalletDebit ? TRIP_PUBLICATION_COST_CREDITS : 0,
      debitedFcfa: requiresWalletDebit ? TRIP_PUBLICATION_COST_FCFA : 0,
    },
  });
}

