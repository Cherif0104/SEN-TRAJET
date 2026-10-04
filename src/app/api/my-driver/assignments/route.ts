import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromBearer } from "@/lib/server/authUser";
import { getSentrajetSupabasePublicConfig } from "@/lib/supabaseConfig";

export const runtime = "nodejs";

function bearer(request: NextRequest) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
}

export async function GET(request: NextRequest) {
  try {
    const token = bearer(request);
    if (!token) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    const admin = getSupabaseAdmin();
    const {
      data: { user },
    } = await Promise.resolve({ data: { user: await getUserFromBearer(request.headers.get("authorization")) }, error: null });
    if (!user) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
    const { data: profile } = await admin
      .from("my_driver_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) return NextResponse.json({ assignments: [] });
    const { data, error } = await admin
      .from("my_driver_assignments")
      .select(`
        *,
        request:my_driver_requests(
          id, reference, client_name, pickup_address, starts_at, duration_hours,
          mission_type, vehicle_type, transmission, required_language, notes,
          driver_payout_fcfa, status, payment_status
        )
      `)
      .eq("driver_profile_id", profile.id)
      .in("status", ["proposee", "acceptee"])
      .order("proposed_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ assignments: data ?? [] });
  } catch (error) {
    console.error("[my-driver-assignments-get]", error);
    return NextResponse.json({ error: "Missions indisponibles." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const token = bearer(request);
  if (!token) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    assignmentId?: string;
    accept?: boolean;
  };
  if (!body.assignmentId || typeof body.accept !== "boolean") {
    return NextResponse.json({ error: "Réponse invalide." }, { status: 400 });
  }
  try {
    const { url, key } = getSentrajetSupabasePublicConfig();
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { error } = await client.rpc("respond_my_driver_assignment", {
      p_assignment_id: body.assignmentId,
      p_accept: body.accept,
    });
    if (error) {
      if (error.message.includes("my_driver_")) {
        return NextResponse.json(
          { error: "Cette proposition n’est plus disponible." },
          { status: 409 },
        );
      }
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[my-driver-assignment-response]", error);
    return NextResponse.json({ error: "Réponse non enregistrée." }, { status: 503 });
  }
}
