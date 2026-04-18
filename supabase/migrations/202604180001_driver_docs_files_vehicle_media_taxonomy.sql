-- Fichiers multiples par type de document chauffeur + photos véhicule + taxonomie transport / classe de service

-- 1) Pièces jointes documents (plusieurs photos / PDF par type)
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

-- Rétrocompat : copier les URL existantes vers la table des fichiers
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

-- 2) Véhicule : taxonomie alignée sur public.transport_vehicle_category / service_class_level + galerie photos
alter table public.vehicles
  add column if not exists transport_vehicle_category public.transport_vehicle_category,
  add column if not exists service_class public.service_class_level not null default 'eco',
  add column if not exists vehicle_photo_urls jsonb not null default '{}'::jsonb;

-- Déduire le type transport à partir des places (même logique que rental_listings)
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

-- Utilitaire : type transport par défaut (places variables)
update public.vehicles v
set transport_vehicle_category = 'suv_berline'::public.transport_vehicle_category
where v.category::text = 'utilitaire';

alter table public.vehicles
  alter column transport_vehicle_category set not null;

-- Mapper l’ancienne colonne category vers service_class (une passe, sans condition fragile)
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
