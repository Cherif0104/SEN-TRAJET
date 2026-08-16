-- Complète les objets utilisés par les écrans profil chauffeur et protège les pièces privées.
alter table public.profiles
  add column if not exists city text,
  add column if not exists is_verified boolean not null default false,
  add column if not exists average_rating numeric(3,2) not null default 0,
  add column if not exists total_reviews integer not null default 0;

alter table public.vehicles
  add column if not exists air_conditioning boolean not null default false,
  add column if not exists transport_vehicle_category text,
  add column if not exists service_class text not null default 'eco',
  add column if not exists vehicle_photo_urls jsonb not null default '{}'::jsonb;

create table if not exists public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  doc_type text not null check (doc_type in ('permis', 'carte_grise', 'assurance', 'photo_identite')),
  file_url text not null,
  status text not null default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (driver_id, doc_type)
);

create table if not exists public.driver_document_files (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  doc_type text not null check (doc_type in ('permis', 'carte_grise', 'assurance', 'photo_identite')),
  file_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.driver_notification_preferences (
  driver_id uuid primary key references public.profiles(id) on delete cascade,
  notify_new_requests boolean not null default true,
  notify_matching_trips boolean not null default true,
  max_notifications_per_day integer not null default 6 check (max_notifications_per_day between 1 and 30),
  digest_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists driver_document_files_driver_idx
  on public.driver_document_files(driver_id, doc_type, created_at desc);

alter table public.driver_documents enable row level security;
alter table public.driver_document_files enable row level security;
alter table public.driver_notification_preferences enable row level security;

drop policy if exists "vehicles_driver_manage_own" on public.vehicles;
create policy "vehicles_driver_manage_own"
on public.vehicles for all to authenticated
using (driver_id = auth.uid())
with check (driver_id = auth.uid());

drop policy if exists "driver_documents_own_or_internal" on public.driver_documents;
create policy "driver_documents_own_or_internal"
on public.driver_documents for all to authenticated
using (
  driver_id = auth.uid()
  or public.has_any_role(array['super_admin','manager','rh','ops']::public.app_role[])
)
with check (
  driver_id = auth.uid()
  or public.has_any_role(array['super_admin','manager','rh','ops']::public.app_role[])
);

drop policy if exists "driver_document_files_own_or_internal" on public.driver_document_files;
create policy "driver_document_files_own_or_internal"
on public.driver_document_files for all to authenticated
using (
  driver_id = auth.uid()
  or public.has_any_role(array['super_admin','manager','rh','ops']::public.app_role[])
)
with check (
  driver_id = auth.uid()
  or public.has_any_role(array['super_admin','manager','rh','ops']::public.app_role[])
);

drop policy if exists "driver_notification_preferences_own" on public.driver_notification_preferences;
create policy "driver_notification_preferences_own"
on public.driver_notification_preferences for all to authenticated
using (driver_id = auth.uid())
with check (driver_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('account-media', 'account-media', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('driver-documents', 'driver-documents', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "account_media_public_read" on storage.objects;
create policy "account_media_public_read"
on storage.objects for select
using (bucket_id = 'account-media');

drop policy if exists "account_media_insert_own" on storage.objects;
create policy "account_media_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'account-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "account_media_update_own" on storage.objects;
create policy "account_media_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'account-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "account_media_delete_own" on storage.objects;
create policy "account_media_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'account-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "driver_documents_read_authorized" on storage.objects;
create policy "driver_documents_read_authorized"
on storage.objects for select to authenticated
using (
  bucket_id = 'driver-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_any_role(array['super_admin','manager','rh','ops']::public.app_role[])
  )
);

drop policy if exists "driver_documents_insert_own" on storage.objects;
create policy "driver_documents_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'driver-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "driver_documents_delete_own_or_internal" on storage.objects;
create policy "driver_documents_delete_own_or_internal"
on storage.objects for delete to authenticated
using (
  bucket_id = 'driver-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_any_role(array['super_admin','manager','rh','ops']::public.app_role[])
  )
);
