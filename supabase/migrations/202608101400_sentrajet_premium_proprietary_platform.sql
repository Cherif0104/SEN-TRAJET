-- SentraJet Premium: fondations plateforme propriétaire
-- Partenaires B2B + contrats tarifaires + ownership flotte + dispatch (trip_assignments)

-- ---------------------------------------------------------------------------
-- 1) Typologie partenaire (B2B client vs legacy recruteur / loueur)
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.partner_account_type as enum (
    'b2b_client',
    'fleet_recruiter',
    'rental_operator'
  );
exception
  when duplicate_object then null;
end $$;

alter table if exists public.partners
  add column if not exists account_type public.partner_account_type;

-- Cible produit: partenaires = clients B2B. Les comptes existants restent lisibles.
update public.partners
set account_type = 'b2b_client'
where account_type is null;

alter table if exists public.partners
  alter column account_type set default 'b2b_client';

comment on column public.partners.account_type is
  'b2b_client = client entreprise (cible SentraJet Premium); fleet_recruiter / rental_operator = legacy marketplace';

comment on table public.partners is
  'Partenaires SentraJet: par défaut clients B2B à tarifs négociés (plus gestionnaires recruteurs)';

-- ---------------------------------------------------------------------------
-- 2) Contrats / grilles tarifaires partenaires
-- ---------------------------------------------------------------------------
create table if not exists public.partner_pricing_contracts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  name text not null,
  discount_percent numeric(6, 2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 100),
  -- Optionnel: prix fixes par corridor [{ "from_city", "to_city", "price_fcfa", "vehicle_category?" }]
  route_prices jsonb not null default '[]'::jsonb,
  currency text not null default 'XOF',
  notes text,
  is_active boolean not null default true,
  active_from timestamptz not null default timezone('utc', now()),
  active_to timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_partner_pricing_contracts_partner
  on public.partner_pricing_contracts(partner_id);

create index if not exists idx_partner_pricing_contracts_active
  on public.partner_pricing_contracts(partner_id, is_active)
  where is_active = true;

drop trigger if exists trg_set_updated_at_partner_pricing_contracts
  on public.partner_pricing_contracts;
create trigger trg_set_updated_at_partner_pricing_contracts
before update on public.partner_pricing_contracts
for each row
execute function public.set_updated_at();

alter table public.partner_pricing_contracts enable row level security;

-- Partenaire lit ses contrats; admin platform via service role / policies role
drop policy if exists "partner_pricing_contracts_select_own" on public.partner_pricing_contracts;
create policy "partner_pricing_contracts_select_own"
  on public.partner_pricing_contracts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.partners p
      where p.id = partner_pricing_contracts.partner_id
        and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid()
        and pr.role in ('admin', 'super_admin', 'commercial', 'regional_manager')
    )
  );

drop policy if exists "partner_pricing_contracts_admin_write" on public.partner_pricing_contracts;
create policy "partner_pricing_contracts_admin_write"
  on public.partner_pricing_contracts
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid()
        and pr.role in ('admin', 'super_admin', 'commercial')
    )
  )
  with check (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid()
        and pr.role in ('admin', 'super_admin', 'commercial')
    )
  );

comment on table public.partner_pricing_contracts is
  'Contrats tarifaires B2B: remise globale et/ou prix fixes par corridor pour un partenaire';

-- ---------------------------------------------------------------------------
-- 3) Ownership flotte (chauffeurs & véhicules)
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.driver_employment_type as enum ('platform_fleet', 'independent');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.vehicle_ownership as enum ('platform', 'partner', 'driver');
exception
  when duplicate_object then null;
end $$;

alter table if exists public.profiles
  add column if not exists employment_type public.driver_employment_type;

-- Les chauffeurs existants restent "independent" jusqu'à reclassification admin
update public.profiles
set employment_type = 'independent'
where role = 'driver' and employment_type is null;

comment on column public.profiles.employment_type is
  'platform_fleet = chauffeur SentraJet (cible); independent = legacy marketplace';

alter table if exists public.vehicles
  add column if not exists ownership public.vehicle_ownership;

update public.vehicles
set ownership = 'driver'
where ownership is null;

alter table if exists public.vehicles
  alter column ownership set default 'platform';

comment on column public.vehicles.ownership is
  'platform = flotte SentraJet (cible); partner/driver = legacy';

-- ---------------------------------------------------------------------------
-- 4) Réservations B2B (lien partenaire + contrat + prix facturé)
-- ---------------------------------------------------------------------------
alter table if exists public.bookings
  add column if not exists partner_id uuid references public.partners(id) on delete set null;

alter table if exists public.bookings
  add column if not exists pricing_contract_id uuid
    references public.partner_pricing_contracts(id) on delete set null;

alter table if exists public.bookings
  add column if not exists billed_price_fcfa integer
    check (billed_price_fcfa is null or billed_price_fcfa >= 0);

create index if not exists idx_bookings_partner_id
  on public.bookings(partner_id)
  where partner_id is not null;

-- ---------------------------------------------------------------------------
-- 5) Dispatch: affectation mission → chauffeur / véhicule
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.assignment_status as enum (
    'pending',
    'assigned',
    'accepted',
    'rejected',
    'in_progress',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.trip_assignments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  driver_id uuid not null references public.profiles(id) on delete restrict,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  status public.assignment_status not null default 'assigned',
  notes text,
  assigned_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint trip_assignments_has_target check (booking_id is not null or trip_id is not null)
);

create index if not exists idx_trip_assignments_driver
  on public.trip_assignments(driver_id, status);

create index if not exists idx_trip_assignments_booking
  on public.trip_assignments(booking_id)
  where booking_id is not null;

create index if not exists idx_trip_assignments_status
  on public.trip_assignments(status, assigned_at desc);

drop trigger if exists trg_set_updated_at_trip_assignments on public.trip_assignments;
create trigger trg_set_updated_at_trip_assignments
before update on public.trip_assignments
for each row
execute function public.set_updated_at();

alter table public.trip_assignments enable row level security;

drop policy if exists "trip_assignments_driver_select" on public.trip_assignments;
create policy "trip_assignments_driver_select"
  on public.trip_assignments
  for select
  to authenticated
  using (
    driver_id = auth.uid()
    or exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid()
        and pr.role in ('admin', 'super_admin', 'commercial', 'regional_manager', 'trainer')
    )
  );

drop policy if exists "trip_assignments_driver_update_own" on public.trip_assignments;
create policy "trip_assignments_driver_update_own"
  on public.trip_assignments
  for update
  to authenticated
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

drop policy if exists "trip_assignments_admin_all" on public.trip_assignments;
create policy "trip_assignments_admin_all"
  on public.trip_assignments
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid()
        and pr.role in ('admin', 'super_admin', 'commercial', 'regional_manager')
    )
  )
  with check (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid()
        and pr.role in ('admin', 'super_admin', 'commercial', 'regional_manager')
    )
  );

comment on table public.trip_assignments is
  'Dispatch SentraJet: mission (booking/trip) assignée à un chauffeur flotte et optionnellement un véhicule';
