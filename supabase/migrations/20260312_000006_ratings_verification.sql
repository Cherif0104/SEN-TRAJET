-- SEN TRAJET - Phase 4: Ratings & Verification
-- Applied via Supabase MCP: sen_trajet_ratings_verification

-- Tables created:
--   public.reviews (one per booking, rating 1-5 + comment)
--   public.review_tags (ponctuel, courtois, vehicule_propre, etc.)
--
-- Trigger: update_profile_rating() recalculates profiles.average_rating / total_reviews
-- Enum: review_tag
