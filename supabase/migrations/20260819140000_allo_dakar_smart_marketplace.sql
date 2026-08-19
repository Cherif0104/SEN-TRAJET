-- Allo Dakar : moteur "intelligent" — clôture automatique des réservations avant départ,
-- tarification à deux paliers (domicile vs point relais), et marketplace inversé (le client
-- publie un besoin de trajet, un chauffeur le confirme sur l'un de ses départs).
-- Corrige aussi cancel_allo_dakar_booking qui référençait encore les tables intercity_* (supprimées
-- lors du renommage vers allo_dakar_*).

-- ============================================================
-- 1) Correction du bug cancel_allo_dakar_booking (références obsolètes intercity_*)
-- ============================================================
create or replace function public.cancel_allo_dakar_booking(p_booking_id uuid)
returns allo_dakar_bookings
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_booking public.allo_dakar_bookings%rowtype;
  v_is_staff boolean;
begin
  select has_any_role(array['super_admin', 'manager', 'ops']::app_role[]) into v_is_staff;

  select * into v_booking from public.allo_dakar_bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found';
  end if;

  if not v_is_staff and (v_booking.client_user_id is null or v_booking.client_user_id <> auth.uid()) then
    raise exception 'not_authorized';
  end if;

  if v_booking.status = 'annulee' then
    return v_booking;
  end if;

  update public.allo_dakar_bookings
  set status = 'annulee', payment_status = case when payment_status = 'paid' then 'refunded' else payment_status end, updated_at = now()
  where id = p_booking_id
  returning * into v_booking;

  update public.allo_dakar_departures
  set seats_available = least(seats_total, seats_available + v_booking.seats_booked),
      status = case when status = 'complet' then 'publie' else status end,
      updated_at = now()
  where id = v_booking.departure_id;

  return v_booking;
end;
$$;

-- ============================================================
-- 2) Tarification à deux paliers : domicile (porte-à-porte) vs point relais (dépose commune)
-- ============================================================
alter table public.allo_dakar_corridors
  add column if not exists reference_price_domicile_fcfa integer;

alter table public.allo_dakar_departures
  add column if not exists price_domicile_fcfa integer;

alter table public.allo_dakar_bookings
  add column if not exists pickup_mode text not null default 'point_relais',
  add column if not exists pickup_detail text;

alter table public.allo_dakar_bookings
  drop constraint if exists allo_dakar_bookings_pickup_mode_check;
alter table public.allo_dakar_bookings
  add constraint allo_dakar_bookings_pickup_mode_check check (pickup_mode in ('domicile', 'point_relais'));

comment on column public.allo_dakar_departures.price_per_seat_fcfa is 'Prix point relais (dépose/prise en charge à un point commun du corridor). Toujours renseigné.';
comment on column public.allo_dakar_departures.price_domicile_fcfa is 'Prix porte-à-porte (optionnel) : si NULL, ce départ n''offre pas la prise en charge à domicile.';

-- ============================================================
-- 3) Clôture automatique des réservations avant départ (configurable)
-- ============================================================
insert into public.business_rules (category, rule_key, label, value_json, unit, is_active, notes)
values ('allo_dakar', 'booking_cutoff_minutes', 'Clôture des réservations avant départ', '30', 'minutes', true,
        'Un départ publié ne peut plus recevoir de nouvelle réservation dans les N minutes précédant departure_at.')
on conflict (category, rule_key) do nothing;

drop function if exists public.book_allo_dakar_seats(uuid, text, text, integer);

create or replace function public.book_allo_dakar_seats(
  p_departure_id uuid,
  p_client_full_name text,
  p_client_phone text,
  p_seats integer,
  p_pickup_mode text default 'point_relais',
  p_pickup_detail text default null
)
returns allo_dakar_bookings
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_departure public.allo_dakar_departures%rowtype;
  v_commission_percent numeric;
  v_cutoff_minutes numeric;
  v_price integer;
  v_amount integer;
  v_commission integer;
  v_booking public.allo_dakar_bookings%rowtype;
