-- SENTRAJET LIVE V1 — destructive clean baseline requested by the product owner.
-- Replaces every previous application object and removes legacy users/storage.

drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

-- Storage objects are intentionally not deleted with SQL: Supabase protects
-- physical objects from orphaning. Empty legacy buckets through the Storage API.
delete from auth.users;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create type public.user_role as enum ('client', 'driver', 'admin');
create type public.driver_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.service_type as enum ('ride', 'airport', 'delivery');
create type public.ride_class as enum ('eco', 'comfort', 'comfort_plus', 'vip');
create type public.ride_status as enum (
  'draft',
  'scheduled',
  'searching',
  'offered',
  'assigned',
  'driver_en_route',
  'driver_arrived',
  'passenger_on_board',
  'completed',
  'cancelled',
  'no_driver'
);
create type public.offer_status as enum ('pending', 'accepted', 'declined', 'expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.driver_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status public.driver_status not null default 'pending',
  is_online boolean not null default false,
  accepted_services public.service_type[] not null default array['ride'::public.service_type, 'airport'::public.service_type],
  license_number text,
  license_url text,
  identity_url text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.driver_profiles(id) on delete cascade,
  ride_class public.ride_class not null default 'eco',
  brand text not null,
  model text not null,
  plate text not null unique,
  color text,
  seats integer not null default 4 check (seats between 1 and 60),
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.driver_locations (
  driver_id uuid primary key references public.driver_profiles(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  heading double precision,
  accuracy_m double precision,
  updated_at timestamptz not null default now()
);

create table public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('SJ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  client_id uuid not null references auth.users(id) on delete cascade,
  driver_id uuid references public.driver_profiles(id) on delete set null,
  service_type public.service_type not null,
  ride_class public.ride_class not null,
  status public.ride_status not null default 'searching',
  pickup_address text not null,
  pickup_lat double precision not null check (pickup_lat between -90 and 90),
  pickup_lng double precision not null check (pickup_lng between -180 and 180),
  destination_address text not null,
  destination_lat double precision not null check (destination_lat between -90 and 90),
  destination_lng double precision not null check (destination_lng between -180 and 180),
  distance_km numeric(10,2) not null check (distance_km > 0),
  duration_minutes integer not null check (duration_minutes > 0),
  estimated_fare integer not null check (estimated_fare >= 0),
  scheduled_for timestamptz,
  delivery_kind text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dispatch_offers (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests(id) on delete cascade,
  driver_id uuid not null references public.driver_profiles(id) on delete cascade,
  status public.offer_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '25 seconds'),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (ride_request_id, driver_id)
);

create table public.ride_events (
  id bigint generated always as identity primary key,
  ride_request_id uuid not null references public.ride_requests(id) on delete cascade,
  status public.ride_status not null,
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  image_url text,
  address text not null,
  lat double precision,
  lng double precision,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  price integer not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create index ride_requests_client_created_idx on public.ride_requests(client_id, created_at desc);
create index ride_requests_driver_status_idx on public.ride_requests(driver_id, status);
create index ride_requests_searching_idx on public.ride_requests(status, service_type, ride_class, created_at)
  where status in ('searching', 'offered');
create index dispatch_offers_driver_pending_idx on public.dispatch_offers(driver_id, status, expires_at);
create index driver_locations_updated_idx on public.driver_locations(updated_at desc);
create index menu_items_restaurant_idx on public.menu_items(restaurant_id) where is_available;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function private.distance_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
as $$
  select 6371 * 2 * asin(
    sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians(lng2 - lng1) / 2), 2)
    )
  );
$$;

create or replace function private.is_driver_owner(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.driver_profiles
    where id = p_driver_id and user_id = auth.uid()
  );
$$;

