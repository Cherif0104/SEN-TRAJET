-- Lot B: Location hybride + Colis hybride direct/depot

alter table public.rental_bookings
  add column if not exists booking_flow text not null default 'payment_now',
  add column if not exists support_callback_requested boolean not null default false,
  add column if not exists customer_budget_fcfa integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rental_bookings_booking_flow_chk'
  ) then
    alter table public.rental_bookings
      add constraint rental_bookings_booking_flow_chk
      check (booking_flow in ('payment_now', 'callback_support'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rental_bookings_customer_budget_fcfa_chk'
  ) then
    alter table public.rental_bookings
      add constraint rental_bookings_customer_budget_fcfa_chk
      check (customer_budget_fcfa is null or customer_budget_fcfa >= 0);
  end if;
end $$;

alter table public.trip_requests
  add column if not exists colis_dispatch_mode text not null default 'direct_trip',
  add column if not exists preferred_vehicle_type text,
  add column if not exists urgency_level text not null default 'normal',
  add column if not exists relay_dropoff_label text,
  add column if not exists support_callback_requested boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trip_requests_colis_dispatch_mode_chk'
  ) then
    alter table public.trip_requests
      add constraint trip_requests_colis_dispatch_mode_chk
      check (colis_dispatch_mode in ('direct_trip', 'depot_assiste'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trip_requests_urgency_level_chk'
  ) then
    alter table public.trip_requests
      add constraint trip_requests_urgency_level_chk
      check (urgency_level in ('normal', 'urgent', 'express'));
  end if;
end $$;

create index if not exists idx_trip_requests_colis_dispatch_mode
  on public.trip_requests(colis_dispatch_mode)
  where trip_type = 'colis';