begin
  if p_seats is null or p_seats < 1 then
    raise exception 'invalid_seats';
  end if;
  if p_pickup_mode not in ('domicile', 'point_relais') then
    raise exception 'invalid_pickup_mode';
  end if;

  select * into v_departure
  from public.allo_dakar_departures
  where id = p_departure_id
  for update;

  if not found then raise exception 'departure_not_found'; end if;
  if v_departure.status not in ('publie') then raise exception 'departure_not_bookable'; end if;
  if v_departure.seats_available < p_seats then raise exception 'not_enough_seats'; end if;

  select coalesce((value_json #>> '{}')::numeric, 30) into v_cutoff_minutes
  from public.business_rules
  where category = 'allo_dakar' and rule_key = 'booking_cutoff_minutes' and is_active
  limit 1;
  if v_departure.departure_at <= now() + make_interval(mins => coalesce(v_cutoff_minutes, 30)::int) then
    raise exception 'booking_closed';
  end if;

  if p_pickup_mode = 'domicile' then
    if v_departure.price_domicile_fcfa is null then
      raise exception 'pickup_mode_unavailable';
    end if;
    v_price := v_departure.price_domicile_fcfa;
  else
    v_price := v_departure.price_per_seat_fcfa;
  end if;

  select coalesce((value_json #>> '{}')::numeric, 10)
  into v_commission_percent
  from public.business_rules
  where category = 'allo_dakar' and rule_key = 'commission_percent' and is_active
  limit 1;

  v_amount := v_price * p_seats;
  v_commission := round(v_amount * coalesce(v_commission_percent, 10) / 100.0);

  update public.allo_dakar_departures
  set seats_available = seats_available - p_seats,
      status = case when seats_available - p_seats <= 0 then 'complet' else status end,
      updated_at = now()
  where id = p_departure_id;

  insert into public.allo_dakar_bookings (
    departure_id, client_user_id, client_full_name, client_phone, seats_booked,
    pickup_mode, pickup_detail, amount_fcfa, commission_fcfa, driver_payout_fcfa, payment_status, status
  ) values (
    p_departure_id, auth.uid(), p_client_full_name, p_client_phone, p_seats,
    p_pickup_mode, p_pickup_detail, v_amount, v_commission, v_amount - v_commission, 'pending', 'confirmee'
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.book_allo_dakar_seats(uuid, text, text, integer, text, text) from public;
grant execute on function public.book_allo_dakar_seats(uuid, text, text, integer, text, text) to anon, authenticated;

-- ============================================================
-- 4) Marketplace inversé : le client publie un besoin, un chauffeur le confirme
-- ============================================================
create table if not exists public.allo_dakar_ride_requests (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid references auth.users(id) on delete set null,
  client_full_name text not null,
  client_phone text not null,
  corridor_id uuid not null references public.allo_dakar_corridors(id) on delete cascade,
  desired_date date not null,
  desired_time_hint text,
  seats_needed integer not null default 1 check (seats_needed between 1 and 10),
  pickup_mode text not null default 'point_relais' check (pickup_mode in ('domicile', 'point_relais')),
  pickup_detail text,
  status text not null default 'ouverte' check (status in ('ouverte', 'confirmee', 'expiree', 'annulee')),
  confirmed_by_driver_id uuid references public.allo_dakar_drivers(id) on delete set null,
  matched_departure_id uuid references public.allo_dakar_departures(id) on delete set null,
  matched_booking_id uuid references public.allo_dakar_bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists allo_dakar_ride_requests_corridor_status_idx on public.allo_dakar_ride_requests (corridor_id, status);
create index if not exists allo_dakar_ride_requests_client_idx on public.allo_dakar_ride_requests (client_user_id);

alter table public.allo_dakar_ride_requests enable row level security;

create policy "allo_dakar_ride_requests_insert_public" on public.allo_dakar_ride_requests
for insert to anon, authenticated
with check (true);

create policy "allo_dakar_ride_requests_select_open" on public.allo_dakar_ride_requests
for select to anon, authenticated
using (status = 'ouverte');

create policy "allo_dakar_ride_requests_select_owner_or_staff" on public.allo_dakar_ride_requests
for select to authenticated
using (
  client_user_id = auth.uid()
  or has_any_role(array['super_admin', 'manager', 'ops']::app_role[])
  or exists (
    select 1 from public.allo_dakar_drivers d
    where d.user_id = auth.uid() and d.id = allo_dakar_ride_requests.confirmed_by_driver_id
  )
  or exists (
    select 1 from public.allo_dakar_drivers d
    join public.allo_dakar_garages g on g.id = d.garage_id
    where g.manager_user_id = auth.uid() and d.id = allo_dakar_ride_requests.confirmed_by_driver_id
  )
);

create policy "allo_dakar_ride_requests_update_owner_or_staff" on public.allo_dakar_ride_requests
for update to authenticated
using (client_user_id = auth.uid() or has_any_role(array['super_admin', 'manager', 'ops']::app_role[]))
with check (
  (client_user_id = auth.uid() and status in ('ouverte', 'annulee'))
  or has_any_role(array['super_admin', 'manager', 'ops']::app_role[])
);

create or replace function public.confirm_allo_dakar_ride_request(p_request_id uuid, p_departure_id uuid)
returns allo_dakar_bookings
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_request public.allo_dakar_ride_requests%rowtype;
  v_departure public.allo_dakar_departures%rowtype;
  v_driver_id uuid;
  v_price integer;
  v_amount integer;
  v_commission integer;
  v_commission_percent numeric;
  v_booking public.allo_dakar_bookings%rowtype;
begin
  select * into v_request from public.allo_dakar_ride_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_request.status <> 'ouverte' then raise exception 'request_not_open'; end if;

  select * into v_departure from public.allo_dakar_departures where id = p_departure_id for update;
  if not found then raise exception 'departure_not_found'; end if;
  if v_departure.corridor_id <> v_request.corridor_id then raise exception 'corridor_mismatch'; end if;
  if v_departure.status <> 'publie' then raise exception 'departure_not_bookable'; end if;
  if v_departure.seats_available < v_request.seats_needed then raise exception 'not_enough_seats'; end if;

  select id into v_driver_id from public.allo_dakar_drivers where user_id = auth.uid();
  if v_driver_id is null or v_driver_id <> v_departure.allo_dakar_driver_id then
    if not has_any_role(array['super_admin', 'manager', 'ops']::app_role[]) then
      raise exception 'not_authorized';
    end if;
  end if;

  if v_request.pickup_mode = 'domicile' then
    if v_departure.price_domicile_fcfa is null then raise exception 'pickup_mode_unavailable'; end if;
    v_price := v_departure.price_domicile_fcfa;
  else
    v_price := v_departure.price_per_seat_fcfa;
  end if;

  select coalesce((value_json #>> '{}')::numeric, 10) into v_commission_percent
  from public.business_rules
  where category = 'allo_dakar' and rule_key = 'commission_percent' and is_active
  limit 1;

  v_amount := v_price * v_request.seats_needed;
  v_commission := round(v_amount * coalesce(v_commission_percent, 10) / 100.0);

  update public.allo_dakar_departures
  set seats_available = seats_available - v_request.seats_needed,
      status = case when seats_available - v_request.seats_needed <= 0 then 'complet' else status end,
      updated_at = now()
  where id = p_departure_id;

  insert into public.allo_dakar_bookings (
    departure_id, client_user_id, client_full_name, client_phone, seats_booked,
    pickup_mode, pickup_detail, amount_fcfa, commission_fcfa, driver_payout_fcfa, payment_status, status
  ) values (
    p_departure_id, v_request.client_user_id, v_request.client_full_name, v_request.client_phone, v_request.seats_needed,
    v_request.pickup_mode, v_request.pickup_detail, v_amount, v_commission, v_amount - v_commission, 'pending', 'confirmee'
  )
  returning * into v_booking;

  update public.allo_dakar_ride_requests
  set status = 'confirmee',
      confirmed_by_driver_id = v_departure.allo_dakar_driver_id,
      matched_departure_id = p_departure_id,
      matched_booking_id = v_booking.id,
      updated_at = now()
  where id = p_request_id;

  return v_booking;
end;
$$;

revoke all on function public.confirm_allo_dakar_ride_request(uuid, uuid) from public, anon;
grant execute on function public.confirm_allo_dakar_ride_request(uuid, uuid) to authenticated;
