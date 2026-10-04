import "server-only";
import type { RentalBooking, RentalListing } from "@/lib/rentalMarketplace";

type Row = Record<string, unknown>;

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function mapRentalListing(row: Row, available = true): RentalListing {
  const vehicle = (Array.isArray(row.vehicle) ? row.vehicle[0] : row.vehicle) as Row | null;
  if (!vehicle) throw new Error("rental_vehicle_missing");
  return {
    id: String(row.id),
    city: String(row.city),
    pickupLocation: String(row.pickup_location_label),
    dailyRateFcfa: Number(row.daily_rate_fcfa),
    depositFcfa: Number(row.deposit_fcfa),
    includedKmPerDay: Number(row.included_km_per_day),
    extraKmRateFcfa: Number(row.extra_km_rate_fcfa),
    rentalMode: String(row.rental_mode) as RentalListing["rentalMode"],
    minimumDays: Number(row.minimum_days),
    available,
    vehicle: {
      id: String(vehicle.id),
      brand: String(vehicle.brand),
      model: String(vehicle.model),
      category: vehicle.category ? String(vehicle.category) : null,
      seats: vehicle.seats == null ? null : Number(vehicle.seats),
      year: vehicle.year == null ? null : Number(vehicle.year),
      color: vehicle.color ? String(vehicle.color) : null,
      transmission: null,
      fuelType: null,
      photoUrl: vehicle.photo_url ? String(vehicle.photo_url) : null,
      photoUrls: strings(vehicle.photo_urls),
      tagline: vehicle.tagline ? String(vehicle.tagline) : null,
      luggageCapacity: vehicle.luggage_capacity ? String(vehicle.luggage_capacity) : null,
      isVerified: Boolean(vehicle.is_verified),
    },
  };
}

export function mapRentalBooking(row: Row): RentalBooking {
  const listingRow = (Array.isArray(row.listing) ? row.listing[0] : row.listing) as Row | null;
  if (!listingRow) throw new Error("rental_listing_missing");
  return {
    id: String(row.id),
    reference: String(row.reference),
    status: String(row.status),
    paymentStatus: String(row.payment_status),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    totalDays: Number(row.total_days),
    dailyRateFcfa: Number(row.daily_rate_fcfa),
    subtotalFcfa: Number(row.subtotal_fcfa),
    depositFcfa: Number(row.deposit_fcfa),
    totalFcfa: Number(row.total_fcfa),
    pickupLocation: String(row.pickup_location_label),
    returnLocation: String(row.return_location_label),
    createdAt: String(row.created_at),
    listing: mapRentalListing(listingRow),
  };
}

export const RENTAL_LISTING_SELECT = `
  id, city, pickup_location_label, daily_rate_fcfa, deposit_fcfa,
  included_km_per_day, extra_km_rate_fcfa, rental_mode, minimum_days,
  vehicle:vehicles(
    id, brand, model, category, seats, year, color, photo_url, photo_urls,
    tagline, luggage_capacity, is_verified
  )
`;

export const RENTAL_BOOKING_SELECT = `
  id, reference, status, payment_status, start_date, end_date, total_days,
  daily_rate_fcfa, subtotal_fcfa, deposit_fcfa, total_fcfa,
  pickup_location_label, return_location_label, created_at,
  listing:rental_listings(${RENTAL_LISTING_SELECT})
`;
