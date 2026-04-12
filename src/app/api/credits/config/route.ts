import { NextResponse } from "next/server";

const waveApiKey = process.env.WAVE_API_KEY ?? "";
const freeCreditsPeriod =
  process.env.SEN_TRAJET_FREE_CREDITS_PERIOD === "true" ||
  process.env.FREE_CREDITS_PERIOD === "true";
const freeCreditsUntil = process.env.FREE_CREDITS_UNTIL;

function isFreePeriod(): boolean {
  if (!freeCreditsPeriod && !freeCreditsUntil) return false;
  if (freeCreditsPeriod) return true;
  if (freeCreditsUntil) {
    try {
      return new Date() <= new Date(freeCreditsUntil);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Indique si les recharges sont en période gratuite ou en mode simulation (sans clé Wave).
 * Permet d'afficher un bandeau sur la page recharger.
 */
export async function GET() {
  const simulation = !waveApiKey || process.env.WAVE_SIMULATION === "true";
  return NextResponse.json({
    simulation,
    free_period: isFreePeriod(),
  });
}
