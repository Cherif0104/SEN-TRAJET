import { supabase } from "@/lib/supabase";
import { getCommissionConfig } from "@/lib/partners";
import { simulatePriceFromDistance } from "@/lib/distancePricing";

export type RentalOperatingMode = "platform_managed" | "marketplace_partner";
export type RentalListingStatus = "draft" | "pending_review" | "active" | "paused" | "rejected";
export type RentalBookingStatus =
  | "pending"
  | "pending_payment"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled";

export type RentalListing = {
  id: string;
  owner_profile_id: string;
  partner_id: string | null;
  operating_mode: RentalOperatingMode;
  status: RentalListingStatus;
  is_verified: boolean;
  title: string;
  brand: string;
  model: string;
  trim: string | null;
  plate_number: string;
  vin: string | null;
  color: string | null;
  year: number | null;
  first_registration_date: string | null;
  mileage_km: number;
  fuel_type: string;
  engine_size_l: number | null;
  transmission: string;
  seats: number;
  has_air_conditioning: boolean;
  ac_operational: boolean;
  airbags_operational: boolean;
  seatbelts_operational: boolean;
  has_spare_tire: boolean;
  technical_inspection_valid_until: string | null;
  insurance_valid_until: string | null;
  had_accident: boolean;
  accident_details: string | null;
  city: string;
  pickup_location_label: string | null;
  daily_rate_fcfa: number;
  deposit_fcfa: number;
  included_km_per_day: number;
  extra_km_rate_fcfa: number;
  main_photo_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  owner?: { full_name: string | null; phone: string | null } | null;
  partner?: { company_name: string | null } | null;
};

export type RentalBooking = {
  id: string;
  listing_id: string;
  client_id: string;
  owner_profile_id: string;
  partner_id: string | null;
  operating_mode: RentalOperatingMode;
  status: RentalBookingStatus;
  start_date: string;
  end_date: string;
  total_days: number;
  daily_rate_fcfa: number;
  subtotal_fcfa: number;
  deposit_fcfa: number;
  platform_commission_fcfa: number;
  partner_commission_fcfa: number;
  owner_net_fcfa: number;
  total_fcfa: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  listing?: RentalListing | null;
  client?: { full_name: string | null; phone: string | null } | null;
};

export type CreateRentalListingInput = {
  ownerProfileId: string;
  partnerId?: string | null;
  operatingMode: RentalOperatingMode;
  title: string;
  brand: string;
  model: string;
  plateNumber: string;
  city: string;
  dailyRateFcfa: number;
  depositFcfa?: number;
  mileageKm?: number;
  fuelType?: string;
  engineSizeL?: number | null;
  year?: number | null;
  color?: string | null;
  firstRegistrationDate?: string | null;
  transmission?: string;
  seats?: number;
  hasAirConditioning?: boolean;
  acOperational?: boolean;
  airbagsOperational?: boolean;
  seatbeltsOperational?: boolean;
  hasSpareTire?: boolean;
  technicalInspectionValidUntil?: string | null;
  insuranceValidUntil?: string | null;
  hadAccident?: boolean;
  accidentDetails?: string | null;
  pickupLocationLabel?: string | null;
  mainPhotoUrl?: string | null;
};

export function computeRentalDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return Math.floor(diff / 86_400_000) + 1;
}

export function computeRentalFinancials(params: {
  dailyRateFcfa: number;
  days: number;
  depositFcfa: number;
  mode: RentalOperatingMode;
  platformPercent: number;
  partnerPercent: number;
}) {
  const subtotal = Math.max(0, params.dailyRateFcfa) * Math.max(1, params.days);
  const platformCommission = Math.round((subtotal * Math.max(0, params.platformPercent)) / 100);
  const partnerCommission =
    params.mode === "marketplace_partner"
      ? Math.round((subtotal * Math.max(0, params.partnerPercent)) / 100)
      : 0;
  const ownerNet = Math.max(0, subtotal - platformCommission - partnerCommission);
  const total = subtotal + Math.max(0, params.depositFcfa);

  return {
    subtotalFcfa: subtotal,
    platformCommissionFcfa: platformCommission,
    partnerCommissionFcfa: partnerCommission,
    ownerNetFcfa: ownerNet,
    totalFcfa: total,
  };
}

