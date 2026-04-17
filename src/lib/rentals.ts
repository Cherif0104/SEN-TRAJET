import { supabase } from "@/lib/supabase";
import { getCommissionConfig } from "@/lib/partners";
import { clampNonNegative, percentOf, roundFcfa } from "@/lib/pricingMath";

export type RentalOperatingMode = "platform_managed" | "marketplace_partner";
export type RentalListingStatus = "draft" | "pending_review" | "active" | "paused" | "rejected";
export type TransportVehicleCategory =
  | "citadine"
  | "suv_berline"
  | "familiale"
  | "minivan"
  | "minibus"
  | "bus";
export type ServiceClassLevel = "eco" | "confort" | "confort_plus" | "premium" | "premium_plus";
export type RentalMode = "with_driver" | "without_driver";
export type EligibilityStatus = "pending_review" | "eligible" | "not_eligible";
export type RentalBookingStatus =
  | "pending"
  | "pending_payment"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled";

export type RentalBookingFlow = "payment_now" | "callback_support";

export type RentalListing = {
  id: string;
  owner_profile_id: string;
  partner_id: string | null;
  operating_mode: RentalOperatingMode;
  status: RentalListingStatus;
  transport_vehicle_category: TransportVehicleCategory;
  service_class: ServiceClassLevel;
  rental_mode: RentalMode;
  eligibility_status: EligibilityStatus;
  compliance_score: number;
  class_validated_at: string | null;
  class_validated_by: string | null;
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
  booking_flow: RentalBookingFlow;
  support_callback_requested: boolean;
  customer_budget_fcfa: number | null;
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
  transportVehicleCategory?: TransportVehicleCategory;
  serviceClass?: ServiceClassLevel;
  rentalMode?: RentalMode;
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

const SERVICE_CLASS_RULES: Record<ServiceClassLevel, { minYear: number; requiresAc: boolean }> = {
  eco: { minYear: 2010, requiresAc: false },
  confort: { minYear: 2015, requiresAc: true },
  confort_plus: { minYear: 2018, requiresAc: true },
  premium: { minYear: 2020, requiresAc: true },
  premium_plus: { minYear: 2022, requiresAc: true },
};

export function checkServiceClassEligibility(params: {
  serviceClass: ServiceClassLevel;
  year: number | null | undefined;
  hasAirConditioning?: boolean;
  acOperational?: boolean;
}) {
  const rule = SERVICE_CLASS_RULES[params.serviceClass];
  const year = typeof params.year === "number" ? params.year : null;
  const hasAcOk = (params.hasAirConditioning ?? false) && (params.acOperational ?? false);

  if (!year || !Number.isFinite(year)) {
    return {
      eligible: false,
      reason: "Renseignez une année de véhicule valide pour attribuer une classe.",
      minYear: rule.minYear,
      requiresAc: rule.requiresAc,
    };
  }

  if (year < rule.minYear) {
    return {
      eligible: false,
      reason: `La classe ${params.serviceClass} exige une année minimale ${rule.minYear}.`,
      minYear: rule.minYear,
      requiresAc: rule.requiresAc,
    };
  }

  if (rule.requiresAc && !hasAcOk) {
    return {
      eligible: false,
      reason: `La classe ${params.serviceClass} exige une climatisation opérationnelle.`,
      minYear: rule.minYear,
      requiresAc: rule.requiresAc,
    };
  }

  return {
    eligible: true,
    reason: null,
    minYear: rule.minYear,
    requiresAc: rule.requiresAc,
  };
}

export function getHighestEligibleServiceClass(params: {
  year: number | null | undefined;
  hasAirConditioning?: boolean;
  acOperational?: boolean;
}): ServiceClassLevel {
  const descending: ServiceClassLevel[] = ["premium_plus", "premium", "confort_plus", "confort", "eco"];
  for (const level of descending) {
    const check = checkServiceClassEligibility({
      serviceClass: level,
      year: params.year,
      hasAirConditioning: params.hasAirConditioning,
      acOperational: params.acOperational,
    });
    if (check.eligible) return level;
  }
  return "eco";
}

export function computeRentalComplianceScore(listing: Pick<
  RentalListing,
  | "has_air_conditioning"
  | "ac_operational"
  | "airbags_operational"
  | "seatbelts_operational"
  | "has_spare_tire"
  | "insurance_valid_until"
  | "technical_inspection_valid_until"
>) {
  let score = 0;
  if (listing.seatbelts_operational) score += 20;
  if (listing.airbags_operational) score += 20;
  if (listing.has_spare_tire) score += 10;
  if (listing.has_air_conditioning && listing.ac_operational) score += 15;
  if (listing.insurance_valid_until) score += 20;
  if (listing.technical_inspection_valid_until) score += 15;
  return Math.max(0, Math.min(100, score));
}

export function computeRentalDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return Math.floor(diff / 86_400_000) + 1;
}

export function validateRentalPeriod(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) return "Choisissez une période de location.";
  const days = computeRentalDays(startDate, endDate);
  if (days <= 0) return "La période de location est invalide.";
  return null;
}

