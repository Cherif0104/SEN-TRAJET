import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  canAccessAdminZone,
  canAccessCommercialZone,
  canAccessDriverZone,
  canAccessFinanceZone,
  canAccessFleetZone,
  canAccessManagerZone,
  canAccessOpsZone,
  canAccessRhZone,
  canAccessOwnerZone,
  canAccessPartnerZone,
  normalizeRole,
} from "@/lib/rbac";
import { getSentrajetSupabasePublicConfig } from "@/lib/supabaseConfig";

const { url: supabaseUrl, key: supabaseKey } =
  getSentrajetSupabasePublicConfig();

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isChauffeur = pathname.startsWith("/chauffeur");
  const isAdmin = pathname.startsWith("/admin");
  const isOps = pathname.startsWith("/ops");
  const isCommercial = pathname.startsWith("/commercial");
  const isFinance = pathname.startsWith("/finance");
  const isFleet = pathname.startsWith("/fleet");
  const isRh = pathname.startsWith("/rh");
  const isManager = pathname.startsWith("/manager");
  const isPartenaire = pathname.startsWith("/partenaire");
  const isProprietaire = pathname.startsWith("/proprietaire");
  const isCompte = pathname.startsWith("/compte");
  const isProtected =
    isChauffeur || isAdmin || isOps || isCommercial || isFinance || isFleet || isRh || isManager || isPartenaire || isProprietaire || isCompte;

  try {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    // En pratique, la session Supabase côté navigateur est stockée localement.
    // Si le cookie SSR est absent/incomplet, un redirect middleware provoquerait
    // une boucle infinie vers /connexion?next=... ; on laisse alors les layouts
    // client gérer l'authentification.
    if (isProtected && !session) {
      return response;
    }

    if (session && isProtected) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      let role = profile?.role as string | undefined;
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .limit(10);
      const rawRoles = (roleRows ?? []).map((r) => String((r as { role: string }).role));
      if (!role) {
        role = rawRoles[0];
      }

      const forbidden =
        (isChauffeur && !canAccessDriverZone(role)) ||
        (isAdmin && !canAccessAdminZone(role)) ||
        (isOps && !canAccessOpsZone(rawRoles.includes("ops") ? "ops" : role, role)) ||
        (isCommercial && !canAccessCommercialZone(role)) ||
        (isFinance && !canAccessFinanceZone(rawRoles.includes("finance") ? "finance" : role, role)) ||
        (isFleet && !canAccessFleetZone(rawRoles.includes("fleet_manager") ? "fleet_manager" : role, role)) ||
        (isRh && !canAccessRhZone(rawRoles.includes("rh") ? "rh" : role, role)) ||
        (isManager && !canAccessManagerZone(rawRoles.includes("manager") ? "manager" : role, role)) ||
        (isPartenaire && !canAccessPartnerZone(role)) ||
        (isProprietaire && !canAccessOwnerZone(role)) ||
        (isCompte && normalizeRole(role) !== "client");

      if (forbidden) {
        const redirectUrl = new URL("/dashboard", request.url);
        redirectUrl.searchParams.set("forbidden", "1");
        return NextResponse.redirect(redirectUrl);
      }
    }

    return response;
  } catch (err) {
    console.error("[middleware] Erreur non bloquante:", err);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/chauffeur",
    "/chauffeur/:path*",
    "/admin",
    "/admin/:path*",
    "/ops",
    "/ops/:path*",
    "/commercial",
    "/commercial/:path*",
    "/finance",
    "/finance/:path*",
    "/fleet",
    "/fleet/:path*",
    "/rh",
    "/rh/:path*",
    "/manager",
    "/manager/:path*",
    "/partenaire",
    "/partenaire/:path*",
    "/proprietaire",
    "/proprietaire/:path*",
    "/compte",
    "/compte/:path*",
  ],
};
