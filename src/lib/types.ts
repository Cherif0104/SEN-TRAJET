export type UserRole = "client" | "driver" | "admin";
export type ServiceType = "ride" | "airport" | "delivery";
export type RideClass = "eco" | "comfort" | "comfort_plus" | "vip";
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

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
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
