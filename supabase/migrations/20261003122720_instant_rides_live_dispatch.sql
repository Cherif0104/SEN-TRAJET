-- Dispatch temps réel SentraJet : présence GPS des chauffeurs, priorité de flotte,
-- recherches instantanées et expiration automatique de l'offre.

alter table public.bookings
  add column if not exists pickup_lat double precision,
  add column if not exists pickup_lng double precision,
  add column if not exists dropoff_lat double precision,
  add column if not exists dropoff_lng double precision,
  add column if not exists booking_mode text not null default 'scheduled',
  add column if not exists search_expires_at timestamptz,
  add column if not exists dispatch_attempted_at timestamptz,
  add column if not exists instant_search_token uuid default gen_random_uuid();

alter table public.bookings drop constraint if exists bookings_booking_mode_check;
alter table public.bookings
  add constraint bookings_booking_mode_check
  check (booking_mode in ('scheduled', 'instant'));

alter table public.bookings drop constraint if exists bookings_pickup_coordinates_check;
alter table public.bookings
  add constraint bookings_pickup_coordinates_check
  check (
    (pickup_lat is null and pickup_lng is null)
    or (pickup_lat between -90 and 90 and pickup_lng between -180 and 180)
  );

alter table public.bookings drop constraint if exists bookings_dropoff_coordinates_check;
alter table public.bookings
  add constraint bookings_dropoff_coordinates_check
  check (
    (dropoff_lat is null and dropoff_lng is null)
    or (dropoff_lat between -90 and 90 and dropoff_lng between -180 and 180)
  );

create index if not exists bookings_instant_search_idx
  on public.bookings (search_expires_at)
  where booking_mode = 'instant' and status = 'recherche_chauffeur';

alter table public.vehicles
  add column if not exists fleet_source text not null default 'owned';

alter table public.vehicles drop constraint if exists vehicles_fleet_source_check;
alter table public.vehicles
  add constraint vehicles_fleet_source_check
  check (fleet_source in ('owned', 'managed_partner', 'independent'));

update public.vehicles v
set fleet_source = 'managed_partner'
where v.fleet_source = 'owned'
  and exists (
    select 1
    from public.vehicle_exploitation_contracts c
    where c.vehicle_id = v.id
      and lower(c.status) in ('active', 'actif', 'signed', 'signe')
      and (c.start_date is null or c.start_date <= current_date)
      and (c.end_date is null or c.end_date >= current_date)
  );

create index if not exists vehicles_dispatch_priority_idx
  on public.vehicles (fleet_source, status, seats)
  where is_verified = true;

create table if not exists public.driver_live_status (
  driver_id uuid primary key references public.drivers(id) on delete cascade,
  is_online boolean not null default false,
  available_services text[] not null default array['taxi_aeroport']::text[],
  lat double precision,
  lng double precision,
  accuracy_m double precision,
  heading double precision,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint driver_live_status_coordinates_check check (
    (lat is null and lng is null)
    or (lat between -90 and 90 and lng between -180 and 180)
  ),
  constraint driver_live_status_accuracy_check check (
    accuracy_m is null or accuracy_m between 0 and 10000
  ),
  constraint driver_live_status_services_check check (
    available_services <@ array['taxi_aeroport', 'premium', 'allo_dakar']::text[]
  )
);

create index if not exists driver_live_status_online_idx
  on public.driver_live_status (last_seen_at desc)
  where is_online = true;

alter table public.driver_live_status enable row level security;

create table if not exists public.mobility_provider_applications (
  id uuid primary key default gen_random_uuid(),
  service_type text not null check (service_type in ('taxi_aeroport', 'allo_dakar', 'fleet_partner')),
  full_name text not null,
  phone text not null,
  email text,
  license_number text,
  vehicle_brand text,
  vehicle_model text,
  plate_number text,
  seats integer check (seats is null or seats between 1 and 30),
  grey_card_path text,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'approved', 'rejected')),
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mobility_provider_applications_status_idx
  on public.mobility_provider_applications (status, created_at desc);

alter table public.mobility_provider_applications enable row level security;

drop policy if exists "mobility_provider_applications_staff" on public.mobility_provider_applications;
create policy "mobility_provider_applications_staff"
on public.mobility_provider_applications for all to authenticated
using (public.has_any_role(array['super_admin', 'manager', 'ops', 'fleet_manager']::public.app_role[]))
with check (public.has_any_role(array['super_admin', 'manager', 'ops', 'fleet_manager']::public.app_role[]));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'driver-applications',
  'driver-applications',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "driver_live_status_select_self_or_staff" on public.driver_live_status;
create policy "driver_live_status_select_self_or_staff"
on public.driver_live_status for select to authenticated
using (
  exists (
    select 1 from public.drivers d
    where d.id = driver_live_status.driver_id and d.user_id = auth.uid()
  )
  or public.has_any_role(array['super_admin', 'manager', 'ops', 'fleet_manager']::public.app_role[])
);

