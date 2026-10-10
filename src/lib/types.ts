export type UserRole = "client" | "driver" | "admin";
export type ServiceType = "ride" | "airport" | "delivery";
export type RideClass = "eco" | "comfort" | "comfort_plus" | "vip";
export type DriverStatus = "pending" | "approved" | "rejected" | "suspended";
export type DriverOnboardingStatus = "incomplete" | "submitted" | "approved" | "rejected";
export type DriverDocumentKind =
  | "identity"
  | "driver_license"
  | "vehicle_registration"
  | "vehicle_insurance"
  | "profile_photo"
  | "vehicle_photo";
export type RideStatus =
  | "draft"
  | "searching"
  | "offered"
  | "assigned"
  | "driver_en_route"
  | "driver_arrived"
  | "passenger_on_board"
  | "completed"
  | "cancelled"
  | "no_driver";
export type FoodOrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "picked_up"
  | "delivered"
  | "rejected"
  | "cancelled";
export type FoodDeliveryStatus =
  | "unassigned"
  | "searching"
  | "assigned"
  | "at_restaurant"
  | "picked_up"
  | "delivered";
export type FoodPaymentMethod = "cash" | "wave" | "orange_money" | "card";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
};

export type DriverProfile = {
  id: string;
  user_id: string;
  status: DriverStatus;
  onboarding_status: DriverOnboardingStatus;
  is_online: boolean;
  accepted_services: ServiceType[];
  license_number: string | null;
  birth_date: string | null;
  address: string | null;
  years_experience: number | null;
  submitted_at: string | null;
  rejection_reason: string | null;
};

export type DriverDocument = {
  id: string;
  driver_id: string;
  kind: DriverDocumentKind;
  storage_path: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  rejection_reason: string | null;
};

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  logo_url: string | null;
  address: string;
  cuisine_type: string | null;
  delivery_fee: number;
  service_fee: number;
  minimum_order: number;
  estimated_prep_minutes: number;
  rating: number;
  review_count: number;
  is_open: boolean;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
};

export type FoodOrder = {
  id: string;
  reference: string;
  client_id: string;
  restaurant_id: string;
  courier_driver_id: string | null;
  status: FoodOrderStatus;
  restaurant_status: "pending" | "accepted" | "preparing" | "ready" | "rejected";
  delivery_status: FoodDeliveryStatus;
  delivery_mode: "delivery" | "pickup";
  payment_method: FoodPaymentMethod;
  payment_status: "pending" | "authorized" | "paid" | "failed" | "refund_pending" | "refunded";
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  total: number;
  delivery_address: string;
  recipient_name: string;
  recipient_phone: string;
  customer_notes: string | null;
  estimated_ready_at: string | null;
  created_at: string;
  restaurant?: { name: string; address: string } | null;
};

export type Place = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
};

export type RideRequest = {
  id: string;
  reference: string;
  client_id: string;
  driver_id: string | null;
  service_type: ServiceType;
  ride_class: RideClass;
  status: RideStatus;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  distance_km: number;
  duration_minutes: number;
  estimated_fare: number;
  scheduled_for: string | null;
  created_at: string;
};
