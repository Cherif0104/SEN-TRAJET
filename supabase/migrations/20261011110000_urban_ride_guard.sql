-- Enforce the first geographic product boundary in the database.
-- Administrative-region polygons will be added separately with PostGIS;
-- this guard already prevents clients from bypassing the 50 km urban limit.

create or replace function private.validate_ride_geography()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
declare
  v_straight_distance numeric;
begin
  v_straight_distance := private.distance_km(
    new.pickup_lat,
    new.pickup_lng,
    new.destination_lat,
    new.destination_lng
  );

  if new.distance_km + 0.5 < v_straight_distance then
    raise exception 'invalid_route_distance';
  end if;

  if new.service_type = 'ride' and new.distance_km > 50 then
    raise exception 'urban_distance_limit_exceeded';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_ride_geography()
from public, anon, authenticated;

drop trigger if exists validate_ride_geography
on public.ride_requests;

create trigger validate_ride_geography
before insert or update of
  service_type,
  pickup_lat,
  pickup_lng,
  destination_lat,
  destination_lng,
  distance_km
on public.ride_requests
for each row execute function private.validate_ride_geography();
