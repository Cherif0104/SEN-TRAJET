-- SentraJet OS foundations: matricules, CRM activities, partner orgs funnel, audit helper
-- Charte produit: un seul CRM maître — pas d'ERP offert aux partenaires

-- ——— 1) Matricule client ———
alter table public.clients
  add column if not exists matricule text,
  add column if not exists whatsapp text,
  add column if not exists address text,
  add column if not exists first_name text,
  add column if not exists last_name text;

create sequence if not exists public.client_matricule_seq start 1;

create or replace function public.next_client_matricule()
returns text
language plpgsql
as $$
declare
  n bigint;
begin
  n := nextval('public.client_matricule_seq');
  return 'SJP-CL-' || lpad(n::text, 6, '0');
end;
$$;

create or replace function public.clients_assign_matricule()
returns trigger
language plpgsql
as $$
begin
  if new.matricule is null or btrim(new.matricule) = '' then
    new.matricule := public.next_client_matricule();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clients_assign_matricule on public.clients;
create trigger trg_clients_assign_matricule
  before insert on public.clients
  for each row execute function public.clients_assign_matricule();

create unique index if not exists clients_matricule_uidx on public.clients (matricule);

-- Backfill existing clients
update public.clients
set matricule = public.next_client_matricule()
where matricule is null;

