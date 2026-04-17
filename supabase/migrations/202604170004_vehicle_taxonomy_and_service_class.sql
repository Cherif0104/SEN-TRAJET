-- Taxonomie vehicules + classes de service (normalisation metier)

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'transport_vehicle_category'
  ) then
    create type public.transport_vehicle_category as enum (
      'citadine',
      'suv_berline',
      'familiale',
      'minivan',
      'minibus',
      'bus'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'service_class_level'
  ) then
    create type public.service_class_level as enum (
      'eco',
      'confort',
      'confort_plus',
      'premium',
      'premium_plus'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'rental_mode'
  ) then
    create type public.rental_mode as enum (
      'with_driver',
      'without_driver'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'eligibility_status'
  ) then
    create type public.eligibility_status as enum (
      'pending_review',
      'eligible',
      'not_eligible'
    );
  end if;
end $$;

create table if not exists public.vehicle_category_profiles (
  category public.transport_vehicle_category primary key,
  label text not null,
  min_passengers integer not null check (min_passengers >= 1),
  max_passengers integer not null check (max_passengers >= min_passengers),
  typical_usage text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.service_class_eligibility_rules (
  service_class public.service_class_level primary key,
  min_vehicle_year integer not null check (min_vehicle_year between 1990 and 2100),
  requires_air_conditioning boolean not null default false,
  requires_cleanliness_review boolean not null default true,
  requires_safety_review boolean not null default true,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.vehicle_category_profiles (
  category,
  label,
  min_passengers,
  max_passengers,
  typical_usage
)
values
  ('citadine', 'Citadine', 1, 4, 'Ville, trajets courts'),
  ('suv_berline', 'SUV / Berline', 4, 6, 'Confort urbain/interurbain'),
  ('familiale', 'Familiale', 5, 7, 'Familles et deplacements moyens'),
  ('minivan', 'Minivan', 7, 15, 'Groupes, navettes'),
  ('minibus', 'Minibus', 16, 30, 'Transport collectif organise'),
  ('bus', 'Bus', 30, 60, 'Grandes distances, volume eleve')
on conflict (category) do update
set label = excluded.label,
    min_passengers = excluded.min_passengers,
    max_passengers = excluded.max_passengers,
    typical_usage = excluded.typical_usage,
    active = true,
    updated_at = timezone('utc', now());

insert into public.service_class_eligibility_rules (
  service_class,
  min_vehicle_year,
  requires_air_conditioning,
  notes
)
values
  ('eco', 2010, false, 'Classe accessible, securite obligatoire, climatisation recommandee'),
  ('confort', 2015, true, 'Classe standard fiable'),
  ('confort_plus', 2018, true, 'Classe semi-premium avec exigences esthetiques'),
  ('premium', 2020, true, 'Classe haut de gamme'),
  ('premium_plus', 2022, true, 'Classe VIP')
on conflict (service_class) do update
set min_vehicle_year = excluded.min_vehicle_year,
    requires_air_conditioning = excluded.requires_air_conditioning,
    notes = excluded.notes,
    active = true,
    updated_at = timezone('utc', now());

alter table public.rental_listings
  add column if not exists transport_vehicle_category public.transport_vehicle_category,
  add column if not exists service_class public.service_class_level not null default 'eco',
  add column if not exists rental_mode public.rental_mode not null default 'with_driver',
  add column if not exists eligibility_status public.eligibility_status not null default 'pending_review',
  add column if not exists compliance_score integer not null default 0 check (compliance_score between 0 and 100),
  add column if not exists class_validated_at timestamptz,
  add column if not exists class_validated_by uuid references public.profiles(id) on delete set null;

update public.rental_listings
set transport_vehicle_category = case
  when seats <= 4 then 'citadine'::public.transport_vehicle_category
  when seats <= 6 then 'suv_berline'::public.transport_vehicle_category
  when seats <= 7 then 'familiale'::public.transport_vehicle_category
  when seats <= 15 then 'minivan'::public.transport_vehicle_category
  when seats <= 30 then 'minibus'::public.transport_vehicle_category
  else 'bus'::public.transport_vehicle_category
end
where transport_vehicle_category is null;

alter table public.rental_listings
  alter column transport_vehicle_category set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rental_listings_category_capacity_chk'
  ) then
    alter table public.rental_listings
      add constraint rental_listings_category_capacity_chk
      check (
        (transport_vehicle_category = 'citadine' and seats between 1 and 4)
        or (transport_vehicle_category = 'suv_berline' and seats between 4 and 6)
        or (transport_vehicle_category = 'familiale' and seats between 5 and 7)
        or (transport_vehicle_category = 'minivan' and seats between 7 and 15)
        or (transport_vehicle_category = 'minibus' and seats between 16 and 30)
        or (transport_vehicle_category = 'bus' and seats between 30 and 60)
      ) not valid;
  end if;
end $$;

alter table public.trip_requests
  add column if not exists requested_vehicle_category public.transport_vehicle_category,
  add column if not exists requested_service_class public.service_class_level;

create index if not exists idx_rental_listings_transport_vehicle_category
  on public.rental_listings(transport_vehicle_category);

create index if not exists idx_rental_listings_service_class
  on public.rental_listings(service_class);

create index if not exists idx_trip_requests_requested_vehicle_category
  on public.trip_requests(requested_vehicle_category)
  where requested_vehicle_category is not null;

create index if not exists idx_trip_requests_requested_service_class
  on public.trip_requests(requested_service_class)
  where requested_service_class is not null;