export async function getRentalListings(filters?: {
  city?: string;
  status?: RentalListingStatus;
  q?: string;
}) {
  let q = supabase
    .from("rental_listings")
    .select("*, owner:profiles!owner_profile_id(full_name, phone), partner:partners(company_name)")
    .order("created_at", { ascending: false });

  if (filters?.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.q) q = q.or(`title.ilike.%${filters.q}%,brand.ilike.%${filters.q}%,model.ilike.%${filters.q}%`);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RentalListing[];
}

export async function getRentalListingById(listingId: string) {
  const { data, error } = await supabase
    .from("rental_listings")
    .select("*, owner:profiles!owner_profile_id(full_name, phone), partner:partners(company_name)")
    .eq("id", listingId)
    .maybeSingle();
  if (error) throw error;
  return (data as RentalListing | null) ?? null;
}

export async function createRentalListing(input: CreateRentalListingInput) {
  const { data, error } = await supabase
    .from("rental_listings")
    .insert({
      owner_profile_id: input.ownerProfileId,
      partner_id: input.partnerId ?? null,
      operating_mode: input.operatingMode,
      title: input.title,
      brand: input.brand,
      model: input.model,
      plate_number: input.plateNumber,
      city: input.city,
      daily_rate_fcfa: input.dailyRateFcfa,
      deposit_fcfa: input.depositFcfa ?? 0,
      mileage_km: input.mileageKm ?? 0,
      fuel_type: input.fuelType ?? "essence",
      engine_size_l: input.engineSizeL ?? null,
      year: input.year ?? null,
      color: input.color ?? null,
      first_registration_date: input.firstRegistrationDate ?? null,
      transmission: input.transmission ?? "manuel",
      seats: input.seats ?? 4,
      has_air_conditioning: input.hasAirConditioning ?? false,
      ac_operational: input.acOperational ?? false,
      airbags_operational: input.airbagsOperational ?? false,
      seatbelts_operational: input.seatbeltsOperational ?? true,
      has_spare_tire: input.hasSpareTire ?? false,
      technical_inspection_valid_until: input.technicalInspectionValidUntil ?? null,
      insurance_valid_until: input.insuranceValidUntil ?? null,
      had_accident: input.hadAccident ?? false,
      accident_details: input.accidentDetails ?? null,
      pickup_location_label: input.pickupLocationLabel ?? null,
      main_photo_url: input.mainPhotoUrl ?? null,
      status: "pending_review",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as RentalListing;
}

export async function updateRentalListingStatus(listingId: string, status: RentalListingStatus, notes?: string) {
  const { data, error } = await supabase
    .from("rental_listings")
    .update({
      status,
      verification_notes: notes ?? null,
      is_verified: status === "active",
      published_at: status === "active" ? new Date().toISOString() : null,
    })
    .eq("id", listingId)
    .select("*")
    .single();
  if (error) throw error;
  return data as RentalListing;
}

export async function createRentalBooking(params: {
  listingId: string;
  clientId: string;
  startDate: string;
  endDate: string;
  notes?: string;
  platformPercent?: number;
  partnerPercent?: number;
}) {
  const listing = await getRentalListingById(params.listingId);
  if (!listing) throw new Error("Véhicule introuvable.");
  if (listing.status !== "active") throw new Error("Ce véhicule n'est pas disponible à la réservation.");

  const days = computeRentalDays(params.startDate, params.endDate);
  if (days <= 0) throw new Error("Période de location invalide.");

  const commissionConfig = await getCommissionConfig(listing.partner_id ?? undefined);
  const financials = computeRentalFinancials({
    dailyRateFcfa: listing.daily_rate_fcfa,
    days,
    depositFcfa: listing.deposit_fcfa,
    mode: listing.operating_mode,
    platformPercent: params.platformPercent ?? commissionConfig?.platform_percent ?? 10,
    partnerPercent: params.partnerPercent ?? commissionConfig?.partner_percent ?? 4,
  });

  const { data, error } = await supabase
    .from("rental_bookings")
    .insert({
      listing_id: listing.id,
      client_id: params.clientId,
      owner_profile_id: listing.owner_profile_id,
      partner_id: listing.partner_id,
      operating_mode: listing.operating_mode,
      status: "pending_payment",
      start_date: params.startDate,
      end_date: params.endDate,
      total_days: days,
      daily_rate_fcfa: listing.daily_rate_fcfa,
      subtotal_fcfa: financials.subtotalFcfa,
      deposit_fcfa: listing.deposit_fcfa,
      platform_commission_fcfa: financials.platformCommissionFcfa,
      partner_commission_fcfa: financials.partnerCommissionFcfa,
      owner_net_fcfa: financials.ownerNetFcfa,
      total_fcfa: financials.totalFcfa,
      notes: params.notes ?? null,
      pickup_location_label: listing.pickup_location_label,
      return_location_label: listing.pickup_location_label,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as RentalBooking;
}

export async function getClientRentalBookings(clientId: string) {
  const { data, error } = await supabase
    .from("rental_bookings")
    .select("*, listing:rental_listings(*)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RentalBooking[];
}

export async function getOwnerRentalBookings(ownerProfileId: string) {
  const { data, error } = await supabase
    .from("rental_bookings")
    .select("*, listing:rental_listings(*), client:profiles!client_id(full_name, phone)")
    .eq("owner_profile_id", ownerProfileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RentalBooking[];
}

export async function getPartnerRentalListings(partnerId: string) {
  const { data, error } = await supabase
    .from("rental_listings")
    .select("*, owner:profiles!owner_profile_id(full_name, phone)")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RentalListing[];
}

export async function getPartnerRentalBookings(partnerId: string) {
  const { data, error } = await supabase
    .from("rental_bookings")
    .select("*, listing:rental_listings(*), client:profiles!client_id(full_name, phone)")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RentalBooking[];
}

export async function getAllRentalBookings() {
  const { data, error } = await supabase
    .from("rental_bookings")
    .select("*, listing:rental_listings(*), client:profiles!client_id(full_name, phone)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RentalBooking[];
}

export async function createRentalHandoverEvent(params: {
  bookingId: string;
  phase: "pickup" | "return";
  recordedByProfileId: string;
  odometerKm?: number;
  fuelLevelPercent?: number;
  hasDamage?: boolean;
  damageNotes?: string;
  photosUrls?: string[];
}) {
  const { data, error } = await supabase
    .from("rental_handover_events")
    .insert({
      rental_booking_id: params.bookingId,
      phase: params.phase,
      recorded_by_profile_id: params.recordedByProfileId,
      odometer_km: params.odometerKm ?? null,
      fuel_level_percent: params.fuelLevelPercent ?? null,
      has_damage: params.hasDamage ?? false,
      damage_notes: params.damageNotes ?? null,
      photos_urls: params.photosUrls ?? [],
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function simulateRentalPrice(params: {
  distanceKm: number;
  fuelType: string;
  vehicleCategory: string;
  withDriver: boolean;
  days: number;
}) {
  const base = await simulatePriceFromDistance({
    distanceKm: params.distanceKm,
    fuelType: params.fuelType,
    vehicleCategory: params.vehicleCategory,
    withDriver: params.withDriver,
  });
  const safeDays = Math.max(1, params.days);
  const perDay = Math.round(base.totalSuggestedFcfa);
  return {
    suggestedDailyRateFcfa: perDay,
    suggestedTotalFcfa: perDay * safeDays,
    breakdown: base,
  };
}
