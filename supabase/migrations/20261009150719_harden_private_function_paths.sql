alter function private.distance_km(
  double precision,
  double precision,
  double precision,
  double precision
) set search_path = pg_catalog, public;

alter function private.compute_fare(
  numeric,
  integer,
  public.ride_class,
  public.service_type,
  timestamptz
) set search_path = pg_catalog, public;
