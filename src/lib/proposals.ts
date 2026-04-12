import { supabase } from "@/lib/supabase";

export type Proposal = {
  id: string;
  request_id: string;
  driver_id: string;
  trip_id: string | null;
  vehicle_id: string | null;
  price_fcfa: number;
  message: string | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  created_at: string;
  negotiation_round?: number;
  counter_price_fcfa?: number | null;
  counter_message?: string | null;
  driver?: {
    full_name: string;
    average_rating: number;
    total_reviews: number;
    phone: string | null;
    is_verified: boolean;
  };
  vehicle?: {
    brand: string;
    model: string;
    year: number | null;
    category: string;
    seats: number;
    air_conditioning: boolean;
    is_verified: boolean;
  };
};

export async function sendProposal(params: {
  requestId: string;
  driverId: string;
  vehicleId?: string;
  priceFcfa: number;
  message?: string;
}) {
  const { data, error } = await supabase
    .from("proposals")
    .insert({
      request_id: params.requestId,
      driver_id: params.driverId,
      vehicle_id: params.vehicleId || null,
      price_fcfa: params.priceFcfa,
      message: params.message || null,
      negotiation_round: 1,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function acceptProposal(proposalId: string, clientId: string) {
  const { data: proposal, error: fetchErr } = await supabase
    .from("proposals")
    .select("*, request:trip_requests!request_id(*)")
    .eq("id", proposalId)
    .single();
  if (fetchErr || !proposal) throw fetchErr || new Error("Proposition introuvable");

  const request = (proposal as Record<string, unknown>).request as Record<string, unknown>;

  const { error: updateErr } = await supabase
    .from("proposals")
    .update({ status: "accepted" })
    .eq("id", proposalId);
  if (updateErr) throw updateErr;

  // Reject other pending proposals on same request
  await supabase
    .from("proposals")
    .update({ status: "rejected" })
    .eq("request_id", proposal.request_id)
    .neq("id", proposalId)
    .eq("status", "pending");

  // Mark request as matched
  await supabase
    .from("trip_requests")
    .update({ status: "matched" })
    .eq("id", proposal.request_id);

  // Create booking
  const { data: booking, error: bookErr } = await supabase
    .from("bookings")
    .insert({
      client_id: clientId,
      driver_id: proposal.driver_id,
      proposal_id: proposalId,
      passengers: Number(request.passengers) || 1,
      total_fcfa: proposal.price_fcfa,
      status: "confirmed",
    })
    .select()
    .single();
  if (bookErr) throw bookErr;

  return booking;
}

export async function rejectProposal(proposalId: string) {
  const { error } = await supabase
    .from("proposals")
    .update({ status: "rejected" })
    .eq("id", proposalId);
  if (error) throw error;
}

export async function withdrawProposal(proposalId: string) {
  const { error } = await supabase
    .from("proposals")
    .update({ status: "withdrawn" })
    .eq("id", proposalId);
  if (error) throw error;
}

export async function getProposalsForRequest(requestId: string) {
  const { data, error } = await supabase
    .from("proposals")
    .select(
      "*, driver:profiles!driver_id(full_name, average_rating, total_reviews, phone, is_verified), vehicle:vehicles!vehicle_id(brand, model, year, category, seats, air_conditioning, is_verified)"
    )
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Proposal[];
}

export async function getMyProposals(driverId: string) {
  const { data, error } = await supabase
    .from("proposals")
    .select(
      "*, request:trip_requests!request_id(from_city, to_city, departure_date, passengers, trip_type, status)"
    )
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
