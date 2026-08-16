create table if not exists public.region_distances (
  id uuid primary key default gen_random_uuid(),
  from_place text not null,
  to_place text not null,
  distance_km numeric not null,
  duration_minutes integer not null default 0,
  source text not null default 'seed_route',
  fetched_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (from_place, to_place)
);

create index if not exists region_distances_from_to_idx
  on public.region_distances (from_place, to_place);
