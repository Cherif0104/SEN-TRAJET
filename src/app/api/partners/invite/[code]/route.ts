import { NextResponse } from "next/server";

/** Invitation partenaires → chauffeurs indépendants — abandonnée. */
export async function GET() {
  return NextResponse.json(
    {
      error: "Invitations chauffeurs marketplace désactivées.",
      code: "MARKETPLACE_DISABLED",
    },
    { status: 410 }
  );
}