export function computeRentalEstimateForListing(
  listing: Pick<RentalListing, "daily_rate_fcfa" | "deposit_fcfa">,
  days: number
): { subtotal: number; total: number } {
  const safeDays = Math.max(1, days);
  const subtotal = roundFcfa(clampNonNegative(listing.daily_rate_fcfa) * safeDays);
  return {
    subtotal,
    total: roundFcfa(subtotal + clampNonNegative(listing.deposit_fcfa)),
  };
}

export function computeRentalFinancials(params: {
  dailyRateFcfa: number;
  days: number;
  depositFcfa: number;
  mode: RentalOperatingMode;
  platformPercent: number;
  partnerPercent: number;
}) {
  const subtotal = roundFcfa(clampNonNegative(params.dailyRateFcfa) * Math.max(1, Math.round(params.days)));
  const platformCommission = roundFcfa(percentOf(subtotal, Math.max(0, params.platformPercent)));
  const partnerCommission =
    params.mode === "marketplace_partner"
      ? roundFcfa(percentOf(subtotal, Math.max(0, params.partnerPercent)))
      : 0;
  const ownerNet = roundFcfa(subtotal - platformCommission - partnerCommission);
  const total = roundFcfa(subtotal + clampNonNegative(params.depositFcfa));

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
  category?: TransportVehicleCategory;
  serviceClass?: ServiceClassLevel;
  rentalMode?: RentalMode;
  q?: string;
}) {
  let q = supabase
    .from("rental_listings")
    .select("*, owner:profiles!owner_profile_id(full_name, phone), partner:partners(company_name)")
    .order("created_at", { ascending: false });

  if (filters?.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.category) q = q.eq("transport_vehicle_category", filters.category);
  if (filters?.serviceClass) q = q.eq("service_class", filters.serviceClass);
  if (filters?.rentalMode) q = q.eq("rental_mode", filters.rentalMode);
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
  const serviceClass = input.serviceClass ?? "eco";
  const classEligibility = checkServiceClassEligibility({
    serviceClass,
    year: input.year ?? null,
    hasAirConditioning: input.hasAirConditioning,
    acOperational: input.acOperational,
  });
  if (!classEligibility.eligible) {
    throw new Error(classEligibility.reason ?? "Classe de service non éligible.");
  }

  const seats = input.seats ?? 4;
  const inferredCategory: TransportVehicleCategory =
    seats <= 4 ? "citadine" :
    seats <= 6 ? "suv_berline" :
    seats <= 7 ? "familiale" :
    seats <= 15 ? "minivan" :
    seats <= 30 ? "minibus" : "bus";
  const { data, error } = await supabase
    .from("rental_listings")
    .insert({
      owner_profile_id: input.ownerProfileId,
      partner_id: input.partnerId ?? null,
      operating_mode: input.operatingMode,
      transport_vehicle_category: input.transportVehicleCategory ?? inferredCategory,
      service_class: serviceClass,
      rental_mode: input.rentalMode ?? "with_driver",
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
      seats,
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

export async function revalidateRentalListingClass(params: {
  listingId: string;
  serviceClass: ServiceClassLevel;
  validatorProfileId: string;
}) {
  const listing = await getRentalListingById(params.listingId);
  if (!listing) throw new Error("Véhicule introuvable.");

  const eligibility = checkServiceClassEligibility({
    serviceClass: params.serviceClass,
    year: listing.year,
    hasAirConditioning: listing.has_air_conditioning,
    acOperational: listing.ac_operational,
  });
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason ?? "Classe non éligible.");
  }

  const complianceScore = computeRentalComplianceScore(listing);
  const { data, error } = await supabase
    .from("rental_listings")
    .update({
      service_class: params.serviceClass,
      eligibility_status: "eligible",
      class_validated_at: new Date().toISOString(),
      class_validated_by: params.validatorProfileId,
      compliance_score: complianceScore,
      is_verified: true,
      status: listing.status === "draft" ? "pending_review" : listing.status,
    })
    .eq("id", params.listingId)
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
  bookingFlow?: RentalBookingFlow;
  supportCallbackRequested?: boolean;
  customerBudgetFcfa?: number;
  platformPercent?: number;
  partnerPercent?: number;
}) {
  const listing = await getRentalListingById(params.listingId);
  if (!listing) throw new Error("Véhicule introuvable.");
  if (listing.status !== "active") throw new Error("Ce véhicule n'est pas disponible à la réservation.");

  const days = computeRentalDays(params.startDate, params.endDate);
  if (days <= 0) throw new Error("Période de location invalide.");

  const commissionConfig = await getCommissionConfig(listing.partner_id ?? undefined);
  const customerBudgetFcfa =
    typeof params.customerBudgetFcfa === "number" && Number.isFinite(params.customerBudgetFcfa)
      ? Math.max(0, Math.round(params.customerBudgetFcfa))
      : null;
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
      status: params.bookingFlow === "callback_support" ? "pending" : "pending_payment",
      booking_flow: params.bookingFlow ?? "payment_now",
      support_callback_requested: params.supportCallbackRequested ?? false,
      customer_budget_fcfa: customerBudgetFcfa,
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

export async function confirmRentalBookingPayment(params: {
  bookingId: string;
  clientId: string;
}) {
  const { data, error } = await supabase
    .from("rental_bookings")
    .update({ status: "confirmed" })
    .eq("id", params.bookingId)
    .eq("client_id", params.clientId)
    .eq("status", "pending_payment")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error("Cette réservation n'est pas en attente de paiement.");
  }
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
