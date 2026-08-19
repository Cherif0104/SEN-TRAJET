import { supabase } from "@/lib/supabase";

export async function hasRatedBooking(bookingId: string): Promise<boolean> {
  const { data } = await supabase.from("ratings").select("id").eq("booking_id", bookingId).maybeSingle();
  return Boolean(data);
}

export async function submitRating(params: {
  bookingId: string;
  clientId: string;
  driverId: string | null;
  serviceScore: number;
  driverScore: number | null;
  comment?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("ratings").insert({
    booking_id: params.bookingId,
    client_id: params.clientId,
    driver_id: params.driverId,
    service_score: params.serviceScore,
    driver_score: params.driverScore,
    comment: params.comment?.trim() || null,
  });
  if (error) throw error;
}

export const COMPLAINT_CATEGORIES = [
  ["retard", "Retard"],
  ["chauffeur", "Comportement chauffeur"],
  ["vehicule", "État du véhicule"],
  ["tarif", "Facturation / tarif"],
  ["annulation", "Annulation injustifiée"],
  ["autre", "Autre"],
] as const;

export type Complaint = {
  id: string;
  booking_id: string;
  client_id: string;
  category: string;
  priority: string;
  status: string;
  message: string;
  created_at: string;
  updated_at: string;
};

export async function submitComplaint(params: {
  bookingId: string;
  clientId: string;
  category: string;
  message: string;
  priority?: string;
}): Promise<void> {
  const { error } = await supabase.from("complaints").insert({
    booking_id: params.bookingId,
    client_id: params.clientId,
    category: params.category,
    priority: params.priority ?? "normale",
    status: "ouverte",
    message: params.message.trim(),
  });
  if (error) throw error;
}

export async function listAllComplaints(): Promise<Complaint[]> {
  const { data, error } = await supabase
    .from("complaints")
    .select("id, booking_id, client_id, category, priority, status, message, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Complaint[];
}

export async function updateComplaintStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("complaints")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
