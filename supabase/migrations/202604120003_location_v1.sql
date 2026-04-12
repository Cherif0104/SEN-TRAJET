-- V1 Location Hybride SEN TRAJET
-- Tables métier location, conformité véhicule, réservation et handover.

create extension if not exists pgcrypto;

do $$
begin
  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'user_role')
     and not exists (
       select 1
       from pg_type t
       join pg_enum e on t.oid = e.enumtypid
       where t.typnamespace = 'public'::regnamespace
         and t.typname = 'user_role'
         and e.enumlabel = 'rental_owner'
     ) then
    alter type public.user_role add value 'rental_owner';
  end if;
end
$$;

do $$
begin
  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'commission_type')
     and not exists (
       select 1
       from pg_type t
       join pg_enum e on t.oid = e.enumtypid
       where t.typnamespace = 'public'::regnamespace
         and t.typname = 'commission_type'
         and e.enumlabel = 'rental_completed'
     ) then
    alter type public.commission_type add value 'rental_completed';
  end if;
end
$$;

create type if not exists public.rental_listing_status as enum ('draft', 'pending_review', 'active', 'paused', 'rejected');
create type if not exists public.rental_booking_status as enum ('pending', 'pending_payment', 'confirmed', 'active', 'completed', 'cancelled');
create type if not exists public.rental_operating_mode as enum ('platform_managed', 'marketplace_partner');
create type if not exists public.rental_vehicle_document_type as enum ('carte_grise', 'assurance', 'visite_technique', 'photos_vehicule', 'contrat_location');
create type if not exists public.rental_handover_phase as enum ('pickup', 'return');

create table if not exists public.rental_listings (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  partner_id uuid references public.partners(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  operating_mode public.rental_operating_mode not null default 'marketplace_partner',
  status public.rental_listing_status not null default 'draft',
  is_verified boolean not null default false,
  verification_notes text,
  title text not null,
  brand text not null,
  model text not null,
  trim text,
  plate_number text not null,
  vin text,
  color text,
  year integer,
  first_registration_date date,
  mileage_km integer not null default 0 check (mileage_km >= 0),
  fuel_type text not null default 'essence',
  engine_size_l numeric(4,1),
  transmission text not null default 'manuel',
  seats integer not null default 4 check (seats between 1 and 20),
  doors integer check (doors between 1 and 8),
  has_air_conditioning boolean not null default false,
  ac_operational boolean not null default false,
  airbags_operational boolean not null default false,
  seatbelts_operational boolean not null default true,
  has_spare_tire boolean not null default false,
  technical_inspection_valid_until date,
  insurance_valid_until date,
  had_accident boolean not null default false,
  accident_details text,
  city text not null,
  pickup_location_label text,
  pickup_lat numeric(10, 7),
  pickup_lng numeric(10, 7),
  daily_rate_fcfa integer not null check (daily_rate_fcfa > 0),
  deposit_fcfa integer not null default 0 check (deposit_fcfa >= 0),
  included_km_per_day integer not null default 150 check (included_km_per_day >= 0),
  extra_km_rate_fcfa integer not null default 0 check (extra_km_rate_fcfa >= 0),
  main_photo_url text,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_rental_listings_plate_number on public.rental_listings (plate_number);
create index if not exists idx_rental_listings_owner on public.rental_listings (owner_profile_id);
create index if not exists idx_rental_listings_partner on public.rental_listings (partner_id);
create index if not exists idx_rental_listings_status_city on public.rental_listings (status, city);

create table if not exists public.rental_vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.rental_listings(id) on delete cascade,
  document_type public.rental_vehicle_document_type not null,
  file_url text not null,
  expires_at date,
  is_verified boolean not null default false,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (listing_id, document_type, file_url)
);

create index if not exists idx_rental_vehicle_documents_listing on public.rental_vehicle_documents (listing_id);

create table if not exists public.rental_bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.rental_listings(id) on delete restrict,
  client_id uuid not null references public.profiles(id) on delete restrict,
  owner_profile_id uuid not null references public.profiles(id) on delete restrict,
  partner_id uuid references public.partners(id) on delete set null,
  operating_mode public.rental_operating_mode not null default 'marketplace_partner',
  status public.rental_booking_status not null default 'pending',
  start_date date not null,
  end_date date not null,
  total_days integer not null check (total_days > 0),
  daily_rate_fcfa integer not null check (daily_rate_fcfa > 0),
  subtotal_fcfa integer not null check (subtotal_fcfa >= 0),
  deposit_fcfa integer not null default 0 check (deposit_fcfa >= 0),
  platform_commission_fcfa integer not null default 0 check (platform_commission_fcfa >= 0),
  partner_commission_fcfa integer not null default 0 check (partner_commission_fcfa >= 0),
  owner_net_fcfa integer not null default 0 check (owner_net_fcfa >= 0),
  total_fcfa integer not null check (total_fcfa >= 0),
  payment_reference text,
  paid_at timestamptz,
  pickup_location_label text,
  return_location_label text,
  notes text,
  cancellation_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chk_rental_booking_dates check (end_date >= start_date)
);

