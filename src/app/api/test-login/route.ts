import { NextResponse } from "next/server";

/**
 * Ancienne route de connexion « comptes démo » — désactivée (flux 100 % réel).
 * Conservée pour éviter une 404 ambiguë si un ancien client appelle encore l’URL.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Les connexions de démonstration ne sont plus disponibles. Utilisez un compte réel ou inscrivez-vous." },
    { status: 410 }
  );
}