drop policy if exists "driver_live_status_write_staff" on public.driver_live_status;
create policy "driver_live_status_write_staff"
on public.driver_live_status for all to authenticated
using (public.has_any_role(array['super_admin', 'manager', 'ops', 'fleet_manager']::public.app_role[]))
with check (public.has_any_role(array['super_admin', 'manager', 'ops', 'fleet_manager']::public.app_role[]));

create or replace function public.set_driver_live_status(
  p_is_online boolean,
  p_lat double precision default null,
  p_lng double precision default null,
  p_accuracy_m double precision default null,
  p_heading double precision default null,
  p_available_services text[] default array['taxi_aeroport']::text[]
)
returns public.driver_live_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid;
  v_result public.driver_live_status;
begin
  select id into v_driver_id
  from public.drivers
  where user_id = auth.uid();

  if v_driver_id is null then
    raise exception 'driver_profile_required';
  end if;

  if p_is_online and (
    p_lat is null or p_lng is null
    or p_lat not between -90 and 90
    or p_lng not between -180 and 180
  ) then
    raise exception 'valid_position_required';
  end if;

  if not (
    coalesce(p_available_services, array[]::text[])
    <@ array['taxi_aeroport', 'premium', 'allo_dakar']::text[]
  ) then
    raise exception 'invalid_service';
  end if;

  insert into public.driver_live_status (
    driver_id, is_online, available_services, lat, lng, accuracy_m, heading,
    last_seen_at, updated_at
  )
  values (
    v_driver_id,
    p_is_online,
    coalesce(p_available_services, array['taxi_aeroport']::text[]),
    case when p_is_online then p_lat else null end,
    case when p_is_online then p_lng else null end,
    case when p_is_online then p_accuracy_m else null end,
    case when p_is_online then p_heading else null end,
    case when p_is_online then now() else null end,
    now()
  )
  on conflict (driver_id) do update set
    is_online = excluded.is_online,
    available_services = excluded.available_services,
    lat = excluded.lat,
    lng = excluded.lng,
    accuracy_m = excluded.accuracy_m,
    heading = excluded.heading,
    last_seen_at = excluded.last_seen_at,
    updated_at = now()
  returning * into v_result;

  update public.drivers
  set status = case when p_is_online then 'available' else 'offline' end,
      updated_at = now()
  where id = v_driver_id
    and lower(status) not in ('on_trip', 'suspendu', 'suspended', 'inactive');

  return v_result;
end;
$$;

revoke all on function public.set_driver_live_status(boolean, double precision, double precision, double precision, double precision, text[])
  from public, anon, authenticated;
grant execute on function public.set_driver_live_status(boolean, double precision, double precision, double precision, double precision, text[])
  to authenticated;

-- Un chauffeur connecté peut recevoir les affectations qui le concernent sans voir le pool.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dispatch_assignments'
  ) then
    alter publication supabase_realtime add table public.dispatch_assignments;
  end if;
end
$$;

create or replace function public.auto_dispatch_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_buffer_minutes numeric := 90;
  v_vehicle_id uuid;
  v_driver_id uuid;
  v_order_id uuid;
  v_order_number text;
