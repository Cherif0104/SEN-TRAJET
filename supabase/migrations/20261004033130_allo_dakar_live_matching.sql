alter table public.allo_dakar_vehicles
  add column if not exists vehicle_type text not null default 'berline',
  add column if not exists color text,
  add column if not exists model_year integer,
  add column if not exists photo_url text;

alter table public.allo_dakar_vehicles
  drop constraint if exists allo_dakar_vehicles_vehicle_type_check;
alter table public.allo_dakar_vehicles
  add constraint allo_dakar_vehicles_vehicle_type_check
  check (vehicle_type in ('citadine', 'berline', 'suv', 'van'));

alter table public.allo_dakar_vehicles
  drop constraint if exists allo_dakar_vehicles_model_year_check;
alter table public.allo_dakar_vehicles
  add constraint allo_dakar_vehicles_model_year_check
  check (model_year is null or model_year between 1990 and 2100);

alter table public.allo_dakar_departures
  add column if not exists dispatch_mode text not null default 'planifie',
  add column if not exists accepts_auto_dispatch boolean not null default true;

alter table public.allo_dakar_departures
  drop constraint if exists allo_dakar_departures_dispatch_mode_check;
alter table public.allo_dakar_departures
  add constraint allo_dakar_departures_dispatch_mode_check
  check (dispatch_mode in ('planifie', 'en_ligne'));

alter table public.allo_dakar_ride_requests
  add column if not exists requested_at timestamptz,
  add column if not exists request_mode text not null default 'reservation',
  add column if not exists search_window_minutes integer not null default 180,
  add column if not exists expires_at timestamptz,
  add column if not exists max_price_fcfa integer;

update public.allo_dakar_ride_requests
set requested_at = coalesce(requested_at, desired_date::timestamp + interval '12 hours'),
    expires_at = coalesce(expires_at, desired_date::timestamp + interval '23 hours 59 minutes')
where requested_at is null or expires_at is null;

alter table public.allo_dakar_ride_requests
  alter column requested_at set default now(),
  alter column requested_at set not null;

alter table public.allo_dakar_ride_requests
  drop constraint if exists allo_dakar_ride_requests_request_mode_check;
alter table public.allo_dakar_ride_requests
  add constraint allo_dakar_ride_requests_request_mode_check
  check (request_mode in ('reservation', 'instant'));

alter table public.allo_dakar_ride_requests
  drop constraint if exists allo_dakar_ride_requests_search_window_check;
alter table public.allo_dakar_ride_requests
  add constraint allo_dakar_ride_requests_search_window_check
  check (search_window_minutes between 30 and 720);

alter table public.allo_dakar_ride_requests
  drop constraint if exists allo_dakar_ride_requests_max_price_check;
alter table public.allo_dakar_ride_requests
  add constraint allo_dakar_ride_requests_max_price_check
  check (max_price_fcfa is null or max_price_fcfa > 0);

create index if not exists allo_dakar_departures_live_match_idx
  on public.allo_dakar_departures(corridor_id, departure_at, seats_available)
  where status = 'publie' and accepts_auto_dispatch;

create index if not exists allo_dakar_requests_live_match_idx
  on public.allo_dakar_ride_requests(corridor_id, requested_at, expires_at)
  where status = 'ouverte';

create or replace function public.match_allo_dakar_ride_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.allo_dakar_ride_requests%rowtype;
  v_departure public.allo_dakar_departures%rowtype;
  v_price integer;
  v_amount integer;
  v_commission integer;
  v_commission_percent numeric;
  v_booking public.allo_dakar_bookings%rowtype;
