import { supabase } from "@/lib/supabase";

export type ReviewTag =
  | "ponctuel"
  | "courtois"
  | "vehicule_propre"
  | "conduite_sure"
  | "climatisation_ok"
  | "bon_prix";

export type Review = {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  tags?: { tag: ReviewTag }[];
  reviewer?: { full_name: string };
};

export const TAG_LABELS: Record<ReviewTag, string> = {
  ponctuel: "Ponctuel",
  courtois: "Courtois",
  vehicule_propre: "Véhicule propre",
  conduite_sure: "Conduite sûre",
  climatisation_ok: "Climatisation OK",
  bon_prix: "Bon prix",
};

export async function submitReview(params: {
  bookingId: string;
  reviewerId: string;
  reviewedId: string;
  rating: number;
  comment?: string;
  tags?: ReviewTag[];
}) {
  const { data: review, error } = await supabase
    .from("reviews")
    .insert({
      booking_id: params.bookingId,
      reviewer_id: params.reviewerId,
      reviewed_id: params.reviewedId,
      rating: params.rating,
      comment: params.comment || null,
    })
    .select()
    .single();
  if (error) throw error;

  if (params.tags && params.tags.length > 0) {
    const tagRows = params.tags.map((tag) => ({
      review_id: review.id,
      tag,
    }));
    await supabase.from("review_tags").insert(tagRows);
  }

  return review;
}

export async function getDriverReviews(driverId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, tags:review_tags(tag), reviewer:profiles!reviewer_id(full_name)")
    .eq("reviewed_id", driverId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return (data ?? []) as Review[];
}

export async function hasReviewedBooking(bookingId: string, reviewerId: string) {
  const { data } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("reviewer_id", reviewerId)
    .single();
  return !!data;
}