begin
  if auth.uid() is not null
    and not public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]) then
    raise exception 'not_authorized';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'booking_not_found');
  end if;

  if exists (
    select 1
    from public.service_orders so
    join public.dispatch_assignments da on da.service_order_id = so.id
    where so.booking_id = p_booking_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_dispatched');
  end if;

  select coalesce((value_json #>> '{}')::numeric, 90)
  into v_buffer_minutes
  from public.business_rules
  where category = 'dispatch'
    and rule_key = 'conflict_buffer_minutes'
    and is_active
  limit 1;
  v_buffer_minutes := coalesce(v_buffer_minutes, 90);

  if v_booking.booking_mode = 'instant' then
    select v.id, d.id
    into v_vehicle_id, v_driver_id
    from public.vehicles v
    join public.drivers d on (v.driver_id is null or v.driver_id = d.id)
    join public.driver_live_status live on live.driver_id = d.id
    where v.is_verified = true
      and lower(v.status) in ('available', 'disponible')
      and coalesce(v.seats, 0) >= greatest(1, coalesce(v_booking.passengers, 1))
      and lower(d.status) in ('active', 'available', 'disponible')
      and live.is_online = true
      and live.last_seen_at >= now() - interval '2 minutes'
      and 'taxi_aeroport' = any(live.available_services)
      and live.lat is not null and live.lng is not null
      and not exists (
        select 1
        from public.dispatch_assignments da
        join public.service_orders so on so.id = da.service_order_id
        join public.bookings b on b.id = so.booking_id
        where (da.vehicle_id = v.id or da.driver_id = d.id)
          and b.status not in (
            'annulee_client', 'annulee_sentrajet', 'terminee', 'remboursee', 'no_show'
          )
      )
    order by
      case v.fleet_source
        when 'owned' then 1
        when 'managed_partner' then 2
        else 3
      end,
      6371 * acos(
        least(1, greatest(-1,
          cos(radians(v_booking.pickup_lat)) * cos(radians(live.lat))
          * cos(radians(live.lng) - radians(v_booking.pickup_lng))
          + sin(radians(v_booking.pickup_lat)) * sin(radians(live.lat))
        ))
      ),
      v.seats asc,
      live.last_seen_at desc
    limit 1;
  else
    select v.id, d.id
    into v_vehicle_id, v_driver_id
    from public.vehicles v
    join public.drivers d on (v.driver_id is null or v.driver_id = d.id)
    where v.is_verified = true
      and lower(v.status) in ('available', 'disponible')
      and coalesce(v.seats, 0) >= greatest(1, coalesce(v_booking.passengers, 1))
      and lower(d.status) in ('active', 'available', 'disponible')
      and not exists (
        select 1 from public.driver_shifts ds
        where ds.driver_id = d.id
          and ds.shift_date = v_booking.pickup_time::date
          and ds.status = 'repos'
      )
      and not exists (
        select 1
        from public.dispatch_assignments da
        join public.service_orders so on so.id = da.service_order_id
        join public.bookings b on b.id = so.booking_id
        where (da.vehicle_id = v.id or da.driver_id = d.id)
          and b.id <> p_booking_id
          and b.status not in (
            'annulee_client', 'annulee_sentrajet', 'terminee', 'remboursee', 'no_show'
          )
          and abs(extract(epoch from (b.pickup_time - v_booking.pickup_time)))
            < (v_buffer_minutes * 60)
      )
    order by
      case v.fleet_source
        when 'owned' then 1
        when 'managed_partner' then 2
        else 3
      end,
      v.seats asc,
      d.updated_at asc
    limit 1;
  end if;

  update public.bookings
  set dispatch_attempted_at = now(), updated_at = now()
  where id = p_booking_id;

  if v_vehicle_id is null or v_driver_id is null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'no_match',
      'retry_until', v_booking.search_expires_at
    );
  end if;

  select id into v_order_id
  from public.service_orders
  where booking_id = p_booking_id
  limit 1;

  if v_order_id is null then
    v_order_number := 'SO-' || upper(left(replace(p_booking_id::text, '-', ''), 12));
    insert into public.service_orders (booking_id, order_number, status)
    values (p_booking_id, v_order_number, 'assigned')
    returning id into v_order_id;
  else
    update public.service_orders
    set status = 'assigned', updated_at = now()
    where id = v_order_id;
  end if;

  insert into public.dispatch_assignments (service_order_id, driver_id, vehicle_id)
  values (v_order_id, v_driver_id, v_vehicle_id);

  update public.bookings
  set status = 'chauffeur_assigne', updated_at = now()
  where id = p_booking_id;
  update public.drivers set status = 'on_trip', updated_at = now() where id = v_driver_id;
  update public.vehicles set status = 'in_service', updated_at = now() where id = v_vehicle_id;

  insert into public.booking_status_history (booking_id, from_status, to_status, note)
  values (
    p_booking_id,
    v_booking.status,
    'chauffeur_assigne',
    'Dispatch automatique : priorité flotte, proximité, capacité et disponibilité'
  );

  return jsonb_build_object(
    'ok', true,
    'vehicle_id', v_vehicle_id,
    'driver_id', v_driver_id
  );
end;
$$;

revoke all on function public.auto_dispatch_booking(uuid) from public, anon, authenticated;
grant execute on function public.auto_dispatch_booking(uuid) to authenticated, service_role;

create or replace function public.expire_stale_live_supply()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drivers integer := 0;
  v_departures integer := 0;
  v_requests integer := 0;
  v_searches integer := 0;
begin
  update public.driver_live_status
  set is_online = false, updated_at = now()
  where is_online = true
    and (last_seen_at is null or last_seen_at < now() - interval '2 minutes');
  get diagnostics v_drivers = row_count;

  update public.allo_dakar_departures
  set status = 'termine', updated_at = now()
  where status in ('publie', 'complet')
    and departure_at < now();
  get diagnostics v_departures = row_count;

  update public.allo_dakar_ride_requests
  set status = 'expiree', updated_at = now()
  where status = 'ouverte'
    and desired_date < current_date;
  get diagnostics v_requests = row_count;

  update public.bookings b
  set status = 'aucun_chauffeur', updated_at = now()
  where b.booking_mode = 'instant'
    and b.status = 'recherche_chauffeur'
    and b.search_expires_at <= now()
    and not exists (
      select 1
      from public.service_orders so
      join public.dispatch_assignments da on da.service_order_id = so.id
      where so.booking_id = b.id
    );
  get diagnostics v_searches = row_count;

  return jsonb_build_object(
    'drivers_offline', v_drivers,
    'departures_archived', v_departures,
    'requests_expired', v_requests,
    'searches_expired', v_searches
  );
end;
$$;

revoke all on function public.expire_stale_live_supply() from public, anon, authenticated;
grant execute on function public.expire_stale_live_supply() to service_role;

do $$
declare
  v_job_id bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select jobid into v_job_id
    from cron.job
    where jobname = 'sentrajet-expire-live-supply'
    limit 1;

    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;

    perform cron.schedule(
      'sentrajet-expire-live-supply',
      '* * * * *',
      'select public.expire_stale_live_supply()'
    );
  end if;
end
$$;
