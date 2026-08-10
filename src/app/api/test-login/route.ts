import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const TEST_EMAILS: Record<string, string> = {
  client: process.env.TEST_CLIENT_EMAIL ?? "client@test.sentrajet.sn",
  chauffeur: process.env.TEST_CHAUFFEUR_EMAIL ?? "chauffeur@test.sentrajet.sn",
  partner: process.env.TEST_PARTENAIRE_EMAIL ?? "partenaire@test.sentrajet.sn",
  admin: process.env.TEST_ADMIN_EMAIL ?? "admin@test.sentrajet.sn",
  super_admin: process.env.TEST_SUPER_ADMIN_EMAIL ?? "superadmin@test.sentrajet.sn",
  proprietaire: process.env.TEST_PROPRIETAIRE_EMAIL ?? "proprietaire@test.sentrajet.sn",
};

const TEST_PASSWORD = process.env.TEST_ACCOUNTS_PASSWORD ?? "TestPass123!";

type Role = keyof typeof TEST_EMAILS;

function testAccountsAllowed(): boolean {
  if (process.env.ENABLE_TEST_ACCOUNTS === "true") return true;
  if (process.env.VERCEL_ENV === "preview") return true;
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

export async function POST(request: Request) {
  if (!testAccountsAllowed()) {
    return NextResponse.json(
      { error: "Comptes démo désactivés en production. Activez ENABLE_TEST_ACCOUNTS=true si besoin." },
      { status: 404 }
    );
  }

  const expectedSecret = process.env.TEST_LOGIN_SECRET;
  if (expectedSecret) {
    const providedSecret = request.headers.get("x-test-login-secret");
    if (providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { role?: string };
    const role = body.role as Role | undefined;
    if (!role || !(role in TEST_EMAILS)) {
      return NextResponse.json(
        {
          error:
            "role requis: client, chauffeur, partner, admin, super_admin ou proprietaire",
        },
        { status: 400 }
      );
    }

    const email = TEST_EMAILS[role];
    const profileRole =
      role === "partner"
        ? "partner"
        : role === "chauffeur"
          ? "driver"
          : role === "admin"
            ? "admin"
            : role === "super_admin"
              ? "super_admin"
              : role === "proprietaire"
                ? "vehicle_owner"
                : "client";

    const displayName =
      role === "client"
        ? "Test Client"
        : role === "chauffeur"
          ? "Test Chauffeur Flotte"
          : role === "partner"
            ? "Test Partenaire B2B"
            : role === "admin"
              ? "Test Admin"
              : role === "proprietaire"
                ? "Test Propriétaire"
                : "Test Super Admin";

    const { data: listBefore, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });
    if (listErr) {
      return NextResponse.json(
        { error: "Impossible de lister les comptes test: " + listErr.message },
        { status: 500 }
      );
    }

    let user = listBefore?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;

    if (!user) {
      const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: displayName },
      });
      if (createErr || !createData?.user) {
        return NextResponse.json(
          { error: "Impossible de créer le compte test: " + (createErr?.message ?? "user manquant") },
          { status: 500 }
        );
      }
      user = createData.user;
    } else {
      const { data: updatedData, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
          password: TEST_PASSWORD,
          email_confirm: true,
          user_metadata: {
            ...(user.user_metadata ?? {}),
            full_name: displayName,
          },
        }
      );
      if (updateErr || !updatedData?.user) {
        return NextResponse.json(
          {
            error:
              "Impossible de mettre à jour le compte test: " + (updateErr?.message ?? "user manquant"),
          },
          { status: 500 }
        );
      }
      user = updatedData.user;
    }

    let persistedRole = profileRole;
    let { error: profileErr } = await supabaseAdmin.from("profiles").upsert(
      {
        id: user.id,
        role: persistedRole,
        full_name: displayName,
      },
      { onConflict: "id" }
    );
    if (
      profileErr &&
      (role === "super_admin" || role === "proprietaire") &&
      String(profileErr.message).toLowerCase().includes("invalid input value for enum")
    ) {
      persistedRole = role === "super_admin" ? "admin" : "partner";
      const fallback = await supabaseAdmin.from("profiles").upsert(
        {
          id: user.id,
          role: persistedRole,
          full_name: displayName,
        },
        { onConflict: "id" }
      );
      profileErr = fallback.error;
    }
    if (profileErr) {
      return NextResponse.json(
        { error: "Impossible de mettre à jour le profil test: " + profileErr.message },
        { status: 500 }
      );
    }

    if (role === "partner") {
      const { data: partnerRow } = await supabaseAdmin
        .from("partners")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!partnerRow) {
        const code = "PARTEST" + Math.random().toString(36).slice(2, 8).toUpperCase();
        const { error: partnerErr } = await supabaseAdmin.from("partners").insert({
          user_id: user.id,
          company_name: "Test Partenaire B2B",
          contact_name: displayName,
          invite_code: code,
          is_active: true,
        });
        if (partnerErr) {
          return NextResponse.json(
            { error: "Impossible de créer le partenaire test: " + partnerErr.message },
            { status: 500 }
          );
        }
      }
    }

    const redirect =
      role === "client"
        ? "/reserver"
        : role === "chauffeur"
          ? "/chauffeur/missions"
          : role === "partner"
            ? "/partenaire"
            : role === "proprietaire"
              ? "/proprietaire"
              : role === "admin"
                ? "/admin/demandes"
                : "/admin";

    return NextResponse.json({
      email,
      password: TEST_PASSWORD,
      redirect,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
