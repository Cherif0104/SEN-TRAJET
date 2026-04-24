import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { canAccessAdminZone, canAccessDriverZone, canAccessPartnerZone } from "@/lib/rbac";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  ""
).trim();

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isChauffeur = pathname.startsWith("/chauffeur");
  const isAdmin = pathname.startsWith("/admin");
  const isPartenaire = pathname.startsWith("/partenaire");

  /** Sans URL + clé valides, createServerClient lève → 500 sur toute la zone. On laisse passer. */
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

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
    if ((isChauffeur || isAdmin || isPartenaire) && !session) {
      return response;
    }

    if (session && (isChauffeur || isAdmin || isPartenaire)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      const role = profile?.role as string | undefined;

      const forbidden =
        (isChauffeur && !canAccessDriverZone(role)) ||
        (isAdmin && !canAccessAdminZone(role)) ||
        (isPartenaire && !canAccessPartnerZone(role));

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
    "/partenaire",
    "/partenaire/:path*",
  ],
};
