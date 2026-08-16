-- Distances routières de secours depuis Dakar (références médianes)
insert into public.region_distances (from_place, to_place, distance_km, duration_minutes, source, fetched_at, updated_at)
values
  ('Dakar', 'Thiès', 67, 75, 'seed_route', now(), now()),
  ('Dakar', 'Mbour', 90, 100, 'seed_route', now(), now()),
  ('Dakar', 'Saly', 90, 100, 'seed_route', now(), now()),
  ('Dakar', 'Diourbel', 147, 150, 'seed_route', now(), now()),
  ('Dakar', 'Louga', 192, 180, 'seed_route', now(), now()),
  ('Dakar', 'Kaolack', 195, 190, 'seed_route', now(), now()),
  ('Dakar', 'Saint-Louis', 240, 230, 'seed_route', now(), now()),
  ('Dakar', 'Ziguinchor', 448, 480, 'seed_route', now(), now()),
  ('Dakar', 'Tambacounda', 463, 480, 'seed_route', now(), now()),
  ('Dakar', 'AIBD', 48, 55, 'seed_route', now(), now()),
  ('Dakar', 'Touba', 190, 180, 'seed_route', now(), now())
on conflict (from_place, to_place) do update
  set distance_km = excluded.distance_km,
      duration_minutes = excluded.duration_minutes,
      source = case
        when public.region_distances.source = 'google_distance_matrix' then public.region_distances.source
        else excluded.source
      end,
      updated_at = now();
