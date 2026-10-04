import "server-only";

export function getWaveApiKey(): string {
  return process.env.WAVE_API_KEY ?? "";
}

export function getWaveWebhookSecret(): string {
  return process.env.WAVE_WEBHOOK_SECRET ?? "";
}

export function getWaveSimulationMode(): boolean {
  const apiKey = getWaveApiKey();
  return !apiKey || process.env.WAVE_SIMULATION === "true";
}