create index if not exists idx_rental_bookings_listing on public.rental_bookings (listing_id);
create index if not exists idx_rental_bookings_client on public.rental_bookings (client_id);
create index if not exists idx_rental_bookings_owner on public.rental_bookings (owner_profile_id);
create index if not exists idx_rental_bookings_status_dates on public.rental_bookings (status, start_date, end_date);

create table if not exists public.rental_handover_events (
  id uuid primary key default gen_random_uuid(),
  rental_booking_id uuid not null references public.rental_bookings(id) on delete cascade,
  phase public.rental_handover_phase not null,
  odometer_km integer check (odometer_km >= 0),
  fuel_level_percent integer check (fuel_level_percent between 0 and 100),
  has_damage boolean not null default false,
  damage_notes text,
  photos_urls jsonb not null default '[]'::jsonb,
  recorded_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_rental_handover_booking on public.rental_handover_events (rental_booking_id, phase);

drop trigger if exists trg_set_updated_at_rental_listings on public.rental_listings;
create trigger trg_set_updated_at_rental_listings
before update on public.rental_listings
for each row
execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_rental_bookings on public.rental_bookings;
create trigger trg_set_updated_at_rental_bookings
before update on public.rental_bookings
for each row
execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_rental_vehicle_documents on public.rental_vehicle_documents;
create trigger trg_set_updated_at_rental_vehicle_documents
before update on public.rental_vehicle_documents
for each row
execute function public.set_updated_at();

alter table public.rental_listings enable row level security;
alter table public.rental_vehicle_documents enable row level security;
alter table public.rental_bookings enable row level security;
alter table public.rental_handover_events enable row level security;

drop policy if exists "rental_listings_select" on public.rental_listings;
create policy "rental_listings_select"
on public.rental_listings for select
using (
  status = 'active'
  or owner_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'commercial', 'regional_manager', 'trainer')
  )
);

drop policy if exists "rental_listings_insert" on public.rental_listings;
create policy "rental_listings_insert"
on public.rental_listings for insert
with check (
  owner_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'partner', 'partner_manager', 'partner_operator', 'rental_owner')
  )
);

drop policy if exists "rental_listings_update" on public.rental_listings;
create policy "rental_listings_update"
on public.rental_listings for update
using (
  owner_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'partner', 'partner_manager', 'partner_operator', 'rental_owner')
  )
)
with check (
  owner_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'partner', 'partner_manager', 'partner_operator', 'rental_owner')
  )
);

drop policy if exists "rental_vehicle_documents_select" on public.rental_vehicle_documents;
create policy "rental_vehicle_documents_select"
on public.rental_vehicle_documents for select
using (
  exists (
    select 1
    from public.rental_listings rl
    where rl.id = listing_id
      and (
        rl.status = 'active'
        or rl.owner_profile_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('super_admin', 'admin', 'commercial', 'regional_manager', 'trainer')
        )
      )
  )
);

drop policy if exists "rental_vehicle_documents_manage" on public.rental_vehicle_documents;
create policy "rental_vehicle_documents_manage"
on public.rental_vehicle_documents for all
using (
  exists (
    select 1
    from public.rental_listings rl
    where rl.id = listing_id
      and (
        rl.owner_profile_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('super_admin', 'admin', 'partner', 'partner_manager', 'partner_operator', 'rental_owner')
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.rental_listings rl
    where rl.id = listing_id
      and (
        rl.owner_profile_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('super_admin', 'admin', 'partner', 'partner_manager', 'partner_operator', 'rental_owner')
        )
      )
  )
);

drop policy if exists "rental_bookings_select" on public.rental_bookings;
create policy "rental_bookings_select"
on public.rental_bookings for select
using (
  client_id = auth.uid()
  or owner_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'partner', 'partner_manager', 'partner_operator', 'rental_owner')
  )
);

drop policy if exists "rental_bookings_insert_client" on public.rental_bookings;
create policy "rental_bookings_insert_client"
on public.rental_bookings for insert
with check (
  client_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'partner', 'partner_manager', 'partner_operator', 'rental_owner')
  )
);

drop policy if exists "rental_bookings_update" on public.rental_bookings;
create policy "rental_bookings_update"
on public.rental_bookings for update
using (
  client_id = auth.uid()
  or owner_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'partner', 'partner_manager', 'partner_operator', 'rental_owner')
  )
)
with check (
  client_id = auth.uid()
  or owner_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'partner', 'partner_manager', 'partner_operator', 'rental_owner')
  )
);

drop policy if exists "rental_handover_select" on public.rental_handover_events;
create policy "rental_handover_select"
on public.rental_handover_events for select
using (
  exists (
    select 1
    from public.rental_bookings rb
    where rb.id = rental_booking_id
      and (
        rb.client_id = auth.uid()
        or rb.owner_profile_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('super_admin', 'admin', 'partner', 'partner_manager', 'partner_operator', 'rental_owner')
        )
      )
  )
);

drop policy if exists "rental_handover_insert" on public.rental_handover_events;
create policy "rental_handover_insert"
on public.rental_handover_events for insert
with check (
  exists (
    select 1
    from public.rental_bookings rb
    where rb.id = rental_booking_id
      and (
        rb.owner_profile_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('super_admin', 'admin', 'partner', 'partner_manager', 'partner_operator', 'rental_owner')
        )
      )
  )
);
