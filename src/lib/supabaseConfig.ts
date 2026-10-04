/**
 * Projet Supabase officiel et unique de SentraJet Premium.
 *
 * Les valeurs sont publiques (URL + publishable key). Elles sont fixées ici
 * pour neutraliser une ancienne variable Vercel pointant vers un projet DNS
 * supprimé (`bprblantnxmejzrzdeav`).
 */
export const SENTRAJET_SUPABASE_PROJECT_REF = "ootvzknyhkhxroadnclh";
export const SENTRAJET_SUPABASE_URL =
  `https://${SENTRAJET_SUPABASE_PROJECT_REF}.supabase.co`;
export const SENTRAJET_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_CVck2hQokLG7zquxfximUA_DeuY6ftN";
export const SENTRAJET_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdHZ6a255aGtoeHJvYWRuY2xoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NDQ4MDAsImV4cCI6MjA5NTAyMDgwMH0.8xyIiOk_VFJVGCjoZioXmmDsthvV-o3WX-QI7y1aLQc";

export function getSentrajetSupabasePublicConfig(): {
  url: string;
  key: string;
} {
  // Clé JWT anon du projet officiel — stable pour Auth/SSR.
  // La publishable key reste disponible, mais la session Bearer doit
  // toujours être émise/vérifiée contre ce projet unique.
  return {
    url: SENTRAJET_SUPABASE_URL,
    key: SENTRAJET_SUPABASE_ANON_KEY,
  };
}
