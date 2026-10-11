-- Complete the client-side ride lifecycle: declared payment method,
-- cancellation, immutable completion receipt and one client rating per ride.

alter table public.ride_requests
  add column if not exists payment_method text not null default 'cash',
  add column if not exists payment_status text not null default 'pending',
  add column if not exists final_fare integer,
  add column if not exists fare_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null,
  add column if not exists cancellation_reason text,
  add column if not exists receipt_number text,
  add column if not exists receipt_details jsonb not null default '{}'::jsonb;

alter table public.ride_requests
  drop constraint if exists ride_requests_payment_method_check,
  add constraint ride_requests_payment_method_check
    check (payment_method in ('cash', 'wave', 'orange_money')),
  drop constraint if exists ride_requests_payment_status_check,
  add constraint ride_requests_payment_status_check
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  drop constraint if exists ride_requests_final_fare_check,
  add constraint ride_requests_final_fare_check
    check (final_fare is null or final_fare >= 0);

create unique index if not exists ride_requests_receipt_number_idx
  on public.ride_requests(receipt_number)
  where receipt_number is not null;

create table if not exists public.ride_ratings (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null unique references public.ride_requests(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  driver_id uuid not null references public.driver_profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ride_ratings_driver_created_idx
  on public.ride_ratings(driver_id, created_at desc);

alter table public.ride_ratings enable row level security;

drop policy if exists ride_ratings_select_relevant on public.ride_ratings;
create policy ride_ratings_select_relevant
on public.ride_ratings
for select
to authenticated
using (private.can_access_ride(ride_request_id));

grant select on public.ride_ratings to authenticated;

drop function if exists public.create_ride_request(
  text, text, text, double precision, double precision, text,
  double precision, double precision, numeric, integer, timestamptz, text
);

create or replace function public.create_ride_request(
  p_service_type text,
  p_ride_class text,
  p_pickup_address text,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_destination_address text,
  p_destination_lat double precision,
  p_destination_lng double precision,
  p_distance_km numeric,
  p_duration_minutes integer,
  p_scheduled_for timestamptz default null,
  p_delivery_kind text default null,
  p_payment_method text default 'cash'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_service public.service_type;
  v_class public.ride_class;
  v_ride_id uuid;
  v_status public.ride_status;
  v_fare integer;
  v_payment_method text := lower(trim(coalesce(p_payment_method, 'cash')));
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.profiles where id = v_user_id and role = 'client'
  ) then
    raise exception 'client_account_required' using errcode = '42501';
  end if;

  v_service := p_service_type::public.service_type;
  v_class := p_ride_class::public.ride_class;
  if v_service = 'delivery' then
    raise exception 'service_unavailable';
  end if;
  if v_payment_method not in ('cash', 'wave', 'orange_money') then
    raise exception 'invalid_payment_method';
  end if;
  if v_payment_method <> 'cash' then
    raise exception 'digital_payment_unavailable';
  end if;
  if p_distance_km <= 0 or p_distance_km > 2000 or p_duration_minutes <= 0 then
    raise exception 'invalid_route';
  end if;
  if v_service in ('intercity', 'carpool')
     and (p_scheduled_for is null or p_scheduled_for <= now() + interval '30 minutes') then
    raise exception 'scheduled_departure_required';
  end if;

  v_status := case
    when p_scheduled_for is not null and p_scheduled_for > now() + interval '10 minutes'
      then 'scheduled'
    else 'searching'
  end;
  v_fare := private.compute_fare(
    p_distance_km, p_duration_minutes, v_class, v_service,
    coalesce(p_scheduled_for, now())
  );

  insert into public.ride_requests (
    client_id, service_type, ride_class, status,
    pickup_address, pickup_lat, pickup_lng,
    destination_address, destination_lat, destination_lng,
    distance_km, duration_minutes, estimated_fare, scheduled_for,
    delivery_kind, payment_method, payment_status, fare_breakdown
  )
  values (
    v_user_id, v_service, v_class, v_status,
    left(trim(p_pickup_address), 500), p_pickup_lat, p_pickup_lng,
    left(trim(p_destination_address), 500), p_destination_lat, p_destination_lng,
    p_distance_km, p_duration_minutes, v_fare, p_scheduled_for,
    null, v_payment_method, 'pending',
    jsonb_build_object('estimated_total', v_fare, 'currency', 'XOF')
  )
  returning id into v_ride_id;

  insert into public.ride_events (ride_request_id, status, actor_id)
  values (v_ride_id, v_status, v_user_id);

  if v_status = 'searching' then
    insert into public.dispatch_offers (ride_request_id, driver_id)
    select v_ride_id, d.id
    from public.driver_profiles d
    join public.driver_locations l on l.driver_id = d.id
    join public.vehicles v on v.driver_id = d.id and v.is_verified
    where d.status = 'approved'
      and d.is_online
      and v_service = any(d.accepted_services)
      and v_class = any(v.eligible_classes)
      and l.updated_at > now() - interval '2 minutes'
    order by private.distance_km(p_pickup_lat, p_pickup_lng, l.lat, l.lng)
    limit 5;

    if exists (
      select 1 from public.dispatch_offers where ride_request_id = v_ride_id
    ) then
      update public.ride_requests set status = 'offered' where id = v_ride_id;
    end if;
  end if;

  return v_ride_id;
end;
$$;

create or replace function public.cancel_ride_request(
  p_ride_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_ride public.ride_requests%rowtype;
begin
  select * into v_ride
  from public.ride_requests
  where id = p_ride_id and client_id = auth.uid()
  for update;

  if not found then
    raise exception 'ride_not_found' using errcode = '42501';
  end if;
  if v_ride.status not in ('scheduled', 'searching', 'offered', 'assigned', 'driver_en_route') then
    raise exception 'ride_cannot_be_cancelled';
  end if;

  update public.ride_requests
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      cancellation_reason = nullif(left(trim(coalesce(p_reason, '')), 300), ''),
      updated_at = now()
  where id = p_ride_id;

  update public.dispatch_offers
  set status = 'expired', responded_at = coalesce(responded_at, now())
  where ride_request_id = p_ride_id and status = 'pending';

  if v_ride.driver_id is not null then
    update public.driver_profiles
    set is_online = true, updated_at = now()
    where id = v_ride.driver_id;
  end if;

  insert into public.ride_events (ride_request_id, status, actor_id, metadata)
  values (
    p_ride_id,
    'cancelled',
    auth.uid(),
    jsonb_build_object('reason', coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'client_cancelled'))
  );
end;
$$;

create or replace function public.update_ride_status(
  p_ride_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_driver_id uuid;
  v_ride public.ride_requests%rowtype;
  v_new public.ride_status := p_status::public.ride_status;
  v_receipt_number text;
begin
  select id into v_driver_id
  from public.driver_profiles
  where user_id = auth.uid();

  select * into v_ride
  from public.ride_requests
  where id = p_ride_id and driver_id = v_driver_id
  for update;

  if not found then
    raise exception 'assigned_ride_required' using errcode = '42501';
  end if;
  if not (
    (v_ride.status = 'assigned' and v_new = 'driver_en_route') or
    (v_ride.status = 'driver_en_route' and v_new = 'driver_arrived') or
    (v_ride.status = 'driver_arrived' and v_new = 'passenger_on_board') or
    (v_ride.status = 'passenger_on_board' and v_new = 'completed')
  ) then
    raise exception 'invalid_status_transition';
  end if;

  if v_new = 'completed' then
    v_receipt_number := 'REC-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' ||
      upper(substr(replace(p_ride_id::text, '-', ''), 1, 8));

    update public.ride_requests
    set status = v_new,
        final_fare = estimated_fare,
        fare_breakdown = fare_breakdown ||
          jsonb_build_object('final_total', estimated_fare, 'currency', 'XOF'),
        payment_status = case when payment_method = 'cash' then 'paid' else payment_status end,
        completed_at = now(),
        receipt_number = v_receipt_number,
        receipt_details = jsonb_build_object(
          'reference', reference,
          'pickup_address', pickup_address,
          'destination_address', destination_address,
          'distance_km', distance_km,
          'duration_minutes', duration_minutes,
          'ride_class', ride_class,
          'service_type', service_type,
          'driver_id', driver_id
        ),
        updated_at = now()
    where id = p_ride_id;
  else
    update public.ride_requests
    set status = v_new, updated_at = now()
    where id = p_ride_id;
  end if;

  insert into public.ride_events (ride_request_id, status, actor_id)
  values (p_ride_id, v_new, auth.uid());

  if v_new = 'completed' then
    update public.driver_profiles
    set is_online = true, updated_at = now()
    where id = v_driver_id;
  end if;
end;
$$;

create or replace function public.rate_completed_ride(
  p_ride_id uuid,
  p_rating integer,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_ride public.ride_requests%rowtype;
  v_rating_id uuid;
begin
  if p_rating not between 1 and 5 then
    raise exception 'invalid_rating';
  end if;

  select * into v_ride
  from public.ride_requests
  where id = p_ride_id
    and client_id = auth.uid()
    and status = 'completed'
    and driver_id is not null;

  if not found then
    raise exception 'completed_ride_required' using errcode = '42501';
  end if;

  insert into public.ride_ratings (
    ride_request_id, client_id, driver_id, rating, comment
  )
  values (
    p_ride_id,
    auth.uid(),
    v_ride.driver_id,
    p_rating,
    nullif(left(trim(coalesce(p_comment, '')), 500), '')
  )
  on conflict (ride_request_id) do update
  set rating = excluded.rating,
      comment = excluded.comment,
      updated_at = now()
  where public.ride_ratings.client_id = auth.uid()
  returning id into v_rating_id;

  return v_rating_id;
end;
$$;

drop view if exists public.driver_public_profiles;
create view public.driver_public_profiles
with (security_invoker = true)
as
select
  d.id,
  p.full_name,
  p.phone,
  concat_ws(' ', v.brand, v.model) as vehicle,
  v.plate,
  v.color,
  coalesce(r.rating, 0)::numeric(3,2) as rating,
  coalesce(r.rating_count, 0)::bigint as rating_count
from public.driver_profiles d
join public.profiles p on p.id = d.user_id
left join lateral (
  select brand, model, plate, color
  from public.vehicles
  where driver_id = d.id and is_verified
  order by created_at desc
  limit 1
) v on true
left join lateral (
  select avg(rr.rating) as rating, count(*) as rating_count
  from public.ride_ratings rr
  where rr.driver_id = d.id
) r on true;

grant select on public.driver_public_profiles to authenticated;

revoke all on function public.create_ride_request(
  text, text, text, double precision, double precision, text,
  double precision, double precision, numeric, integer, timestamptz, text, text
) from public, anon;
revoke all on function public.cancel_ride_request(uuid, text) from public, anon;
revoke all on function public.update_ride_status(uuid, text) from public, anon;
revoke all on function public.rate_completed_ride(uuid, integer, text) from public, anon;

grant execute on function public.create_ride_request(
  text, text, text, double precision, double precision, text,
  double precision, double precision, numeric, integer, timestamptz, text, text
) to authenticated;
grant execute on function public.cancel_ride_request(uuid, text) to authenticated;
grant execute on function public.update_ride_status(uuid, text) to authenticated;
grant execute on function public.rate_completed_ride(uuid, integer, text) to authenticated;
