-- Le segment tarifaire et les liens métier sont dérivés de l'identité, jamais du navigateur.
create or replace function public.submit_booking_demande(
  p_pickup text,
  p_dropoff text,
  p_pickup_time timestamptz,
  p_service_type text,
  p_passengers integer default 1,
  p_estimated_price numeric default null,
  p_pricing_segment text default 'client',
  p_distance_km numeric default null,
  p_notes text default null,
  p_phone text default null,
  p_flight_number text default null,
  p_passenger_name text default null,
  p_luggage_count integer default null,
  p_vehicles_needed integer default 1,
  p_is_round_trip boolean default false,
  p_client_id uuid default null,
  p_partner_contract_id uuid default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_ref text := 'SJ-' || (1000 + floor(random() * 9000)::int)::text;
  v_user_id uuid := auth.uid();
  v_segment text := 'client';
  v_client_id uuid := p_client_id;
  v_partner_contract_id uuid := null;
  v_is_staff boolean := false;
  v_is_partner boolean := false;
begin
  if v_user_id is not null then
    v_is_staff := public.has_any_role(
      array['super_admin','manager','commercial','ops','finance']::public.app_role[]
    );
    v_is_partner := public.has_any_role(
      array['partner','provider']::public.app_role[]
    );
  end if;

  if coalesce(p_pricing_segment, 'client') = 'partner' then
    if v_is_staff then
      v_segment := 'partner';
      v_partner_contract_id := p_partner_contract_id;
    elsif v_is_partner and p_partner_contract_id is not null and exists (
      select 1
      from public.partner_contracts pc
      where pc.id = p_partner_contract_id
        and pc.partner_user_id = v_user_id
        and pc.status = 'active'
    ) then
      v_segment := 'partner';
      v_partner_contract_id := p_partner_contract_id;
    else
      raise exception 'partner_pricing_not_authorized' using errcode = '42501';
    end if;
  elsif coalesce(p_pricing_segment, 'client') <> 'client' then
    raise exception 'invalid_pricing_segment' using errcode = '22023';
  end if;

  if v_user_id is null then
    v_client_id := null;
  elsif not v_is_staff and v_client_id is not null and not exists (
    select 1 from public.clients c
    where c.id = v_client_id and c.user_id = v_user_id
  ) then
    raise exception 'client_record_not_authorized' using errcode = '42501';
  end if;

  insert into public.bookings (
    reference, client_id, partner_contract_id, pickup, dropoff, pickup_time,
    service_type, passengers, estimated_price, pricing_segment, distance_km,
    notes, status, vehicles_needed, is_round_trip, phone, flight_number,
    passenger_name, luggage_count
  ) values (
    v_ref, v_client_id, v_partner_contract_id, p_pickup, p_dropoff, p_pickup_time,
    p_service_type, greatest(coalesce(p_passengers, 1), 1), p_estimated_price,
    v_segment, p_distance_km, p_notes, 'demande_recue',
    greatest(coalesce(p_vehicles_needed, 1), 1), coalesce(p_is_round_trip, false),
    p_phone, p_flight_number, p_passenger_name, p_luggage_count
  )
  returning * into v_booking;

  insert into public.service_orders (booking_id, order_number, status)
  values (v_booking.id, 'SO-' || right(extract(epoch from now())::bigint::text, 8), 'planned');

  insert into public.booking_status_history (booking_id, from_status, to_status, note)
  values (v_booking.id, null, 'demande_recue', 'Demande reçue — en attente de traitement SentraJet');

  return v_booking;
end;
$$;

revoke all on function public.submit_booking_demande(
  text,text,timestamptz,text,integer,numeric,text,numeric,text,text,text,text,
  integer,integer,boolean,uuid,uuid
) from public;
grant execute on function public.submit_booking_demande(
  text,text,timestamptz,text,integer,numeric,text,numeric,text,text,text,text,
  integer,integer,boolean,uuid,uuid
) to anon, authenticated;

-- Retire les policies historiques qui annulaient les restrictions plus fines.
drop policy if exists "clients_select_authenticated" on public.clients;
drop policy if exists "drivers_select_authenticated" on public.drivers;
drop policy if exists "partner_contracts_select_authenticated" on public.partner_contracts;

drop policy if exists "bookings_select_authenticated" on public.bookings;
drop policy if exists "bookings_select_demande_public" on public.bookings;
drop policy if exists "bookings_update_authenticated" on public.bookings;
drop policy if exists "bookings_insert_authenticated" on public.bookings;
drop policy if exists "bookings_insert_demande" on public.bookings;

drop policy if exists "payments_all_auth" on public.payments;
drop policy if exists "payments_select_pending" on public.payments;

drop policy if exists "payments_read_own_or_internal" on public.payments;
create policy "payments_read_own_or_internal"
on public.payments for select to authenticated
using (
  exists (
    select 1
    from public.bookings b
    join public.clients c on c.id = b.client_id
    where b.id = payments.booking_id and c.user_id = auth.uid()
  )
  or public.has_any_role(
    array['super_admin','manager','ops','finance']::public.app_role[]
  )
);

drop policy if exists "vehicle_owners_all_auth" on public.vehicle_owners;
drop policy if exists "vehicle_owners_read_own_or_internal" on public.vehicle_owners;
create policy "vehicle_owners_read_own_or_internal"
on public.vehicle_owners for select to authenticated
using (
  user_id = auth.uid()
  or public.has_any_role(
    array['super_admin','manager','ops','finance','fleet_manager']::public.app_role[]
  )
);

drop policy if exists "vehicle_owners_write_internal" on public.vehicle_owners;
create policy "vehicle_owners_write_internal"
on public.vehicle_owners for all to authenticated
using (
  public.has_any_role(
    array['super_admin','manager','ops','finance','fleet_manager']::public.app_role[]
  )
)
with check (
  public.has_any_role(
    array['super_admin','manager','ops','finance','fleet_manager']::public.app_role[]
  )
);

drop policy if exists "vehicle_contracts_all_auth" on public.vehicle_exploitation_contracts;
drop policy if exists "vehicle_contracts_read_own_or_internal" on public.vehicle_exploitation_contracts;
create policy "vehicle_contracts_read_own_or_internal"
on public.vehicle_exploitation_contracts for select to authenticated
using (
  exists (
    select 1 from public.vehicle_owners vo
    where vo.id = vehicle_exploitation_contracts.owner_id
      and vo.user_id = auth.uid()
  )
  or public.has_any_role(
    array['super_admin','manager','ops','finance','fleet_manager']::public.app_role[]
  )
);

drop policy if exists "vehicle_contracts_write_internal" on public.vehicle_exploitation_contracts;
create policy "vehicle_contracts_write_internal"
on public.vehicle_exploitation_contracts for all to authenticated
using (
  public.has_any_role(
    array['super_admin','manager','ops','finance','fleet_manager']::public.app_role[]
  )
)
with check (
  public.has_any_role(
    array['super_admin','manager','ops','finance','fleet_manager']::public.app_role[]
  )
);
