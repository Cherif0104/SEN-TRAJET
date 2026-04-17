-- Enrichissement métier Colis sur trip_requests
-- Champs dédiés colis pour séparer le parcours "envoi" du parcours passagers.

alter table if exists public.trip_requests
  add column if not exists parcel_type text,
  add column if not exists parcel_weight_kg numeric(10,2),
  add column if not exists parcel_volume_label text,
  add column if not exists parcel_quantity integer,
  add column if not exists is_fragile boolean not null default false,
  add column if not exists pickup_address text,
  add column if not exists delivery_address text,
  add column if not exists declared_value_fcfa integer;

alter table if exists public.trip_requests
  drop constraint if exists trip_requests_parcel_weight_non_negative_chk;
alter table if exists public.trip_requests
  add constraint trip_requests_parcel_weight_non_negative_chk
  check (parcel_weight_kg is null or parcel_weight_kg >= 0);

alter table if exists public.trip_requests
  drop constraint if exists trip_requests_parcel_quantity_positive_chk;
alter table if exists public.trip_requests
  add constraint trip_requests_parcel_quantity_positive_chk
  check (parcel_quantity is null or parcel_quantity > 0);

alter table if exists public.trip_requests
  drop constraint if exists trip_requests_declared_value_non_negative_chk;
alter table if exists public.trip_requests
  add constraint trip_requests_declared_value_non_negative_chk
  check (declared_value_fcfa is null or declared_value_fcfa >= 0);

create index if not exists idx_trip_requests_colis_type
  on public.trip_requests (trip_type, parcel_type);

create index if not exists idx_trip_requests_colis_fragile
  on public.trip_requests (is_fragile)
  where trip_type = 'colis';