begin
  select * into v_request
  from public.allo_dakar_ride_requests
  where id = p_request_id
  for update;

  if not found or v_request.status <> 'ouverte' then
    return jsonb_build_object('matched', false, 'reason', 'request_not_open');
  end if;

  if coalesce(v_request.expires_at, now()) <= now() then
    update public.allo_dakar_ride_requests
    set status = 'expiree', updated_at = now()
    where id = p_request_id;
    return jsonb_build_object('matched', false, 'reason', 'request_expired');
  end if;

  select dep.* into v_departure
  from public.allo_dakar_departures dep
  join public.allo_dakar_drivers driver
    on driver.id = dep.allo_dakar_driver_id
   and driver.status = 'actif'
  join public.allo_dakar_vehicles vehicle
    on vehicle.id = dep.allo_dakar_vehicle_id
   and vehicle.allo_dakar_driver_id = dep.allo_dakar_driver_id
   and vehicle.is_verified
  where dep.corridor_id = v_request.corridor_id
    and dep.status = 'publie'
    and dep.accepts_auto_dispatch
    and dep.seats_available >= v_request.seats_needed
    and dep.departure_at >= greatest(now() + interval '30 minutes', v_request.requested_at)
    and dep.departure_at <= v_request.requested_at
      + make_interval(mins => v_request.search_window_minutes)
    and (
      v_request.pickup_mode = 'point_relais'
      or dep.price_domicile_fcfa is not null
    )
    and (
      v_request.max_price_fcfa is null
      or case
        when v_request.pickup_mode = 'domicile' then dep.price_domicile_fcfa
        else dep.price_per_seat_fcfa
      end <= v_request.max_price_fcfa
    )
    and exists (
      select 1
      from public.allo_dakar_driver_subscriptions subscription
      where subscription.allo_dakar_driver_id = dep.allo_dakar_driver_id
        and subscription.corridor_id = dep.corridor_id
        and subscription.status = 'actif'
        and subscription.starts_at <= now()
        and subscription.ends_at > now()
    )
  order by
    dep.departure_at asc,
    case
      when v_request.pickup_mode = 'domicile' then dep.price_domicile_fcfa
      else dep.price_per_seat_fcfa
    end asc
  for update of dep skip locked
  limit 1;

  if not found then
    return jsonb_build_object(
      'matched', false,
      'request_id', v_request.id,
      'expires_at', v_request.expires_at
    );
  end if;

  v_price := case
    when v_request.pickup_mode = 'domicile' then v_departure.price_domicile_fcfa
    else v_departure.price_per_seat_fcfa
  end;

  select coalesce((value_json #>> '{}')::numeric, 10)
  into v_commission_percent
  from public.business_rules
  where category = 'allo_dakar'
    and rule_key = 'commission_percent'
    and is_active
  limit 1;

  v_amount := v_price * v_request.seats_needed;
  v_commission := round(v_amount * coalesce(v_commission_percent, 10) / 100.0);

  update public.allo_dakar_departures
  set seats_available = seats_available - v_request.seats_needed,
      status = case
        when seats_available - v_request.seats_needed <= 0 then 'complet'
        else status
      end,
      updated_at = now()
  where id = v_departure.id;

  insert into public.allo_dakar_bookings (
    departure_id,
    client_user_id,
    client_full_name,
    client_phone,
    seats_booked,
    pickup_mode,
    pickup_detail,
    amount_fcfa,
    commission_fcfa,
    driver_payout_fcfa,
    payment_status,
    status
  ) values (
    v_departure.id,
    v_request.client_user_id,
    v_request.client_full_name,
    v_request.client_phone,
    v_request.seats_needed,
    v_request.pickup_mode,
    v_request.pickup_detail,
    v_amount,
    v_commission,
    v_amount - v_commission,
    'pending',
    'confirmee'
  )
  returning * into v_booking;

  update public.allo_dakar_ride_requests
  set status = 'confirmee',
      confirmed_by_driver_id = v_departure.allo_dakar_driver_id,
      matched_departure_id = v_departure.id,
      matched_booking_id = v_booking.id,
      updated_at = now()
  where id = v_request.id;

  return jsonb_build_object(
    'matched', true,
    'request_id', v_request.id,
    'booking_id', v_booking.id,
    'departure_id', v_departure.id,
    'amount_fcfa', v_booking.amount_fcfa,
    'departure_at', v_departure.departure_at
  );
end;
$$;

revoke all on function public.match_allo_dakar_ride_request(uuid)
from public, anon, authenticated;
grant execute on function public.match_allo_dakar_ride_request(uuid)
to service_role;

create or replace function public.create_allo_dakar_live_request(
  p_user_id uuid,
  p_client_full_name text,
  p_client_phone text,
  p_corridor_id uuid,
  p_requested_at timestamptz,
  p_seats_needed integer,
  p_pickup_mode text,
  p_pickup_detail text,
  p_search_window_minutes integer,
  p_max_price_fcfa integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.allo_dakar_ride_requests%rowtype;
  v_match jsonb;
begin
  if p_user_id is null
     or nullif(trim(p_client_full_name), '') is null
     or length(regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g')) < 9
     or p_requested_at < now() - interval '5 minutes'
     or p_requested_at > now() + interval '30 days'
     or p_seats_needed not between 1 and 10
     or p_pickup_mode not in ('domicile', 'point_relais')
     or p_search_window_minutes not between 30 and 720 then
    raise exception using errcode = '22023', message = 'allo_dakar_request_invalid';
  end if;

  if not exists (
    select 1
    from public.allo_dakar_corridors corridor
    where corridor.id = p_corridor_id and corridor.is_active
  ) then
    raise exception using errcode = 'P0001', message = 'allo_dakar_corridor_unavailable';
  end if;

  insert into public.allo_dakar_ride_requests (
    client_user_id,
    client_full_name,
    client_phone,
    corridor_id,
    desired_date,
    desired_time_hint,
    requested_at,
    request_mode,
    search_window_minutes,
    expires_at,
    max_price_fcfa,
    seats_needed,
    pickup_mode,
    pickup_detail,
    status
  ) values (
    p_user_id,
    trim(p_client_full_name),
    trim(p_client_phone),
    p_corridor_id,
    p_requested_at::date,
    to_char(p_requested_at at time zone 'Africa/Dakar', 'HH24:MI'),
    p_requested_at,
    'instant',
    p_search_window_minutes,
    p_requested_at + make_interval(mins => p_search_window_minutes),
    p_max_price_fcfa,
    p_seats_needed,
    p_pickup_mode,
    nullif(trim(p_pickup_detail), ''),
    'ouverte'
  )
  returning * into v_request;

  select public.match_allo_dakar_ride_request(v_request.id) into v_match;

  return jsonb_build_object(
    'request_id', v_request.id,
    'expires_at', v_request.expires_at,
    'match', v_match
  );
end;
$$;

revoke all on function public.create_allo_dakar_live_request(
  uuid, text, text, uuid, timestamptz, integer, text, text, integer, integer
) from public, anon, authenticated;
grant execute on function public.create_allo_dakar_live_request(
  uuid, text, text, uuid, timestamptz, integer, text, text, integer, integer
) to service_role;

create or replace function public.auto_match_allo_dakar_departure()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
begin
  if new.status <> 'publie' or not new.accepts_auto_dispatch then
    return new;
  end if;

  for v_request_id in
    select request.id
    from public.allo_dakar_ride_requests request
    where request.status = 'ouverte'
      and request.corridor_id = new.corridor_id
      and request.requested_at <= new.departure_at
      and request.expires_at >= new.departure_at
    order by request.created_at
    limit 50
  loop
    perform public.match_allo_dakar_ride_request(v_request_id);
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_auto_match_allo_dakar_departure
on public.allo_dakar_departures;
create trigger trg_auto_match_allo_dakar_departure
after insert or update of status, departure_at, accepts_auto_dispatch
on public.allo_dakar_departures
for each row execute function public.auto_match_allo_dakar_departure();

revoke all on function public.auto_match_allo_dakar_departure()
from public, anon, authenticated;

create or replace function public.expire_allo_dakar_live_requests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.allo_dakar_ride_requests
  set status = 'expiree', updated_at = now()
  where status = 'ouverte'
    and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_allo_dakar_live_requests()
from public, anon, authenticated;
grant execute on function public.expire_allo_dakar_live_requests()
to service_role;

do $$
declare
  v_job_id bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select jobid into v_job_id
    from cron.job
    where jobname = 'sentrajet-expire-allo-dakar-live-requests'
    limit 1;
    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;
    perform cron.schedule(
      'sentrajet-expire-allo-dakar-live-requests',
      '* * * * *',
      'select public.expire_allo_dakar_live_requests()'
    );
  end if;
end
$$;

drop policy if exists "allo_dakar_ride_requests_insert_public"
on public.allo_dakar_ride_requests;
drop policy if exists "allo_dakar_ride_requests_select_open"
on public.allo_dakar_ride_requests;

create policy "allo_dakar_ride_requests_insert_owner"
on public.allo_dakar_ride_requests
for insert to authenticated
with check (client_user_id = (select auth.uid()));

create policy "allo_dakar_ride_requests_select_driver_network"
on public.allo_dakar_ride_requests
for select to authenticated
using (
  status = 'ouverte'
  and (
    public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[])
    or exists (
      select 1
      from public.allo_dakar_drivers driver
      where driver.user_id = (select auth.uid())
        and driver.status = 'actif'
    )
  )
);

revoke execute on function public.book_allo_dakar_seats(
  uuid, text, text, integer, text, text
) from anon;
