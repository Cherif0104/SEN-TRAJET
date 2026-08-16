-- Socle transversal des fiches 360. Les tables métier existantes restent les sources
-- de vérité ; ces objets ajoutent suivi, documents, contrats, dossiers et finance.

alter type public.app_role add value if not exists 'asset_partner';

alter table public.vehicle_owners
  add column if not exists partner_kind text not null default 'asset_owner'
    check (partner_kind in ('asset_owner','bank','lessor','hire_purchase','shareholder','investor','other')),
  add column if not exists address text,
  add column if not exists notes text,
  add column if not exists committed_amount_fcfa numeric(14,2)
    check (committed_amount_fcfa is null or committed_amount_fcfa >= 0);

create table if not exists public.entity_timeline (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in ('client','provider','asset_partner','driver','vehicle')),
  entity_id uuid not null,
  event_type text not null default 'note',
  title text not null,
  description text,
  occurred_at timestamptz not null default now(),
  actor_id uuid references public.profiles(id) on delete set null default auth.uid(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.entity_cases (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in ('client','provider','asset_partner','driver','vehicle')),
  entity_id uuid not null,
  case_type text not null default 'follow_up',
  title text not null,
  description text,
  priority text not null default 'normal'
    check (priority in ('low','normal','high','critical')),
  status text not null default 'open'
    check (status in ('open','in_progress','blocked','resolved','closed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  resolved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entity_contracts (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in ('client','provider','asset_partner','driver','vehicle')),
  entity_id uuid not null,
  contract_number text not null,
  contract_type text not null,
  status text not null default 'draft'
    check (status in ('draft','pending_signature','active','suspended','expired','terminated','renewed')),
  start_date date,
  end_date date,
  amount_fcfa numeric(14,2) check (amount_fcfa is null or amount_fcfa >= 0),
  billing_frequency text,
  terms_summary text,
  document_path text,
  supersedes_id uuid references public.entity_contracts(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id, contract_number)
);

create table if not exists public.entity_documents (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in ('client','provider','asset_partner','driver','vehicle')),
  entity_id uuid not null,
  document_type text not null,
  name text not null,
  storage_path text not null,
  mime_type text,
  status text not null default 'valid'
    check (status in ('pending','valid','expired','rejected','archived')),
  issued_at date,
  expires_at date,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.entity_financial_records (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in ('client','provider','asset_partner','driver','vehicle')),
  entity_id uuid not null,
  record_type text not null
    check (record_type in ('invoice','payment','credit_note','commission','rent','loan_installment','investment','expense')),
  reference text not null,
  label text,
  amount_fcfa numeric(14,2) not null check (amount_fcfa >= 0),
  status text not null default 'pending'
    check (status in ('draft','pending','due','partially_paid','paid','overdue','cancelled')),
  issue_date date not null default current_date,
  due_date date,
  paid_at timestamptz,
  related_booking_id uuid references public.bookings(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id, reference)
);

create table if not exists public.vehicle_maintenance_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  maintenance_type text not null,
  title text not null,
  status text not null default 'planned'
    check (status in ('planned','scheduled','in_progress','completed','cancelled')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  odometer_km integer check (odometer_km is null or odometer_km >= 0),
  cost_fcfa numeric(14,2) check (cost_fcfa is null or cost_fcfa >= 0),
  service_provider text,
  notes text,
  next_due_at timestamptz,
  next_due_odometer_km integer check (next_due_odometer_km is null or next_due_odometer_km >= 0),
  document_path text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entity_timeline_entity_date_idx
  on public.entity_timeline(entity_type, entity_id, occurred_at desc);
create index if not exists entity_cases_entity_status_idx
  on public.entity_cases(entity_type, entity_id, status, due_at);
create index if not exists entity_contracts_entity_status_idx
  on public.entity_contracts(entity_type, entity_id, status, end_date);
create index if not exists entity_documents_entity_expiry_idx
  on public.entity_documents(entity_type, entity_id, expires_at);
create index if not exists entity_financial_entity_status_idx
  on public.entity_financial_records(entity_type, entity_id, status, due_date);
create index if not exists vehicle_maintenance_vehicle_date_idx
  on public.vehicle_maintenance_records(vehicle_id, scheduled_at desc);

alter table public.entity_timeline enable row level security;
alter table public.entity_cases enable row level security;
alter table public.entity_contracts enable row level security;
alter table public.entity_documents enable row level security;
alter table public.entity_financial_records enable row level security;
alter table public.vehicle_maintenance_records enable row level security;

grant select, insert, update, delete on
  public.entity_timeline,
  public.entity_cases,
  public.entity_contracts,
  public.entity_documents,
  public.entity_financial_records,
  public.vehicle_maintenance_records
to authenticated;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'entity_timeline',
    'entity_cases',
    'entity_contracts',
    'entity_documents',
    'entity_financial_records',
    'vehicle_maintenance_records'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', target_table || '_staff', target_table);
    execute format(
      'create policy %I on public.%I for all to authenticated using (
        public.has_any_role(array[''super_admin'',''manager'',''commercial'',''ops'',''finance'',''rh'',''fleet_manager'']::public.app_role[])
      ) with check (
        public.has_any_role(array[''super_admin'',''manager'',''commercial'',''ops'',''finance'',''rh'',''fleet_manager'']::public.app_role[])
      )',
      target_table || '_staff',
      target_table
    );
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entity-documents',
  'entity-documents',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "entity_documents_staff_select" on storage.objects;
create policy "entity_documents_staff_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'entity-documents'
  and public.has_any_role(
    array['super_admin','manager','commercial','ops','finance','rh','fleet_manager']::public.app_role[]
  )
);

drop policy if exists "entity_documents_staff_insert" on storage.objects;
create policy "entity_documents_staff_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'entity-documents'
  and public.has_any_role(
    array['super_admin','manager','commercial','ops','finance','rh','fleet_manager']::public.app_role[]
  )
);

drop policy if exists "entity_documents_staff_update" on storage.objects;
create policy "entity_documents_staff_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'entity-documents'
  and public.has_any_role(
    array['super_admin','manager','commercial','ops','finance','rh','fleet_manager']::public.app_role[]
  )
)
with check (
  bucket_id = 'entity-documents'
  and public.has_any_role(
    array['super_admin','manager','commercial','ops','finance','rh','fleet_manager']::public.app_role[]
  )
);

drop policy if exists "entity_documents_staff_delete" on storage.objects;
create policy "entity_documents_staff_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'entity-documents'
  and public.has_any_role(
    array['super_admin','manager','commercial','ops','finance','rh','fleet_manager']::public.app_role[]
  )
);
