-- Commercial operations foundation: driver KYC, admin review, catalog,
-- notifications and organization membership.

alter table public.driver_profiles
  add column if not exists onboarding_status text not null default 'incomplete'
    check (onboarding_status in ('incomplete', 'submitted', 'approved', 'rejected')),
  add column if not exists birth_date date,
  add column if not exists address text,
  add column if not exists years_experience integer
    check (years_experience between 0 and 60),
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists review_notes text,
  add column if not exists rejection_reason text;

create table public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.driver_profiles(id) on delete cascade,
  kind text not null check (
    kind in (
      'identity',
      'driver_license',
      'vehicle_registration',
      'vehicle_insurance',
      'profile_photo',
      'vehicle_photo'
    )
  ),
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
  ),
  file_size integer not null check (file_size > 0 and file_size <= 10485760),
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (driver_id, kind)
);

create index driver_documents_driver_status_idx
  on public.driver_documents(driver_id, status);
create index driver_profiles_onboarding_queue_idx
  on public.driver_profiles(onboarding_status, submitted_at)
  where onboarding_status = 'submitted';

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;

create table public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  slug public.service_type not null unique,
  title text not null,
  subtitle text not null,
  badge text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.service_catalog (slug, title, subtitle, badge, sort_order)
values
  ('ride', 'Commander une course', 'Maintenant ou plus tard', 'Chauffeur en direct', 10),
  ('airport', 'Taxi AIBD', 'Vers ou depuis l’aéroport', 'Transfert premium', 20),
  ('delivery', 'Livraison', 'Moto, voiture ou cargo', 'Suivi en direct', 30)
on conflict (slug) do update
set title = excluded.title,
    subtitle = excluded.subtitle,
    badge = excluded.badge,
    sort_order = excluded.sort_order,
    updated_at = now();

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (
    kind in ('sentrajet', 'fleet_partner', 'hotel', 'concierge', 'restaurant', 'agency')
  ),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'dispatcher', 'agent')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_idx
  on public.organization_members(user_id, organization_id);

create or replace function private.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
  ) or private.is_admin();
$$;

create or replace function public.protect_vehicle_verification()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
begin
  if not private.is_admin() then
    if tg_op = 'INSERT' then
      new.is_verified := false;
    elsif new.is_verified is distinct from old.is_verified then
      raise exception 'vehicle_verification_admin_only' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_vehicle_verification_trigger on public.vehicles;
create trigger protect_vehicle_verification_trigger
before insert or update on public.vehicles
for each row execute function public.protect_vehicle_verification();

create or replace function public.save_driver_onboarding(
  p_license_number text,
  p_birth_date date,
  p_address text,
  p_years_experience integer,
  p_services text[],
  p_ride_class text,
  p_brand text,
  p_model text,
  p_plate text,
  p_color text,
  p_seats integer
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_driver public.driver_profiles%rowtype;
  v_vehicle_id uuid;
  v_services public.service_type[];
begin
  select * into v_driver
  from public.driver_profiles
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'driver_profile_required' using errcode = '42501';
  end if;
  if v_driver.status = 'approved' then
    raise exception 'approved_profile_locked' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_license_number, ''))) < 4
     or length(trim(coalesce(p_address, ''))) < 5
     or p_birth_date is null
     or p_birth_date > current_date - interval '18 years'
     or p_years_experience not between 0 and 60
     or p_seats not between 1 and 60
     or length(trim(coalesce(p_brand, ''))) < 2
     or length(trim(coalesce(p_model, ''))) < 1
     or length(trim(coalesce(p_plate, ''))) < 3 then
    raise exception 'invalid_driver_onboarding_data';
  end if;

  begin
    v_services := p_services::public.service_type[];
  exception when others then
    raise exception 'invalid_driver_services';
  end;
  if cardinality(v_services) = 0 then
    raise exception 'driver_service_required';
  end if;

  update public.driver_profiles
  set license_number = left(trim(p_license_number), 80),
      birth_date = p_birth_date,
      address = left(trim(p_address), 300),
      years_experience = p_years_experience,
      accepted_services = v_services,
      onboarding_status = case
        when onboarding_status = 'rejected' then 'incomplete'
        else onboarding_status
      end,
      rejection_reason = null,
      updated_at = now()
  where id = v_driver.id;

  select id into v_vehicle_id
  from public.vehicles
  where driver_id = v_driver.id
  order by created_at
  limit 1;

  if v_vehicle_id is null then
    insert into public.vehicles (
      driver_id, ride_class, brand, model, plate, color, seats, is_verified
    )
    values (
      v_driver.id,
      p_ride_class::public.ride_class,
      left(trim(p_brand), 80),
      left(trim(p_model), 80),
      upper(left(trim(p_plate), 30)),
      left(trim(p_color), 50),
      p_seats,
      false
    )
    returning id into v_vehicle_id;
  else
    update public.vehicles
    set ride_class = p_ride_class::public.ride_class,
        brand = left(trim(p_brand), 80),
        model = left(trim(p_model), 80),
        plate = upper(left(trim(p_plate), 30)),
        color = left(trim(p_color), 50),
        seats = p_seats,
        is_verified = false
    where id = v_vehicle_id;
  end if;

  return v_vehicle_id;
end;
$$;

create or replace function public.submit_driver_onboarding()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_driver public.driver_profiles%rowtype;
  v_required_documents integer;
