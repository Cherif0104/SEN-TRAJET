import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** Résout un code d'invitation partenaire et retourne l'id partenaire (pour lier un chauffeur). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!code?.trim()) {
    return NextResponse.json({ error: "Code requis" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from("partners")
    .select("id")
    .eq("invite_code", code.trim().toUpperCase())
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Code invalide ou inactif" }, { status: 404 });
  }
  return NextResponse.json({ partner_id: data.id });
}
