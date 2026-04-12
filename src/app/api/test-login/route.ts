import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const TEST_EMAILS: Record<string, string> = {
  client: process.env.TEST_CLIENT_EMAIL ?? "client@test.sentrajet.sn",
  chauffeur: process.env.TEST_CHAUFFEUR_EMAIL ?? "chauffeur@test.sentrajet.sn",
  partner: process.env.TEST_PARTENAIRE_EMAIL ?? "partenaire@test.sentrajet.sn",
  admin: process.env.TEST_ADMIN_EMAIL ?? "admin@test.sentrajet.sn",
  super_admin: process.env.TEST_SUPER_ADMIN_EMAIL ?? "superadmin@test.sentrajet.sn",
  rental_owner: process.env.TEST_RENTAL_OWNER_EMAIL ?? "loueur@test.sentrajet.sn",
};

const TEST_PASSWORD = process.env.TEST_ACCOUNTS_PASSWORD ?? "TestPass123!";

type Role = "client" | "chauffeur" | "partner" | "admin" | "super_admin" | "rental_owner";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const role = body.role as Role;
    if (!role || !["client", "chauffeur", "partner", "admin", "super_admin", "rental_owner"].includes(role)) {
      return NextResponse.json(
        { error: "role requis: client, chauffeur, partner, admin, super_admin ou rental_owner" },
        { status: 400 }
      );
    }

    const email = TEST_EMAILS[role];
    if (!email) {
      return NextResponse.json({ error: "Email test non configuré" }, { status: 500 });
    }

    const profileRole =
      role === "partner"
        ? "partner"
        : role === "chauffeur"
          ? "driver"
          : role === "admin"
            ? "admin"
            : role === "super_admin"
              ? "super_admin"
              : role === "rental_owner"
                ? "rental_owner"
                : "client";

    const displayName =
      role === "client"
        ? "Test Client"
        : role === "chauffeur"
          ? "Test Driver"
          : role === "partner"
            ? "Test Partner"
            : role === "admin"
              ? "Test Admin"
              : role === "rental_owner"
                ? "Test Rental Owner"
                : "Test Super Admin";

    const { data: listBefore, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
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
        user_metadata: {
          full_name: displayName,
        },
      });
      if (createErr || !createData?.user) {
        return NextResponse.json(
          { error: "Impossible de créer le compte test: " + (createErr?.message ?? "user manquant") },
          { status: 500 }
        );
      }
      user = createData.user;
    } else {
      const { data: updatedData, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          ...(user.user_metadata ?? {}),
          full_name: displayName,
        },
      });
      if (updateErr || !updatedData?.user) {
        return NextResponse.json(
          { error: "Impossible de mettre à jour le compte test: " + (updateErr?.message ?? "user manquant") },
          { status: 500 }
        );
      }
      user = updatedData.user;
    }
    if (user?.id) {
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
        (role === "super_admin" || role === "rental_owner") &&
        String(profileErr.message).toLowerCase().includes("invalid input value for enum")
      ) {
        // Compatibilité temporaire si un enum de rôle n'est pas encore déployé.
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
      if (role === "partner" || role === "rental_owner") {
        const { data: partnerRow } = await supabaseAdmin
          .from("partners")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!partnerRow) {
          const code = "PARTEST" + Math.random().toString(36).slice(2, 8).toUpperCase();
          const { error: partnerErr } = await supabaseAdmin.from("partners").insert({
            user_id: user.id,
            company_name: role === "rental_owner" ? "Test Rental Owner Company" : "Test Partner",
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
    }

    const redirect =
      role === "client"
        ? "/compte"
        : role === "chauffeur"
          ? "/chauffeur"
          : role === "partner"
            ? "/partenaire"
              : role === "rental_owner"
                ? "/partenaire"
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