-- ——— 2) CRM activities (maître) ———
create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  partner_org_id uuid,
  lead_id uuid references public.leads(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  channel text not null default 'autre'
    check (channel in ('appel','whatsapp','email','visite','formulaire','autre')),
  direction text not null default 'inbound'
    check (direction in ('inbound','outbound','internal')),
  motif text not null default 'autre',
  subject text,
  message text,
  handled_by uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  next_action_at timestamptz,
  next_action_label text,
  next_action_assignee uuid references auth.users(id) on delete set null,
  status text not null default 'open'
    check (status in ('open','done','cancelled')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_activities_client_idx on public.crm_activities (client_id, occurred_at desc);
create index if not exists crm_activities_next_action_idx on public.crm_activities (next_action_at)
  where status = 'open' and next_action_at is not null;
create index if not exists crm_activities_handler_idx on public.crm_activities (handled_by, occurred_at desc);

alter table public.crm_activities enable row level security;

drop policy if exists crm_activities_staff on public.crm_activities;
create policy crm_activities_staff on public.crm_activities
  for all to authenticated
  using (public.has_any_role(array['super_admin','manager','commercial','ops','finance','rh']::public.app_role[]))
  with check (public.has_any_role(array['super_admin','manager','commercial','ops','finance','rh']::public.app_role[]));

-- ——— 3) Partner organizations (commercial B2B) ———
create table if not exists public.partner_organizations (
  id uuid primary key default gen_random_uuid(),
  matricule text unique,
  relation_kind text not null default 'commercial'
    check (relation_kind in ('commercial','owner_investor','mixed')),
  category text not null default 'other'
    check (category in ('hotel','conciergerie','travel_agency','enterprise','other')),
  certification_status text not null default 'prospect'
    check (certification_status in (
      'prospect','diagnostic','en_verification','approuve',
      'contrat_en_attente','actif','suspendu','archive'
    )),
  legal_name text not null,
  trade_name text,
  primary_contact_name text,
  primary_contact_phone text,
  primary_contact_email text,
  city text,
  country text not null default 'SN',
  user_id uuid references auth.users(id) on delete set null,
  partner_contract_id uuid references public.partner_contracts(id) on delete set null,
  diagnostic jsonb not null default '{}'::jsonb,
  notes text,
  certified_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.partner_org_matricule_seq start 1;

create or replace function public.next_partner_org_matricule()
returns text
language plpgsql
as $$
declare n bigint;
begin
  n := nextval('public.partner_org_matricule_seq');
  return 'SJP-PT-' || lpad(n::text, 6, '0');
end;
$$;

create or replace function public.partner_org_assign_matricule()
returns trigger
language plpgsql
as $$
begin
  if new.matricule is null or btrim(new.matricule) = '' then
    new.matricule := public.next_partner_org_matricule();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_partner_org_assign_matricule on public.partner_organizations;
create trigger trg_partner_org_assign_matricule
  before insert on public.partner_organizations
  for each row execute function public.partner_org_assign_matricule();

-- Compte Auth partenaire seulement si ACTIF (garde-fou)
create or replace function public.partner_org_guard_user_link()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is not null and new.certification_status <> 'actif' then
    raise exception 'Un compte Auth partenaire ne peut être lié que si certification_status = actif';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_partner_org_guard_user on public.partner_organizations;
create trigger trg_partner_org_guard_user
  before insert or update on public.partner_organizations
  for each row execute function public.partner_org_guard_user_link();

create index if not exists partner_org_status_idx on public.partner_organizations (certification_status);
create index if not exists partner_org_category_idx on public.partner_organizations (category);

alter table public.partner_organizations enable row level security;

drop policy if exists partner_org_staff on public.partner_organizations;
create policy partner_org_staff on public.partner_organizations
  for all to authenticated
  using (public.has_any_role(array['super_admin','manager','commercial','ops','finance']::public.app_role[]))
  with check (public.has_any_role(array['super_admin','manager','commercial','ops','finance']::public.app_role[]));

-- Partenaire certifié : lecture de SA fiche uniquement
drop policy if exists partner_org_self_read on public.partner_organizations;
create policy partner_org_self_read on public.partner_organizations
  for select to authenticated
  using (user_id = auth.uid() and certification_status = 'actif');

-- FK crm_activities → partner_org (après création table)
do $$ begin
  alter table public.crm_activities
    drop constraint if exists crm_activities_partner_org_id_fkey;
  alter table public.crm_activities
    add constraint crm_activities_partner_org_id_fkey
    foreign key (partner_org_id) references public.partner_organizations(id) on delete set null;
exception when others then null;
end $$;

-- ——— 4) Matricule propriétaire (actif / investisseur) ———
alter table public.vehicle_owners
  add column if not exists matricule text,
  add column if not exists relation_subtype text
    check (relation_subtype is null or relation_subtype in (
      'vehicle_owner','lessor','investor','shareholder','revenue_share'
    ));

create sequence if not exists public.owner_matricule_seq start 1;

create or replace function public.next_owner_matricule()
returns text
language plpgsql
as $$
declare n bigint;
begin
  n := nextval('public.owner_matricule_seq');
  return 'SJP-OW-' || lpad(n::text, 6, '0');
end;
$$;

create or replace function public.owners_assign_matricule()
returns trigger
language plpgsql
as $$
begin
  if new.matricule is null or btrim(new.matricule) = '' then
    new.matricule := public.next_owner_matricule();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_owners_assign_matricule on public.vehicle_owners;
create trigger trg_owners_assign_matricule
  before insert on public.vehicle_owners
  for each row execute function public.owners_assign_matricule();

create unique index if not exists vehicle_owners_matricule_uidx on public.vehicle_owners (matricule);

update public.vehicle_owners
set matricule = public.next_owner_matricule()
where matricule is null;

-- ——— 5) Finance accounts (squelette — distinct des users) ———
create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  account_kind text not null
    check (account_kind in ('bank','cash','partner','supplier','clearing','other')),
  currency text not null default 'XOF',
  partner_org_id uuid references public.partner_organizations(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.finance_accounts enable row level security;
drop policy if exists finance_accounts_staff on public.finance_accounts;
create policy finance_accounts_staff on public.finance_accounts
  for all to authenticated
  using (public.has_any_role(array['super_admin','manager','finance','ops']::public.app_role[]))
  with check (public.has_any_role(array['super_admin','manager','finance','ops']::public.app_role[]));

-- ——— 6) Audit helper ———
create or replace function public.write_audit_log(
  p_action text,
  p_entity text,
  p_entity_id text default null,
  p_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.audit_logs (actor_user_id, action, entity, entity_id, meta)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_meta, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.write_audit_log from public;
grant execute on function public.write_audit_log to authenticated;

alter table public.audit_logs enable row level security;
drop policy if exists audit_logs_staff_read on public.audit_logs;
create policy audit_logs_staff_read on public.audit_logs
  for select to authenticated
  using (public.has_any_role(array['super_admin','manager','ops','finance','rh']::public.app_role[]));

drop policy if exists audit_logs_staff_insert on public.audit_logs;
create policy audit_logs_staff_insert on public.audit_logs
  for insert to authenticated
  with check (actor_user_id = auth.uid() or public.has_any_role(array['super_admin','manager','ops']::public.app_role[]));

-- Snapshot tarif sur bookings (charte §21)
alter table public.bookings
  add column if not exists tariff_version_code text,
  add column if not exists client_matricule_snapshot text;

grant select, insert, update on public.crm_activities to authenticated;
grant select, insert, update on public.partner_organizations to authenticated;
grant select on public.finance_accounts to authenticated;
