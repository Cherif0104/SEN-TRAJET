-- SEN TRAJET - Phase 2: Matching InDrive-like
-- Applied via Supabase MCP: sen_trajet_matching_system

-- Tables created:
--   public.trip_requests (client demand with departure_date, time_range, trip_type)
--   public.proposals (driver price offers linked to request + vehicle)
--   public.bookings (created on proposal acceptance)
--
-- Enums: request_status, proposal_status, booking_status
-- RLS enabled on all three tables with appropriate policies
