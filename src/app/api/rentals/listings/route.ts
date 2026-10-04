import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromBearer } from "@/lib/server/authUser";
import { mapRentalListing, RENTAL_LISTING_SELECT } from "@/lib/server/rentalMarketplace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function GET(request: NextRequest) {
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");
  if (!validDate(startDate) || !validDate(endDate) || endDate < startDate) {
    return NextResponse.json({ error: "Sélectionnez une période de location valide." }, { status: 400 });
  }

  const city = request.nextUrl.searchParams.get("city")?.trim().toLowerCase() ?? "";
  const category = request.nextUrl.searchParams.get("category")?.trim().toLowerCase() ?? "";
  const seats = Math.max(0, Number(request.nextUrl.searchParams.get("seats")) || 0);
  const maxDailyRate = Math.max(0, Number(request.nextUrl.searchParams.get("maxDailyRate")) || 0);

  try {
    const admin = getSupabaseAdmin();
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const { data: authData } = bearer
      ? await Promise.resolve({ data: { user: await getUserFromBearer(request.headers.get("authorization")) }, error: null })
      : { data: { user: null } };
    if (!authData.user) {
      return NextResponse.json({ error: "Connectez-vous pour consulter les véhicules." }, { status: 401 });
    }
    await admin
      .from("rental_bookings")
      .update({ status: "expired" })
      .eq("status", "pending_payment")
      .lt("expires_at", new Date().toISOString());
    const [{ data: rows, error }, { data: conflicts, error: conflictError }] = await Promise.all([
      admin.from("rental_listings").select(RENTAL_LISTING_SELECT).eq("status", "active"),
      admin
        .from("rental_bookings")
        .select("listing_id")
        .in("status", ["pending_payment", "confirmed", "active"])
        .lte("start_date", endDate)
        .gte("end_date", startDate),
    ]);
    if (error || conflictError) throw error ?? conflictError;

    const blocked = new Set((conflicts ?? []).map((row) => String(row.listing_id)));
    const listings = (rows ?? [])
      .filter((row) => !blocked.has(String(row.id)))
      .map((row) => mapRentalListing(row as Record<string, unknown>))
      .filter((listing) => !city || listing.city.toLowerCase().includes(city))
      .filter(
        (listing) =>
          !category || (listing.vehicle.category ?? "").toLowerCase().includes(category),
      )
      .filter((listing) => !seats || (listing.vehicle.seats ?? 0) >= seats)
      .filter((listing) => !maxDailyRate || listing.dailyRateFcfa <= maxDailyRate)
      .sort((a, b) => a.dailyRateFcfa - b.dailyRateFcfa);

    return NextResponse.json({ listings });
  } catch (error) {
    console.error("[rental-listings]", error);
    return NextResponse.json(
      { error: "Le catalogue de location est temporairement indisponible." },
      { status: 503 },
    );
  }
}
