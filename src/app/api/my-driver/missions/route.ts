import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const REQUEST_SELECT = `
  *,
  assigned_driver:my_driver_profiles!assigned_driver_profile_id(
    id, full_name, city, photo_url, languages, years_experience,
    average_rating, completed_jobs
  )
`;

async function getUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const {
    data: { user },
  } = await getSupabaseAdmin().auth.getUser(token);
  return user ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    const requestId = request.nextUrl.searchParams.get("requestId");
    if (!requestId) {
      return NextResponse.json({ error: "Mission manquante." }, { status: 400 });
    }
    const { data, error } = await getSupabaseAdmin()
      .from("my_driver_requests")
      .select(REQUEST_SELECT)
      .eq("id", requestId)
      .eq("client_user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Mission introuvable." }, { status: 404 });
    return NextResponse.json({ request: data });
  } catch (error) {
    console.error("[my-driver-mission-get]", error);
    return NextResponse.json({ error: "Mission indisponible." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const startsAt = new Date(String(body.startsAt ?? ""));
    if (
      !String(body.clientName ?? "").trim() ||
      String(body.clientPhone ?? "").replace(/\D/g, "").length < 9 ||
      !String(body.pickupAddress ?? "").trim() ||
      !Number.isFinite(startsAt.getTime())
    ) {
      return NextResponse.json(
        { error: "Lieu, horaire et coordonnées valides sont requis." },
        { status: 400 },
      );
    }
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc("create_my_driver_request", {
      p_user_id: user.id,
      p_client_name: String(body.clientName).trim(),
      p_client_phone: String(body.clientPhone).trim(),
      p_pickup_address: String(body.pickupAddress).trim(),
      p_pickup_lat: Number.isFinite(Number(body.pickupLat)) ? Number(body.pickupLat) : null,
      p_pickup_lng: Number.isFinite(Number(body.pickupLng)) ? Number(body.pickupLng) : null,
      p_starts_at: startsAt.toISOString(),
      p_duration_hours: Math.max(2, Math.min(720, Number(body.durationHours) || 8)),
      p_mission_type: String(body.missionType ?? "journee"),
      p_vehicle_type: String(body.vehicleType ?? "berline"),
      p_transmission: String(body.transmission ?? "manuelle"),
      p_required_language: String(body.requiredLanguage ?? "").trim() || null,
      p_notes: String(body.notes ?? "").trim() || null,
      p_max_budget_fcfa:
        Number(body.maxBudgetFcfa) > 0 ? Math.round(Number(body.maxBudgetFcfa)) : null,
    });
    if (error) {
      if (error.message.includes("my_driver_request_invalid")) {
        return NextResponse.json(
          { error: "Vérifiez l’horaire, la durée et le véhicule." },
          { status: 400 },
        );
      }
      throw error;
    }
    const requestId = String((data as { request_id: string }).request_id);
    const { data: row, error: readError } = await admin
      .from("my_driver_requests")
      .select(REQUEST_SELECT)
      .eq("id", requestId)
      .single();
    if (readError) throw readError;
    return NextResponse.json({ request: row }, { status: 201 });
  } catch (error) {
    console.error("[my-driver-mission-create]", error);
    return NextResponse.json({ error: "La recherche n’a pas pu être lancée." }, { status: 503 });
  }
}
