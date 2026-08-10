import { NextResponse } from "next/server";

/** Publication de trajets chauffeur — abandonnée (plus de marketplace). */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Publication de trajets désactivée. SentraJet Premium assigne les missions aux chauffeurs de la flotte.",
      code: "MARKETPLACE_DISABLED",
    },
    { status: 410 }
  );
}