create or replace function private.can_access_driver(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    private.is_driver_owner(p_driver_id)
    or private.is_admin()
    or exists (
      select 1 from public.ride_requests
      where driver_id = p_driver_id and client_id = auth.uid()
    );
$$;

create or replace function private.can_access_ride(p_ride_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.ride_requests r
    left join public.driver_profiles d on d.id = r.driver_id
    where r.id = p_ride_id
      and (r.client_id = auth.uid() or d.user_id = auth.uid() or private.is_admin())
  );
$$;

create or replace function private.compute_fare(
  p_distance_km numeric,
  p_duration_minutes integer,
  p_ride_class public.ride_class,
  p_service_type public.service_type,
  p_at timestamptz
)
returns integer
language plpgsql
immutable
as $$
declare
  v_minimum numeric;
  v_rate numeric;
  v_minute_rate numeric;
  v_included_km numeric := 0;
  v_included_minutes integer := 0;
  v_airport numeric := 0;
  v_delivery_adjustment numeric := 0;
  v_night numeric := 0;
  v_subtotal numeric;
begin
  case p_ride_class
    when 'eco' then
      v_minimum := 570; v_rate := 118; v_minute_rate := 30; v_included_km := 1.1; v_included_minutes := 4;
    when 'comfort' then
      v_minimum := 1000; v_rate := 180; v_minute_rate := 22;
    when 'comfort_plus' then
      v_minimum := 1500; v_rate := 240; v_minute_rate := 22;
    when 'vip' then
      v_minimum := 3000; v_rate := 380; v_minute_rate := 22;
  end case;

  if p_service_type = 'airport' then v_airport := 5000; end if;
  if p_service_type = 'delivery' then
    v_delivery_adjustment := -least(greatest(p_distance_km - v_included_km, 0) * v_rate * 0.15, 1500);
  end if;

  v_subtotal :=
    v_minimum +
    greatest(p_distance_km - v_included_km, 0) * v_rate +
    greatest(p_duration_minutes - v_included_minutes, 0) * v_minute_rate +
    v_airport +
    v_delivery_adjustment;

  if extract(hour from p_at at time zone 'Africa/Dakar') >= 22
     or extract(hour from p_at at time zone 'Africa/Dakar') < 6 then
    v_night := greatest(1000, v_subtotal * 0.2);
  end if;

  return (ceil(greatest(v_minimum, v_subtotal + v_night) / 100) * 100)::integer;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    'client',
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() = old.id and not private.is_admin() and new.role is distinct from old.role then
    if not (
      old.role = 'client'
      and new.role = 'driver'
      and exists (
        select 1 from public.driver_profiles
        where user_id = auth.uid() and status = 'pending'
      )
    ) then
      raise exception 'profile_role_change_not_allowed' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_profile_fields_trigger
before update on public.profiles
for each row execute function public.protect_profile_fields();

create or replace function public.register_driver_application()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_driver_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if not exists (select 1 from public.profiles where id = v_user_id and role in ('client', 'driver')) then
    raise exception 'driver_registration_not_allowed' using errcode = '42501';
  end if;

  insert into public.driver_profiles (user_id, status)
  values (v_user_id, 'pending')
  on conflict (user_id) do update set updated_at = now()
  returning id into v_driver_id;

  update public.profiles set role = 'driver' where id = v_user_id;
  return v_driver_id;
end;
$$;

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
  if v_user_id is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if not exists (select 1 from public.profiles where id = v_user_id and role = 'client') then
    raise exception 'client_account_required' using errcode = '42501';
  end if;

  v_service := p_service_type::public.service_type;
  v_class := p_ride_class::public.ride_class;
  if p_distance_km <= 0 or p_distance_km > 2000 or p_duration_minutes <= 0 then
    raise exception 'invalid_route';
  end if;
  v_status := case when p_scheduled_for is not null and p_scheduled_for > now() + interval '10 minutes' then 'scheduled' else 'searching' end;
  v_fare := private.compute_fare(p_distance_km, p_duration_minutes, v_class, v_service, coalesce(p_scheduled_for, now()));

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
    p_distance_km, p_duration_minutes, v_fare, p_scheduled_for, left(p_delivery_kind, 50)
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
      and v.ride_class = v_class
      and l.updated_at > now() - interval '2 minutes'
    order by private.distance_km(p_pickup_lat, p_pickup_lng, l.lat, l.lng)
    limit 5;

    if exists (select 1 from public.dispatch_offers where ride_request_id = v_ride_id) then
      update public.ride_requests set status = 'offered' where id = v_ride_id;
    end if;
  end if;

  return v_ride_id;
end;
$$;

create or replace function public.set_driver_availability(
  p_online boolean,
  p_lat double precision default null,
  p_lng double precision default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_driver_id uuid;
begin
  select id into v_driver_id
  from public.driver_profiles
  where user_id = auth.uid() and status = 'approved';
  if v_driver_id is null then raise exception 'approved_driver_required' using errcode = '42501'; end if;
  if p_online and (p_lat is null or p_lng is null) then raise exception 'location_required'; end if;

  update public.driver_profiles set is_online = p_online, updated_at = now() where id = v_driver_id;
  if p_online then
    insert into public.driver_locations (driver_id, lat, lng)
    values (v_driver_id, p_lat, p_lng)
    on conflict (driver_id) do update set lat = excluded.lat, lng = excluded.lng, updated_at = now();
  end if;
end;
$$;

create or replace function public.respond_dispatch_offer(
  p_offer_id uuid,
  p_accept boolean
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_driver_id uuid;
  v_ride_id uuid;
  v_offer public.dispatch_offers%rowtype;
begin
  select id into v_driver_id from public.driver_profiles
  where user_id = auth.uid() and status = 'approved';
  if v_driver_id is null then raise exception 'approved_driver_required' using errcode = '42501'; end if;

  select * into v_offer from public.dispatch_offers where id = p_offer_id for update;
  if not found or v_offer.driver_id <> v_driver_id then raise exception 'offer_not_found' using errcode = '42501'; end if;
  if v_offer.status <> 'pending' or v_offer.expires_at <= now() then raise exception 'offer_expired'; end if;
  v_ride_id := v_offer.ride_request_id;

  if not p_accept then
    update public.dispatch_offers set status = 'declined', responded_at = now() where id = p_offer_id;
    return v_ride_id;
  end if;

  update public.ride_requests
  set driver_id = v_driver_id, status = 'assigned', updated_at = now()
  where id = v_ride_id and status in ('searching', 'offered') and driver_id is null;
  if not found then raise exception 'ride_already_assigned'; end if;

  update public.dispatch_offers set status = 'accepted', responded_at = now() where id = p_offer_id;
  update public.dispatch_offers set status = 'expired', responded_at = now()
  where ride_request_id = v_ride_id and id <> p_offer_id and status = 'pending';
  update public.driver_profiles set is_online = false, updated_at = now() where id = v_driver_id;
  insert into public.ride_events (ride_request_id, status, actor_id) values (v_ride_id, 'assigned', auth.uid());
  return v_ride_id;
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
  v_old public.ride_status;
  v_new public.ride_status := p_status::public.ride_status;
begin
  select id into v_driver_id from public.driver_profiles where user_id = auth.uid();
  select status into v_old from public.ride_requests where id = p_ride_id and driver_id = v_driver_id for update;
  if v_old is null then raise exception 'assigned_ride_required' using errcode = '42501'; end if;
  if not (
    (v_old = 'assigned' and v_new = 'driver_en_route') or
    (v_old = 'driver_en_route' and v_new = 'driver_arrived') or
    (v_old = 'driver_arrived' and v_new = 'passenger_on_board') or
    (v_old = 'passenger_on_board' and v_new = 'completed')
  ) then raise exception 'invalid_status_transition'; end if;
  update public.ride_requests set status = v_new, updated_at = now() where id = p_ride_id;
  insert into public.ride_events (ride_request_id, status, actor_id) values (p_ride_id, v_new, auth.uid());
  if v_new = 'completed' then
    update public.driver_profiles set is_online = true, updated_at = now() where id = v_driver_id;
  end if;
end;
$$;

create view public.driver_public_profiles
with (security_invoker = true)
as
select
  d.id,
  p.full_name,
  p.phone,
  concat_ws(' ', v.brand, v.model) as vehicle,
  v.plate
from public.driver_profiles d
join public.profiles p on p.id = d.user_id
left join lateral (
  select brand, model, plate from public.vehicles
  where driver_id = d.id and is_verified
  order by created_at desc limit 1
) v on true;

alter table public.profiles enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.driver_locations enable row level security;
alter table public.ride_requests enable row level security;
alter table public.dispatch_offers enable row level security;
alter table public.ride_events enable row level security;
alter table public.restaurants enable row level security;
alter table public.menu_items enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid() or private.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid() or private.is_admin()) with check (id = auth.uid() or private.is_admin());

create policy drivers_select_relevant on public.driver_profiles for select to authenticated using (
  private.can_access_driver(id)
);
create policy vehicles_select_relevant on public.vehicles for select to authenticated using (
  private.can_access_driver(driver_id)
);
create policy vehicles_driver_insert on public.vehicles for insert to authenticated with check (
  private.is_driver_owner(driver_id)
);
create policy vehicles_driver_update on public.vehicles for update to authenticated using (
  private.is_driver_owner(driver_id)
) with check (
  private.is_driver_owner(driver_id)
);

create policy locations_select_relevant on public.driver_locations for select to authenticated using (
  private.can_access_driver(driver_id)
);

create policy rides_select_relevant on public.ride_requests for select to authenticated using (
  private.can_access_ride(id)
);
create policy offers_select_driver on public.dispatch_offers for select to authenticated using (
  private.is_driver_owner(driver_id) or private.is_admin()
);
create policy events_select_relevant on public.ride_events for select to authenticated using (
  private.can_access_ride(ride_request_id)
);

create policy restaurants_public_read on public.restaurants for select to anon, authenticated using (is_active);
create policy menu_public_read on public.menu_items for select to anon, authenticated using (
  is_available and exists (select 1 from public.restaurants r where r.id = restaurant_id and r.is_active)
);

grant select, update on public.profiles to authenticated;
grant select on public.driver_profiles, public.driver_locations, public.ride_requests, public.dispatch_offers, public.ride_events to authenticated;
grant select, insert, update on public.vehicles to authenticated;
grant select on public.restaurants, public.menu_items to anon, authenticated;
grant select on public.driver_public_profiles to authenticated;
grant usage, select on sequence public.ride_events_id_seq to authenticated;

revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile_fields() from public, anon, authenticated;
revoke all on function public.register_driver_application() from public, anon;
revoke all on function public.create_ride_request(text, text, text, double precision, double precision, text, double precision, double precision, numeric, integer, timestamptz, text) from public, anon;
revoke all on function public.set_driver_availability(boolean, double precision, double precision) from public, anon;
revoke all on function public.respond_dispatch_offer(uuid, boolean) from public, anon;
revoke all on function public.update_ride_status(uuid, text) from public, anon;

grant execute on function public.register_driver_application() to authenticated;
grant execute on function public.create_ride_request(text, text, text, double precision, double precision, text, double precision, double precision, numeric, integer, timestamptz, text) to authenticated;
grant execute on function public.set_driver_availability(boolean, double precision, double precision) to authenticated;
grant execute on function public.respond_dispatch_offer(uuid, boolean) to authenticated;
grant execute on function public.update_ride_status(uuid, text) to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_driver_owner(uuid) to authenticated;
grant execute on function private.can_access_driver(uuid) to authenticated;
grant execute on function private.can_access_ride(uuid) to authenticated;

alter publication supabase_realtime add table public.ride_requests;
alter publication supabase_realtime add table public.dispatch_offers;
alter publication supabase_realtime add table public.driver_locations;
