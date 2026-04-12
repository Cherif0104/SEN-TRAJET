-- SEN TRAJET - Parallel refactor foundations
-- Geo reference, hybrid pricing, RBAC, compliance lifecycle, commission config

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Geo reference tables (region -> department -> commune -> locality -> poi)
-- ---------------------------------------------------------------------------
create table if not exists public.geo_regions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.geo_departments (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.geo_regions(id) on delete cascade,
  code text unique not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (region_id, name)
);

create table if not exists public.geo_communes (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.geo_departments(id) on delete cascade,
  code text unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (department_id, name)
);

create table if not exists public.geo_localities (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.geo_communes(id) on delete cascade,
  name text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now(),
  unique (commune_id, name)
);

create table if not exists public.geo_poi (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.geo_communes(id) on delete cascade,
  label text not null,
  poi_type text not null default 'landmark',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now()
);

insert into public.geo_regions (code, name)
values
  ('DK', 'Dakar'),
  ('TH', 'Thies'),
  ('SL', 'Saint-Louis'),
  ('LG', 'Louga'),
  ('DB', 'Diourbel'),
  ('FK', 'Fatick'),
  ('KL', 'Kaolack'),
  ('KF', 'Kaffrine'),
  ('TM', 'Tambacounda'),
  ('KG', 'Kedougou'),
  ('KD', 'Kolda'),
  ('SD', 'Sedhiou'),
  ('ZG', 'Ziguinchor'),
  ('MT', 'Matam')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Hybrid pricing configuration + pickup model
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.pickup_mode as enum ('driver_point', 'home_pickup');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'global', -- global|region|route
  region_from text,
  region_to text,
  base_multiplier numeric(6, 3) not null default 1.0,
  home_pickup_extra_fcfa integer not null default 2000 check (home_pickup_extra_fcfa >= 0),
  platform_fee_percent numeric(6, 3) not null default 10.0 check (platform_fee_percent >= 0),
  partner_share_percent numeric(6, 3) not null default 4.0 check (partner_share_percent >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.pricing_rules (scope, home_pickup_extra_fcfa, platform_fee_percent, partner_share_percent)
values ('global', 2000, 10.0, 4.0)
on conflict do nothing;

alter table public.trips
  add column if not exists pickup_mode public.pickup_mode not null default 'driver_point',
  add column if not exists driver_pickup_point_label text,
  add column if not exists driver_pickup_lat numeric(9, 6),
  add column if not exists driver_pickup_lng numeric(9, 6),
  add column if not exists base_price_fcfa integer,
  add column if not exists home_pickup_extra_fcfa integer not null default 2000;

update public.trips
set base_price_fcfa = coalesce(base_price_fcfa, price_fcfa)
where base_price_fcfa is null;

alter table public.trips
  alter column base_price_fcfa set not null;

alter table public.trip_requests
  add column if not exists pickup_mode public.pickup_mode not null default 'driver_point',
  add column if not exists driver_pickup_point_label text,
  add column if not exists home_pickup_extra_fcfa integer not null default 2000;

-- ---------------------------------------------------------------------------
-- RBAC / organization model
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'platform', -- platform|partner
  name text not null,
  parent_org_id uuid references public.organizations(id) on delete set null,
  region text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  role_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, organization_id, role_key)
);

-- ---------------------------------------------------------------------------
-- Compliance lifecycle (driver checks and reminders)
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.compliance_status as enum ('pending', 'approved', 'rejected', 'expired');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.driver_compliance_checks (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  check_type text not null, -- onboarding_kyc | weekly_recheck | biweekly_recheck | manual_review
  status public.compliance_status not null default 'pending',
  due_at timestamptz not null,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.compliance_audit_logs (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Commission config (modulable)
-- ---------------------------------------------------------------------------
create table if not exists public.commission_configs (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'global', -- global|partner|region
  partner_id uuid references public.partners(id) on delete cascade,
  region text,
  platform_percent numeric(6, 3) not null default 10.0 check (platform_percent >= 0),
  partner_percent numeric(6, 3) not null default 4.0 check (partner_percent >= 0),
  active_from timestamptz not null default now(),
  active_to timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.commission_configs (scope, platform_percent, partner_percent)
values ('global', 10.0, 4.0)
on conflict do nothing;

alter table public.pricing_rules enable row level security;
alter table public.commission_configs enable row level security;

drop policy if exists "read_pricing_rules" on public.pricing_rules;
create policy "read_pricing_rules"
on public.pricing_rules
for select
to anon, authenticated
using (is_active = true);

