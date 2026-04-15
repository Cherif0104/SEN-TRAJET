-- Lots 1+2+3
-- - Réservation enrichie (paiement/bagages/adultes-enfants)
-- - Notifications ciblées chauffeurs avec throttling/digest
-- - Référentiels distance/carburant/tarification

alter table if exists public.bookings
  add column if not exists payment_method text,
  add column if not exists baggage_type text,
  add column if not exists adult_passengers integer,
  add column if not exists child_passengers integer;

alter table if exists public.trip_requests
  add column if not exists budget_fcfa integer;

create table if not exists public.driver_notification_preferences (
  driver_id uuid primary key references public.profiles(id) on delete cascade,
  notify_new_requests boolean not null default true,
  notify_matching_trips boolean not null default true,
  max_notifications_per_day integer not null default 6 check (max_notifications_per_day between 1 and 30),
  digest_enabled boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_dispatch_logs (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_notification_dispatch_logs_driver_day
  on public.notification_dispatch_logs (driver_id, created_at desc);

create table if not exists public.driver_match_notifications (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.trip_requests(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  notification_type text not null default 'request_match',
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_driver_match_notifications_driver_created
  on public.driver_match_notifications (driver_id, created_at desc);

create unique index if not exists uq_driver_match_notif_request
  on public.driver_match_notifications (driver_id, request_id)
  where request_id is not null;

create unique index if not exists uq_driver_match_notif_trip
  on public.driver_match_notifications (driver_id, trip_id)
  where trip_id is not null;

alter table public.driver_notification_preferences enable row level security;
alter table public.notification_dispatch_logs enable row level security;
alter table public.driver_match_notifications enable row level security;

drop policy if exists "driver_notification_preferences_select_own" on public.driver_notification_preferences;
create policy "driver_notification_preferences_select_own"
on public.driver_notification_preferences for select
to authenticated
using (driver_id = auth.uid());

drop policy if exists "driver_notification_preferences_upsert_own" on public.driver_notification_preferences;
create policy "driver_notification_preferences_upsert_own"
on public.driver_notification_preferences for all
to authenticated
using (driver_id = auth.uid())
with check (driver_id = auth.uid());

drop policy if exists "notification_dispatch_logs_select_own" on public.notification_dispatch_logs;
create policy "notification_dispatch_logs_select_own"
on public.notification_dispatch_logs for select
to authenticated
using (driver_id = auth.uid());

drop policy if exists "driver_match_notifications_select_own" on public.driver_match_notifications;
create policy "driver_match_notifications_select_own"
on public.driver_match_notifications for select
to authenticated
using (driver_id = auth.uid());

drop policy if exists "driver_match_notifications_update_own" on public.driver_match_notifications;
create policy "driver_match_notifications_update_own"
on public.driver_match_notifications for update
to authenticated
using (driver_id = auth.uid())
with check (driver_id = auth.uid());

create or replace function public.notify_drivers_on_trip_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver record;
  v_prefs record;
  v_sent_today integer;
  v_notif_type text;
begin
  for v_driver in
    select distinct p.id as driver_id
    from public.profiles p
    join public.vehicles v on v.driver_id = p.id
    where p.role in ('driver', 'partner_operator', 'partner_manager')
      and (
        lower(coalesce(p.city, '')) like '%' || lower(new.from_city) || '%'
        or lower(coalesce(p.city, '')) like '%' || lower(new.to_city) || '%'
      )
  loop
    select *
    into v_prefs
    from public.driver_notification_preferences
    where driver_id = v_driver.driver_id;

    if not found then
      insert into public.driver_notification_preferences (driver_id)
      values (v_driver.driver_id)
      on conflict (driver_id) do nothing;
      select *
      into v_prefs
      from public.driver_notification_preferences
      where driver_id = v_driver.driver_id;
    end if;

    if not coalesce(v_prefs.notify_new_requests, true) then
      continue;
    end if;

    select count(*)::integer
    into v_sent_today
    from public.notification_dispatch_logs
    where driver_id = v_driver.driver_id
      and reason = 'trip_request_match'
      and created_at >= date_trunc('day', timezone('utc', now()));

    if v_sent_today >= coalesce(v_prefs.max_notifications_per_day, 6) then
      continue;
    end if;

    v_notif_type := case when coalesce(v_prefs.digest_enabled, true) then 'digest' else 'request_match' end;

    if not exists (
      select 1 from public.driver_match_notifications n
      where n.driver_id = v_driver.driver_id and n.request_id = new.id
    ) then
      insert into public.driver_match_notifications (
        driver_id, request_id, notification_type, title, body, metadata
      ) values (
        v_driver.driver_id,
        new.id,
        v_notif_type,
        'Nouvelle demande pertinente',
        'Trajet demandé: ' || new.from_city || ' → ' || new.to_city,
        jsonb_build_object(
          'departure_date', new.departure_date,
          'trip_type', new.trip_type,
          'budget_fcfa', new.budget_fcfa
        )
      );
    end if;

    insert into public.notification_dispatch_logs (driver_id, reason, ref_id)
    values (v_driver.driver_id, 'trip_request_match', new.id);
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notify_drivers_on_trip_request on public.trip_requests;
create trigger trg_notify_drivers_on_trip_request
after insert on public.trip_requests
for each row execute function public.notify_drivers_on_trip_request();

create table if not exists public.region_distances (
  id uuid primary key default gen_random_uuid(),
  from_place text not null,
  to_place text not null,
  distance_km numeric(10,2) not null check (distance_km >= 0),
  duration_minutes integer not null check (duration_minutes >= 0),
  source text not null default 'google_distance_matrix',
  fetched_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_region_distances_pair
  on public.region_distances (from_place, to_place);

create table if not exists public.fuel_prices (
  fuel_type text primary key,
  unit_price_fcfa numeric(10,2) not null check (unit_price_fcfa > 0),
  effective_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vehicle_consumption_profiles (
  id uuid primary key default gen_random_uuid(),
  vehicle_category text not null,
  fuel_type text not null,
  liters_per_100km numeric(6,2) not null check (liters_per_100km > 0),
  with_driver_overhead_fcfa numeric(10,2) not null default 0,
  unique (vehicle_category, fuel_type)
);

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  margin_percent numeric(6,2) not null default 25 check (margin_percent >= 0),
  operational_fee_fcfa numeric(10,2) not null default 0,
  with_driver_fee_fcfa numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.region_distances enable row level security;
alter table public.fuel_prices enable row level security;
alter table public.vehicle_consumption_profiles enable row level security;
alter table public.pricing_rules enable row level security;

drop policy if exists "region_distances_public_select" on public.region_distances;
create policy "region_distances_public_select"
on public.region_distances for select
to anon, authenticated
using (true);

drop policy if exists "fuel_prices_public_select" on public.fuel_prices;
create policy "fuel_prices_public_select"
on public.fuel_prices for select
to anon, authenticated
using (true);

drop policy if exists "vehicle_consumption_profiles_public_select" on public.vehicle_consumption_profiles;
create policy "vehicle_consumption_profiles_public_select"
on public.vehicle_consumption_profiles for select
to anon, authenticated
using (true);

drop policy if exists "pricing_rules_public_select" on public.pricing_rules;
create policy "pricing_rules_public_select"
on public.pricing_rules for select
to anon, authenticated
using (is_active = true);

insert into public.fuel_prices (fuel_type, unit_price_fcfa)
values
  ('diesel', 775),
  ('essence', 890),
  ('hybrid', 820),
  ('electric', 450)
on conflict (fuel_type) do update
set unit_price_fcfa = excluded.unit_price_fcfa,
    effective_at = timezone('utc', now());

insert into public.vehicle_consumption_profiles (vehicle_category, fuel_type, liters_per_100km, with_driver_overhead_fcfa)
values
  ('standard', 'diesel', 7.2, 2500),
  ('standard', 'essence', 8.0, 2500),
  ('confort', 'diesel', 8.5, 3000),
  ('confort', 'essence', 9.2, 3000),
  ('premium', 'diesel', 10.2, 3500),
  ('premium', 'essence', 11.0, 3500),
  ('utilitaire', 'diesel', 11.5, 3000),
  ('utilitaire', 'essence', 12.8, 3000)
on conflict (vehicle_category, fuel_type) do update
set liters_per_100km = excluded.liters_per_100km,
    with_driver_overhead_fcfa = excluded.with_driver_overhead_fcfa;

insert into public.pricing_rules (margin_percent, operational_fee_fcfa, with_driver_fee_fcfa, is_active)
values (30, 1500, 5000, true);
