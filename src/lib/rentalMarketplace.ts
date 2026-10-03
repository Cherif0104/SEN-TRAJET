import { supabase } from "@/lib/supabase";

export type RentalListing = {
  id: string;
  city: string;
  pickupLocation: string;
  dailyRateFcfa: number;
  depositFcfa: number;
  includedKmPerDay: number;
  extraKmRateFcfa: number;
  rentalMode: "with_driver" | "without_driver" | "both";
  minimumDays: number;
  available: boolean;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    category: string | null;
    seats: number | null;
    year: number | null;
    color: string | null;
    transmission: string | null;
    fuelType: string | null;
    photoUrl: string | null;
    photoUrls: string[];
    tagline: string | null;
    luggageCapacity: string | null;
    isVerified: boolean;
  };
};

export type RentalQuote = {
  totalDays: number;
  dailyRateFcfa: number;
  subtotalFcfa: number;
  depositFcfa: number;
  totalFcfa: number;
};

export type RentalBooking = {
  id: string;
  reference: string;
  status: string;
  paymentStatus: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyRateFcfa: number;
  subtotalFcfa: number;
  depositFcfa: number;
  totalFcfa: number;
  pickupLocation: string;
  returnLocation: string;
  createdAt: string;
  listing: RentalListing;
};

export function todayInputValue(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function addDaysInputValue(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function quoteRental(listing: RentalListing, startDate: string, endDate: string): RentalQuote {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
  const subtotalFcfa = totalDays * listing.dailyRateFcfa;
  return {
    totalDays,
    dailyRateFcfa: listing.dailyRateFcfa,
    subtotalFcfa,
    depositFcfa: listing.depositFcfa,
    totalFcfa: subtotalFcfa + listing.depositFcfa,
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Une erreur est survenue.");
  return payload;
}

export async function listAvailableRentalListings(filters: {
  startDate: string;
  endDate: string;
  city?: string;
  category?: string;
  seats?: number;
  maxDailyRate?: number;
}): Promise<RentalListing[]> {
  const query = new URLSearchParams({
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  if (filters.city) query.set("city", filters.city);
  if (filters.category) query.set("category", filters.category);
  if (filters.seats) query.set("seats", String(filters.seats));
  if (filters.maxDailyRate) query.set("maxDailyRate", String(filters.maxDailyRate));
  const payload = await apiFetch<{ listings: RentalListing[] }>(`/api/rentals/listings?${query}`);
  return payload.listings;
}

export async function getRentalListing(
  id: string,
  startDate?: string,
  endDate?: string,
): Promise<RentalListing> {
  const query = new URLSearchParams();
  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);
  const suffix = query.size ? `?${query}` : "";
  const payload = await apiFetch<{ listing: RentalListing }>(`/api/rentals/listings/${id}${suffix}`);
  return payload.listing;
}

export async function createRentalBooking(input: {
  listingId: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  returnLocation: string;
  phone?: string;
}): Promise<RentalBooking> {
  const payload = await apiFetch<{ booking: RentalBooking }>("/api/rentals/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.booking;
}

export async function getRentalBooking(id: string): Promise<RentalBooking> {
  const payload = await apiFetch<{ booking: RentalBooking }>(`/api/rentals/bookings/${id}`);
  return payload.booking;
}
