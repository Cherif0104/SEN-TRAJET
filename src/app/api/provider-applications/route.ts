import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const fullName = String(form.get("fullName") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const licenseNumber = String(form.get("licenseNumber") ?? "").trim();
    const vehicleBrand = String(form.get("vehicleBrand") ?? "").trim();
    const vehicleModel = String(form.get("vehicleModel") ?? "").trim();
    const plateNumber = String(form.get("plateNumber") ?? "").trim();
    const seats = Number(form.get("seats") ?? 0);
    const greyCard = form.get("greyCard");

    if (
      !fullName ||
      phone.replace(/\D/g, "").length < 9 ||
      !licenseNumber ||
      !vehicleBrand ||
      !vehicleModel ||
      !plateNumber ||
      !Number.isFinite(seats) ||
      seats < 1 ||
      seats > 30
    ) {
      return NextResponse.json(
        { error: "Complétez toutes les informations obligatoires." },
        { status: 400 }
      );
    }
    if (!(greyCard instanceof File) || !greyCard.size) {
      return NextResponse.json({ error: "La carte grise est obligatoire." }, { status: 400 });
    }
    if (greyCard.size > MAX_FILE_SIZE || !ALLOWED_TYPES.has(greyCard.type)) {
      return NextResponse.json(
        { error: "Carte grise invalide : image/PDF de 10 Mo maximum." },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data: application, error: insertError } = await admin
      .from("mobility_provider_applications")
      .insert({
        service_type: "taxi_aeroport",
        full_name: fullName,
        phone,
        email: email || null,
        license_number: licenseNumber,
        vehicle_brand: vehicleBrand,
        vehicle_model: vehicleModel,
        plate_number: plateNumber.toUpperCase(),
        seats,
      })
      .select("id")
      .single();
    if (insertError || !application) throw insertError ?? new Error("insert_failed");

    const extension = greyCard.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const path = `${application.id}/carte-grise.${extension}`;
    const { error: uploadError } = await admin.storage
      .from("driver-applications")
      .upload(path, greyCard, { contentType: greyCard.type, upsert: false });
    if (uploadError) {
      await admin.from("mobility_provider_applications").delete().eq("id", application.id);
      throw uploadError;
    }
    await admin
      .from("mobility_provider_applications")
      .update({ grey_card_path: path })
      .eq("id", application.id);

    return NextResponse.json({ ok: true, applicationId: application.id });
  } catch (error) {
    console.error("[provider-application]", error);
    return NextResponse.json(
      { error: "Impossible d’envoyer la candidature pour le moment." },
      { status: 503 }
    );
  }
}
