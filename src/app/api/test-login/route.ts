import { NextResponse } from "next/server";

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
