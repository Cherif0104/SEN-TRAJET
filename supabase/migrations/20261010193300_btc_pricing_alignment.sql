-- The database is the source of truth for pricing. Keep the client quote and
-- the persisted fare identical for all active VTC services.

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
set search_path = pg_catalog, public
as $$
declare
  v_minimum numeric;
  v_rate numeric;
  v_minute_rate numeric;
  v_included_km numeric := 0;
  v_included_minutes integer := 0;
  v_distance numeric;
  v_time numeric;
  v_airport numeric := 0;
  v_shared_adjustment numeric := 0;
  v_night numeric := 0;
  v_raw numeric;
begin
  case p_ride_class
    when 'eco' then
      v_minimum := 1000;
      v_rate := 118;
      v_minute_rate := 30;
      v_included_km := 1.1;
      v_included_minutes := 4;
    when 'comfort' then
      v_minimum := 1000;
      v_rate := 180;
      v_minute_rate := 22;
    when 'comfort_plus' then
      v_minimum := 1500;
      v_rate := 240;
      v_minute_rate := 22;
    when 'vip' then
      v_minimum := 3000;
      v_rate := 380;
      v_minute_rate := 22;
  end case;

  v_distance := greatest(p_distance_km - v_included_km, 0) * v_rate;
  v_time := greatest(p_duration_minutes - v_included_minutes, 0) * v_minute_rate;

  if p_service_type = 'airport' then
    v_airport := 5000;
  end if;
  if p_service_type = 'carpool' then
    v_shared_adjustment := -least((v_distance + v_time) * 0.25, 4000);
  end if;

  if extract(hour from p_at at time zone 'Africa/Dakar') >= 22
     or extract(hour from p_at at time zone 'Africa/Dakar') < 6 then
    v_night := greatest(1000, (v_distance + v_time) * 0.2);
  end if;

  v_raw := v_minimum + v_distance + v_time
    + v_airport + v_shared_adjustment + v_night;

  return (ceil(greatest(v_minimum, v_raw) / 100) * 100)::integer;
end;
$$;

revoke all on function private.compute_fare(
  numeric, integer, public.ride_class, public.service_type, timestamptz
) from public, anon;
grant execute on function private.compute_fare(
  numeric, integer, public.ride_class, public.service_type, timestamptz
) to authenticated, service_role;
