import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromBearer } from "@/lib/server/authUser";

export const runtime = "nodejs";

async function authenticatedUser(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return null;
  const admin = getSupabaseAdmin();
  const {
    data: { user },
  } = await Promise.resolve({ data: { user: await getUserFromBearer(request.headers.get("authorization")) }, error: null });
  return user ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    const admin = getSupabaseAdmin();
    const { data: profile, error } = await admin
      .from("my_driver_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    const { data: subscriptions } = profile
      ? await admin
          .from("my_driver_subscriptions")
          .select("*")
          .eq("driver_profile_id", profile.id)
          .order("created_at", { ascending: false })
      : { data: [] };
    return NextResponse.json({ profile, subscriptions: subscriptions ?? [] });
  } catch (error) {
    console.error("[my-driver-profile-get]", error);
    return NextResponse.json({ error: "Profil indisponible." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const fullName = String(body.fullName ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const licenseNumber = String(body.licenseNumber ?? "").trim();
    const vehicleSkills = Array.isArray(body.vehicleSkills)
      ? body.vehicleSkills.map(String)
      : [];
    const transmissionSkills = Array.isArray(body.transmissionSkills)
      ? body.transmissionSkills.map(String)
      : [];
    const documentPath = (value: unknown) => {
      const path = String(value ?? "").trim();
      return path.startsWith(`${user.id}/`) ? path : null;
    };
    const cvUrl = documentPath(body.cvUrl);
    const licenseDocumentUrl = documentPath(body.licenseDocumentUrl);
    const idDocumentUrl = documentPath(body.idDocumentUrl);
    const photoUrl = documentPath(body.photoUrl);
    if (
      !fullName ||
      phone.replace(/\D/g, "").length < 9 ||
      !licenseNumber ||
      !vehicleSkills.length ||
      !transmissionSkills.length ||
      !cvUrl ||
      !licenseDocumentUrl ||
      !idDocumentUrl
    ) {
      return NextResponse.json(
        { error: "Nom, téléphone, permis et compétences de conduite sont requis." },
        { status: 400 },
      );
    }
    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
      .from("my_driver_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "Votre profil chauffeur existe déjà." }, { status: 409 });
    }
    const { data: profile, error } = await admin
      .from("my_driver_profiles")
      .insert({
        user_id: user.id,
        full_name: fullName,
        phone,
        city: String(body.city ?? "Dakar").trim() || "Dakar",
        license_number: licenseNumber,
        license_categories: Array.isArray(body.licenseCategories)
          ? body.licenseCategories.map(String)
          : ["B"],
        years_experience: Math.max(0, Math.min(60, Number(body.yearsExperience) || 0)),
        languages: Array.isArray(body.languages) ? body.languages.map(String) : ["Français"],
        vehicle_skills: vehicleSkills,
        transmission_skills: transmissionSkills,
        bio: String(body.bio ?? "").trim() || null,
        hourly_rate_fcfa: Math.max(500, Number(body.hourlyRateFcfa) || 1500),
        daily_rate_fcfa: Math.max(3000, Number(body.dailyRateFcfa) || 7000),
        cv_url: cvUrl,
        license_document_url: licenseDocumentUrl,
        id_document_url: idDocumentUrl,
        photo_url: photoUrl,
        status: "en_attente",
        is_available: false,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error("[my-driver-profile-create]", error);
    return NextResponse.json({ error: "Candidature impossible." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as { isAvailable?: boolean };
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("my_driver_profiles")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile || profile.status !== "verifie") {
      return NextResponse.json(
        { error: "Votre dossier doit être validé avant la mise en ligne." },
        { status: 409 },
      );
    }
    if (body.isAvailable) {
      const { data: subscription } = await admin
        .from("my_driver_subscriptions")
        .select("id")
        .eq("driver_profile_id", profile.id)
        .eq("status", "actif")
        .lte("starts_at", new Date().toISOString())
        .gt("ends_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();
      if (!subscription) {
        return NextResponse.json(
          { error: "Activez votre abonnement hebdomadaire pour recevoir des missions." },
          { status: 402 },
        );
      }
    }
    const { data: updated, error } = await admin
      .from("my_driver_profiles")
      .update({
        is_available: Boolean(body.isAvailable),
        availability_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error("[my-driver-profile-availability]", error);
    return NextResponse.json({ error: "Disponibilité non modifiée." }, { status: 503 });
  }
}
