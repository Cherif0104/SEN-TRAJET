import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { mapRentalListing, RENTAL_LISTING_SELECT } from "@/lib/server/rentalMarketplace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const admin = getSupabaseAdmin();
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const { data: authData } = bearer
      ? await admin.auth.getUser(bearer)
      : { data: { user: null } };
    if (!authData.user) {
      return NextResponse.json({ error: "Connectez-vous pour consulter ce véhicule." }, { status: 401 });
    }
    await admin
      .from("rental_bookings")
      .update({ status: "expired" })
      .eq("status", "pending_payment")
      .lt("expires_at", new Date().toISOString());
    const { data: row, error } = await admin
      .from("rental_listings")
      .select(RENTAL_LISTING_SELECT)
      .eq("id", params.id)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    if (!row) {
      return NextResponse.json({ error: "Ce véhicule n’est plus proposé à la location." }, { status: 404 });
    }

    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");
    let available = true;
    if (startDate && endDate) {
      const { data: conflict, error: conflictError } = await admin
        .from("rental_bookings")
        .select("id")
        .eq("listing_id", params.id)
        .in("status", ["pending_payment", "confirmed", "active"])
        .lte("start_date", endDate)
        .gte("end_date", startDate)
        .limit(1)
        .maybeSingle();
      if (conflictError) throw conflictError;
      available = !conflict;
    }

    return NextResponse.json({
      listing: mapRentalListing(row as Record<string, unknown>, available),
    });
  } catch (error) {
    console.error("[rental-listing]", error);
    return NextResponse.json({ error: "Impossible de charger ce véhicule." }, { status: 503 });
  }
}
