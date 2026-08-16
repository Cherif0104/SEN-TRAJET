-- Fix public "demande" submissions:
-- 1) anon INSERT...RETURNING failed because no SELECT policy existed for anon
-- 2) clients could not self-insert (ensureClientForUser)
-- 3) SECURITY DEFINER RPC for atomic booking + service_order + history

DROP POLICY IF EXISTS bookings_insert_debug_all ON public.bookings;
DROP POLICY IF EXISTS bookings_insert_public ON public.bookings;
DROP POLICY IF EXISTS bookings_insert_anon ON public.bookings;
DROP POLICY IF EXISTS bookings_select_demande_public ON public.bookings;

CREATE POLICY bookings_select_demande_public ON public.bookings
  FOR SELECT
  TO anon, authenticated
  USING (
    status IN (
      'pending_confirmation',
      'demande_recue',
      'demande',
      'nouvelle',
      'brouillon',
      'info_demandee',
      'devis_envoye'
    )
  );

CREATE POLICY bookings_insert_demande ON public.bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status IN (
      'pending_confirmation',
      'demande_recue',
      'demande',
      'nouvelle',
      'brouillon'
    )
  );

DROP POLICY IF EXISTS clients_insert_own ON public.clients;
CREATE POLICY clients_insert_own ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS clients_update_own ON public.clients;
CREATE POLICY clients_update_own ON public.clients
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS service_orders_insert_anon ON public.service_orders;
CREATE POLICY service_orders_insert_anon ON public.service_orders
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS booking_status_history_insert_anon ON public.booking_status_history;
CREATE POLICY booking_status_history_insert_anon ON public.booking_status_history
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS payments_insert_pending ON public.payments;
CREATE POLICY payments_insert_pending ON public.payments
  FOR INSERT TO anon, authenticated
  WITH CHECK (COALESCE(status, 'pending') IN ('pending', 'initiated', 'created'));

DROP POLICY IF EXISTS payments_select_pending ON public.payments;
CREATE POLICY payments_select_pending ON public.payments
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS leads_insert_public ON public.leads;
DROP POLICY IF EXISTS leads_anon_insert ON public.leads;
CREATE POLICY leads_insert_public ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (COALESCE(status, 'new') = 'new');

GRANT SELECT, INSERT ON public.bookings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.clients TO authenticated;
GRANT INSERT ON public.service_orders TO anon, authenticated;
GRANT INSERT ON public.booking_status_history TO anon, authenticated;
GRANT SELECT, INSERT ON public.payments TO anon, authenticated;
GRANT INSERT ON public.leads TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_booking_demande(
  p_pickup text,
  p_dropoff text,
  p_pickup_time timestamptz,
  p_service_type text,
  p_passengers integer DEFAULT 1,
  p_estimated_price numeric DEFAULT NULL,
  p_pricing_segment text DEFAULT 'client',
  p_distance_km numeric DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_flight_number text DEFAULT NULL,
  p_passenger_name text DEFAULT NULL,
  p_luggage_count integer DEFAULT NULL,
  p_vehicles_needed integer DEFAULT 1,
  p_is_round_trip boolean DEFAULT false,
  p_client_id uuid DEFAULT NULL,
  p_partner_contract_id uuid DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings;
  v_ref text := 'SJ-' || (1000 + floor(random() * 9000)::int)::text;
BEGIN
  INSERT INTO public.bookings (
    reference, client_id, partner_contract_id, pickup, dropoff, pickup_time,
    service_type, passengers, estimated_price, pricing_segment, distance_km,
    notes, status, vehicles_needed, is_round_trip, phone, flight_number,
    passenger_name, luggage_count
  ) VALUES (
    v_ref, p_client_id, p_partner_contract_id, p_pickup, p_dropoff, p_pickup_time,
    p_service_type, GREATEST(COALESCE(p_passengers, 1), 1), p_estimated_price,
    COALESCE(p_pricing_segment, 'client'), p_distance_km, p_notes, 'demande_recue',
    GREATEST(COALESCE(p_vehicles_needed, 1), 1), COALESCE(p_is_round_trip, false),
    p_phone, p_flight_number, p_passenger_name, p_luggage_count
  )
  RETURNING * INTO v_booking;

  INSERT INTO public.service_orders (booking_id, order_number, status)
  VALUES (v_booking.id, 'SO-' || right(extract(epoch from now())::bigint::text, 8), 'planned');

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, note)
  VALUES (v_booking.id, NULL, 'demande_recue', 'Demande reçue — en attente de traitement SentraJet');

  RETURN v_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_booking_demande FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_booking_demande TO anon, authenticated;