begin
  select * into v_driver
  from public.driver_profiles
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'driver_profile_required' using errcode = '42501';
  end if;
  if v_driver.license_number is null
     or v_driver.birth_date is null
     or v_driver.address is null
     or v_driver.years_experience is null
     or not exists (select 1 from public.vehicles where driver_id = v_driver.id) then
    raise exception 'driver_information_incomplete';
  end if;

  select count(distinct kind) into v_required_documents
  from public.driver_documents
  where driver_id = v_driver.id
    and kind in ('identity', 'driver_license', 'vehicle_registration', 'vehicle_insurance');

  if v_required_documents <> 4 then
    raise exception 'required_documents_missing';
  end if;

  update public.driver_documents
  set status = 'submitted',
      rejection_reason = null,
      updated_at = now()
  where driver_id = v_driver.id;

  update public.driver_profiles
  set status = 'pending',
      onboarding_status = 'submitted',
      submitted_at = now(),
      reviewed_at = null,
      reviewed_by = null,
      review_notes = null,
      rejection_reason = null,
      is_online = false,
      updated_at = now()
  where id = v_driver.id;

  return v_driver.id;
end;
$$;

create or replace function public.admin_review_driver(
  p_driver_id uuid,
  p_action text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_driver public.driver_profiles%rowtype;
begin
  if not private.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_action not in ('approve', 'reject', 'suspend') then
    raise exception 'invalid_review_action';
  end if;

  select * into v_driver
  from public.driver_profiles
  where id = p_driver_id
  for update;
  if not found then raise exception 'driver_not_found'; end if;
  if p_action = 'approve' and v_driver.onboarding_status <> 'submitted' then
    raise exception 'submitted_application_required';
  end if;
  if p_action in ('reject', 'suspend') and length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'review_reason_required';
  end if;

  update public.driver_profiles
  set status = case p_action
        when 'approve' then 'approved'::public.driver_status
        when 'reject' then 'rejected'::public.driver_status
        else 'suspended'::public.driver_status
      end,
      onboarding_status = case p_action
        when 'approve' then 'approved'
        when 'reject' then 'rejected'
        else onboarding_status
      end,
      verified_at = case when p_action = 'approve' then now() else null end,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_notes = left(trim(p_reason), 1000),
      rejection_reason = case when p_action = 'reject' then left(trim(p_reason), 1000) else null end,
      is_online = false,
      updated_at = now()
  where id = p_driver_id;

  update public.vehicles
  set is_verified = (p_action = 'approve')
  where driver_id = p_driver_id;

  update public.driver_documents
  set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
      rejection_reason = case when p_action = 'approve' then null else left(trim(p_reason), 1000) end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where driver_id = p_driver_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_driver.user_id,
    'driver_review',
    case
      when p_action = 'approve' then 'Votre espace chauffeur est activé'
      when p_action = 'reject' then 'Votre dossier doit être complété'
      else 'Votre espace chauffeur est suspendu'
    end,
    case
      when p_action = 'approve' then 'Vous pouvez désormais vous mettre en ligne et recevoir des courses.'
      else coalesce(nullif(trim(p_reason), ''), 'Contactez l’équipe SentraJet pour plus d’informations.')
    end,
    jsonb_build_object('driver_id', p_driver_id, 'action', p_action)
  );
end;
$$;

alter table public.driver_documents enable row level security;
alter table public.notifications enable row level security;
alter table public.service_catalog enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy driver_documents_select on public.driver_documents
for select to authenticated using (
  private.is_driver_owner(driver_id) or private.is_admin()
);
create policy driver_documents_insert on public.driver_documents
for insert to authenticated with check (
  private.is_driver_owner(driver_id)
  and status = 'draft'
  and reviewed_by is null
);
create policy driver_documents_delete_draft on public.driver_documents
for delete to authenticated using (
  private.is_driver_owner(driver_id)
  and status in ('draft', 'rejected')
);

create policy notifications_select_own on public.notifications
for select to authenticated using (user_id = auth.uid() or private.is_admin());
create policy notifications_update_own on public.notifications
for update to authenticated using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy service_catalog_public_read on public.service_catalog
for select to anon, authenticated using (is_active);
create policy service_catalog_admin_read on public.service_catalog
for select to authenticated using (private.is_admin());
create policy service_catalog_admin_all on public.service_catalog
for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy organizations_member_read on public.organizations
for select to authenticated using (private.is_organization_member(id));
create policy organizations_admin_all on public.organizations
for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy organization_members_read on public.organization_members
for select to authenticated using (
  user_id = auth.uid()
  or private.is_organization_member(organization_id)
);
create policy organization_members_admin_all on public.organization_members
for all to authenticated using (private.is_admin()) with check (private.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sentrajet-driver-documents',
  'sentrajet-driver-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy sentrajet_driver_docs_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'sentrajet-driver-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy sentrajet_driver_docs_select on storage.objects
for select to authenticated using (
  bucket_id = 'sentrajet-driver-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or private.is_admin()
  )
);
create policy sentrajet_driver_docs_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'sentrajet-driver-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

grant select, insert, delete on public.driver_documents to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.service_catalog to anon, authenticated;
grant insert, update, delete on public.service_catalog to authenticated;
grant select on public.organizations, public.organization_members to authenticated;
grant insert, update, delete on public.organizations, public.organization_members to authenticated;

revoke all on function public.protect_vehicle_verification() from public, anon, authenticated;
revoke all on function private.is_organization_member(uuid) from public, anon, authenticated;
revoke all on function public.save_driver_onboarding(text, date, text, integer, text[], text, text, text, text, text, integer) from public, anon;
revoke all on function public.submit_driver_onboarding() from public, anon;
revoke all on function public.admin_review_driver(uuid, text, text) from public, anon;

grant execute on function public.save_driver_onboarding(text, date, text, integer, text[], text, text, text, text, text, integer) to authenticated;
grant execute on function public.submit_driver_onboarding() to authenticated;
grant execute on function public.admin_review_driver(uuid, text, text) to authenticated;
grant execute on function private.is_organization_member(uuid) to authenticated;

alter publication supabase_realtime add table public.notifications;
