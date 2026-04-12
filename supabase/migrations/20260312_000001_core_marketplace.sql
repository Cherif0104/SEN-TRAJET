-- SEN TRAJET - Core marketplace schema (MVP)
-- Compatible with Supabase Postgres

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type public.trip_status as enum ('draft', 'active', 'completed', 'cancelled');

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references auth.users(id) on delete set null,
  driver_name text not null,
  from_city text not null,
  to_city text not null,
  from_place text,
  to_place text,
  departure_time timestamptz not null,
  arrival_time timestamptz,
  distance_km integer default 0 check (distance_km >= 0),
  duration_minutes integer default 0 check (duration_minutes >= 0),
  vehicle_name text,
  vehicle_category text default 'Standard',
  total_seats integer not null default 4 check (total_seats > 0 and total_seats <= 20),
  available_seats integer not null default 4 check (available_seats >= 0 and available_seats <= total_seats),
  price_fcfa integer not null check (price_fcfa > 0),
  rating numeric(2, 1) default 4.7 check (rating >= 0 and rating <= 5),
  reviews integer not null default 0 check (reviews >= 0),
  status public.trip_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_trips_status_departure
  on public.trips (status, departure_time);

create index if not exists idx_trips_from_city_trgm
  on public.trips using gin (from_city gin_trgm_ops);

create index if not exists idx_trips_to_city_trgm
  on public.trips using gin (to_city gin_trgm_ops);

create index if not exists idx_trips_driver_id
  on public.trips (driver_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_trips on public.trips;
create trigger trg_set_updated_at_trips
before update on public.trips
for each row
execute function public.set_updated_at();

alter table public.trips enable row level security;

drop policy if exists "Public can read active trips" on public.trips;
create policy "Public can read active trips"
on public.trips
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "Drivers can insert own trips" on public.trips;
create policy "Drivers can insert own trips"
on public.trips
for insert
to authenticated
with check (driver_id = auth.uid());

drop policy if exists "Drivers can update own trips" on public.trips;
create policy "Drivers can update own trips"
on public.trips
for update
to authenticated
using (driver_id = auth.uid())
with check (driver_id = auth.uid());

drop policy if exists "Drivers can delete own trips" on public.trips;
create policy "Drivers can delete own trips"
on public.trips
for delete
to authenticated
using (driver_id = auth.uid());
