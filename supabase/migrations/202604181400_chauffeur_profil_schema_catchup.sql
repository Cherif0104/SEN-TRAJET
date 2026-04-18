-- Idempotent catch-up for projets Supabase où les migrations 120001 / 160001 / 170004 / 180001
-- n’ont pas toutes été appliquées (erreurs PostgREST PGRST204 / PGRST205 / 404 REST).

-- Enums requis par public.vehicles (202604180001)
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

-- Compliance (202604120001 extrait)
do $$
begin
  create type public.compliance_status as enum ('pending', 'approved', 'rejected', 'expired');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.driver_compliance_checks (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  check_type text not null,
  status public.compliance_status not null default 'pending',
  due_at timestamptz not null,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- Préférences notifications chauffeur (202604160001 extrait)
create table if not exists public.driver_notification_preferences (
  driver_id uuid primary key references public.profiles(id) on delete cascade,
  notify_new_requests boolean not null default true,
  notify_matching_trips boolean not null default true,
  max_notifications_per_day integer not null default 6 check (max_notifications_per_day between 1 and 30),
  digest_enabled boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.driver_notification_preferences enable row level security;

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

-- Fichiers documents + colonnes véhicules (202604180001)
create table if not exists public.driver_document_files (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  doc_type text not null,
  file_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint driver_document_files_doc_type_chk check (
    doc_type in ('permis', 'carte_grise', 'assurance', 'photo_identite')
  )
);

create index if not exists idx_driver_document_files_driver_doc
  on public.driver_document_files(driver_id, doc_type, created_at desc);

alter table public.driver_document_files enable row level security;

drop policy if exists "driver_document_files_select_own" on public.driver_document_files;
create policy "driver_document_files_select_own"
  on public.driver_document_files for select to authenticated
  using (driver_id = auth.uid());

drop policy if exists "driver_document_files_insert_own" on public.driver_document_files;
create policy "driver_document_files_insert_own"
  on public.driver_document_files for insert to authenticated
  with check (driver_id = auth.uid());

drop policy if exists "driver_document_files_delete_own" on public.driver_document_files;
create policy "driver_document_files_delete_own"
  on public.driver_document_files for delete to authenticated
  using (driver_id = auth.uid());

insert into public.driver_document_files (driver_id, doc_type, file_url)
select d.driver_id, d.doc_type::text, d.file_url
from public.driver_documents d
where d.file_url is not null
  and trim(d.file_url) <> ''
  and not exists (
    select 1
    from public.driver_document_files f
    where f.driver_id = d.driver_id
      and f.doc_type = d.doc_type::text
      and f.file_url = d.file_url
  );

alter table public.vehicles
  add column if not exists transport_vehicle_category public.transport_vehicle_category,
  add column if not exists service_class public.service_class_level not null default 'eco',
  add column if not exists vehicle_photo_urls jsonb not null default '{}'::jsonb;

update public.vehicles v
set transport_vehicle_category = case
  when v.seats is null or v.seats <= 0 then 'citadine'::public.transport_vehicle_category
  when v.seats <= 4 then 'citadine'::public.transport_vehicle_category
  when v.seats <= 6 then 'suv_berline'::public.transport_vehicle_category
  when v.seats <= 7 then 'familiale'::public.transport_vehicle_category
  when v.seats <= 15 then 'minivan'::public.transport_vehicle_category
  when v.seats <= 30 then 'minibus'::public.transport_vehicle_category
  else 'bus'::public.transport_vehicle_category
end
where v.transport_vehicle_category is null;

update public.vehicles v
set transport_vehicle_category = 'suv_berline'::public.transport_vehicle_category
where v.category::text = 'utilitaire'
  and v.transport_vehicle_category is null;

alter table public.vehicles
  alter column transport_vehicle_category set not null;

update public.vehicles v
set service_class = case v.category::text
  when 'standard' then 'eco'::public.service_class_level
  when 'confort' then 'confort'::public.service_class_level
  when 'premium' then 'confort_plus'::public.service_class_level
  when 'utilitaire' then 'eco'::public.service_class_level
  else 'eco'::public.service_class_level
end;

comment on column public.vehicles.vehicle_photo_urls is 'JSON: clé = slot photo (exterior_front, …), valeur = tableau d’URLs (plusieurs prises possibles).';
comment on column public.driver_document_files.file_url is 'URL publique Storage (bucket documents).';
