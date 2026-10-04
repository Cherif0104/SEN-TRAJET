import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromBearer } from "@/lib/server/authUser";
import {
  buildIntercityQuote,
  parseIntercityRouteRequest,
} from "@/lib/server/intercity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  const input = parseIntercityRouteRequest(
    await request.json().catch(() => null),
  );
  if (!input) {
    return NextResponse.json(
      { error: "Vérifiez le trajet, l’horaire, le retour et le nombre de passagers." },
      { status: 400 },
    );
  }

  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
    } = await Promise.resolve({ data: { user: await getUserFromBearer(request.headers.get("authorization")) }, error: null });
    if (!user) {
      return NextResponse.json({ error: "Votre session a expiré." }, { status: 401 });
    }

    const quote = await buildIntercityQuote(admin, input);
    return NextResponse.json({ quote });
  } catch (error) {
    console.error("[intercity-quote]", error);
    if (error instanceof Error && error.message === "intercity_route_unavailable") {
      return NextResponse.json(
        { error: "Impossible de calculer cet itinéraire routier. Vérifiez les deux adresses." },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: "Impossible de calculer les disponibilités interurbaines." },
      { status: 503 },
    );
  }
}
