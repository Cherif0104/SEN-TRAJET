-- SEN TRAJET - Phase 1: Profiles, Vehicles, Driver Documents
-- Applied via Supabase MCP

-- See migration applied via MCP tool: sen_trajet_profiles_vehicles
-- This file is kept for reference and version control.

-- Tables created:
--   public.profiles (id, role, full_name, phone, avatar_url, city, is_verified, average_rating, total_reviews)
--   public.vehicles (id, driver_id, brand, model, year, plate_number, category, seats, photo_urls, is_verified, air_conditioning)
--   public.driver_documents (id, driver_id, doc_type, file_url, status, reviewed_at)
--
-- Enums: user_role, doc_type, doc_status, vehicle_category
-- Trigger: on_auth_user_created -> handle_new_user() auto-creates profile
-- RLS enabled on all three tables
