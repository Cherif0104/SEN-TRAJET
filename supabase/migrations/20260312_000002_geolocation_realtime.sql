-- SEN TRAJET - Géolocalisation temps réel + types de trajets
-- Phase 1: trip_type, trip_locations, Realtime

-- Types de trajets
create type public.trip_type as enum (
  'interurbain_location',
  'interurbain_covoiturage',
  'urbain',
  'aeroport',
  'colis'
);

-- Ajouter trip_type à trips (rétrocompatible)
alter table public.trips
  add column if not exists trip_type public.trip_type default 'interurbain_covoiturage';

-- Table des positions GPS temps réel
create table if not exists public.trip_locations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  role text not null check (role in ('client', 'driver')),
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision,
  heading_deg double precision,
  speed_kmh double precision,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_trip_locations_trip_id on public.trip_locations (trip_id);
create index if not exists idx_trip_locations_created_at on public.trip_locations (trip_id, created_at desc);

-- RLS
alter table public.trip_locations enable row level security;

drop policy if exists "Read trip_locations for trip participants" on public.trip_locations;
create policy "Read trip_locations for trip participants"
on public.trip_locations for select
to anon, authenticated
using (
  exists (
    select 1 from public.trips t
    where t.id = trip_locations.trip_id
    and t.status = 'active'
  )
);

drop policy if exists "Insert trip_locations for drivers" on public.trip_locations;
create policy "Insert trip_locations for drivers"
on public.trip_locations for insert
to authenticated
with check (
  role = 'driver'
  and exists (
    select 1 from public.trips t
    where t.id = trip_id and t.driver_id = auth.uid()
  )
);

drop policy if exists "Insert trip_locations for clients" on public.trip_locations;
create policy "Insert trip_locations for clients"
on public.trip_locations for insert
to anon, authenticated
with check (role = 'client');

-- Realtime: activer dans Supabase Dashboard > Database > Replication
-- pour la table trip_locations si besoin de suivi temps réel push
