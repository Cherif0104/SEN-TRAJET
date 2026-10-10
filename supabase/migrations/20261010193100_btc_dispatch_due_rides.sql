-- Match every eligible class (not only the vehicle's highest class) and
-- activate scheduled bookings shortly before departure.

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
  p_delivery_kind text default null
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
    distance_km, duration_minutes, estimated_fare, scheduled_for, delivery_kind
  )
  values (
    v_user_id, v_service, v_class, v_status,
    left(trim(p_pickup_address), 500), p_pickup_lat, p_pickup_lng,
    left(trim(p_destination_address), 500), p_destination_lat, p_destination_lng,
    p_distance_km, p_duration_minutes, v_fare, p_scheduled_for, null
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

create or replace function private.dispatch_due_rides()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_driver_id uuid;
  v_count integer;
begin
  select id into v_driver_id
  from public.driver_profiles
  where user_id = auth.uid() and status = 'approved';
  if v_driver_id is null then
    raise exception 'approved_driver_required' using errcode = '42501';
  end if;

  update public.ride_requests
  set status = 'searching', updated_at = now()
  where status = 'scheduled'
    and scheduled_for <= now() + interval '15 minutes'
    and scheduled_for >= now() - interval '30 minutes';

  insert into public.dispatch_offers (ride_request_id, driver_id)
  select r.id, candidates.id
  from public.ride_requests r
  cross join lateral (
    select d.id
    from public.driver_profiles d
    join public.driver_locations l on l.driver_id = d.id
    join public.vehicles v on v.driver_id = d.id and v.is_verified
    where d.status = 'approved'
      and d.is_online
      and r.service_type = any(d.accepted_services)
      and r.ride_class = any(v.eligible_classes)
      and l.updated_at > now() - interval '2 minutes'
    order by private.distance_km(r.pickup_lat, r.pickup_lng, l.lat, l.lng)
    limit 5
  ) candidates
  where r.status = 'searching'
    and r.scheduled_for is not null
  on conflict (ride_request_id, driver_id) do nothing;

  get diagnostics v_count = row_count;

  update public.ride_requests r
  set status = 'offered', updated_at = now()
  where r.status = 'searching'
    and r.scheduled_for is not null
    and exists (
      select 1 from public.dispatch_offers o
      where o.ride_request_id = r.id
        and o.status = 'pending'
        and o.expires_at > now()
    );

  return v_count;
end;
$$;

create or replace function public.dispatch_due_rides()
returns integer
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.dispatch_due_rides();
$$;

revoke all on function private.dispatch_due_rides() from public, anon;
grant execute on function private.dispatch_due_rides() to authenticated;
revoke all on function public.dispatch_due_rides() from public, anon;
grant execute on function public.dispatch_due_rides() to authenticated;
