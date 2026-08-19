import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSentrajetSupabasePublicConfig } from "@/lib/supabaseConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const { url: supabaseUrl, key: anonKey } = getSentrajetSupabasePublicConfig();

const STAFF_ROLES = ["super_admin", "manager", "ops"];

/**
 * Crée d'un seul geste un gestionnaire de garage Allo Dakar : le compte de connexion (email +
 * mot de passe) et la fiche garage, avec activation immédiate (créé par le staff, pas d'auto-
 * inscription à valider). Réservé au staff SentraJet.
 */
export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", callerData.user.id);
  const isStaff = (roles ?? []).some((r) => STAFF_ROLES.includes(String(r.role)));
  if (!isStaff) {
    return NextResponse.json({ error: "Réservé au staff SentraJet." }, { status: 403 });
  }

  let body: {
    email?: string;
    password?: string;
    fullName?: string;
    garageName?: string;
    phone?: string;
    city?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const fullName = body.fullName?.trim() ?? "";
  const garageName = body.garageName?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";

  if (!email || !email.includes("@")) return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  if (password.length < 12) return NextResponse.json({ error: "Mot de passe trop court (12 caractères minimum)." }, { status: 400 });
  if (!fullName) return NextResponse.json({ error: "Nom complet requis." }, { status: 400 });
  if (!garageName) return NextResponse.json({ error: "Nom du garage requis." }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Téléphone requis." }, { status: 400 });

  let createdUserId: string | null = null;
  try {
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError || !created.user) {
      const duplicate = createError?.message.toLowerCase().includes("already");
      return NextResponse.json(
        { error: duplicate ? "Cet email est déjà utilisé." : "Impossible de créer le compte." },
        { status: duplicate ? 409 : 500 },
      );
    }
    createdUserId = created.user.id;

    const { data: garage, error: garageError } = await supabaseAdmin
      .from("allo_dakar_garages")
      .insert({
        manager_user_id: createdUserId,
        name: garageName,
        phone,
        city: body.city ?? null,
        status: "actif",
      })
      .select()
      .single();
    if (garageError) throw garageError;

    return NextResponse.json({ garage }, { status: 201 });
  } catch (err) {
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId).catch(() => null);
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Impossible de créer le garage." },
      { status: 500 },
    );
  }
}
