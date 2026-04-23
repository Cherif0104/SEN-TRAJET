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

export function timingSafeEqual(a: string, b: string): boolean {
  // Avoid importing node:crypto in edge; this code runs in Node runtime (route handlers default).
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

