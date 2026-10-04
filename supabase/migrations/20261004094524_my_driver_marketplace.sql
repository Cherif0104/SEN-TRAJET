create table if not exists public.my_driver_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  city text not null default 'Dakar',
  photo_url text,
  cv_url text,
  id_document_url text,
  license_document_url text,
  license_number text not null,
  license_categories text[] not null default array['B']::text[],
  years_experience integer not null default 0 check (years_experience between 0 and 60),
  languages text[] not null default array['Français']::text[],
  vehicle_skills text[] not null default array['citadine', 'berline']::text[],
  transmission_skills text[] not null default array['manuelle']::text[],
  bio text,
  hourly_rate_fcfa integer not null default 1500 check (hourly_rate_fcfa >= 500),
  daily_rate_fcfa integer not null default 7000 check (daily_rate_fcfa >= 3000),
  status text not null default 'en_attente'
    check (status in ('en_attente', 'verifie', 'suspendu', 'rejete')),
  is_available boolean not null default false,
  availability_updated_at timestamptz,
  average_rating numeric(3,2) not null default 0,
  completed_jobs integer not null default 0,
  rejection_reason text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.my_driver_subscriptions (
  id uuid primary key default gen_random_uuid(),
  driver_profile_id uuid not null references public.my_driver_profiles(id) on delete cascade,
  plan text not null check (plan in ('essai_gratuit', 'hebdomadaire')),
  amount_fcfa integer not null default 0 check (amount_fcfa >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'actif' check (status in ('actif', 'expire', 'suspendu')),
  payment_reference text,
  created_at timestamptz not null default now()
);

alter table public.my_driver_subscriptions
  drop constraint if exists my_driver_subscriptions_status_check;
alter table public.my_driver_subscriptions
  add constraint my_driver_subscriptions_status_check
  check (status in ('pending', 'actif', 'expire', 'suspendu'));

create index if not exists my_driver_subscriptions_active_idx
  on public.my_driver_subscriptions(driver_profile_id, ends_at)
  where status = 'actif';

create table if not exists public.my_driver_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'SJ-MC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  client_user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  client_phone text not null,
  pickup_address text not null,
  pickup_lat double precision,
  pickup_lng double precision,
  starts_at timestamptz not null,
  duration_hours integer not null check (duration_hours between 2 and 720),
  mission_type text not null
    check (mission_type in ('ponctuelle', 'journee', 'soiree', 'recurrente', 'recrutement')),
  vehicle_type text not null check (vehicle_type in ('citadine', 'berline', 'suv', 'van', 'minibus', 'bus', 'utilitaire')),
  transmission text not null check (transmission in ('manuelle', 'automatique')),
  required_language text,
  notes text,
  max_budget_fcfa integer check (max_budget_fcfa is null or max_budget_fcfa > 0),
  driver_payout_fcfa integer,
  platform_fee_fcfa integer,
  amount_fcfa integer,
  assigned_driver_profile_id uuid references public.my_driver_profiles(id) on delete set null,
  status text not null default 'recherche'
    check (status in ('recherche', 'chauffeur_propose', 'chauffeur_accepte', 'en_attente_paiement', 'confirmee', 'en_cours', 'terminee', 'annulee', 'aucun_chauffeur')),
  payment_status text not null default 'not_required'
    check (payment_status in ('not_required', 'pending', 'initiated', 'paid', 'failed', 'refunded')),
  payment_provider_ref text,
  search_expires_at timestamptz not null default (now() + interval '30 minutes'),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists my_driver_requests_client_idx
  on public.my_driver_requests(client_user_id, created_at desc);
create index if not exists my_driver_requests_search_idx
  on public.my_driver_requests(starts_at, vehicle_type, transmission)
  where status = 'recherche';

create table if not exists public.my_driver_assignments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.my_driver_requests(id) on delete cascade,
  driver_profile_id uuid not null references public.my_driver_profiles(id) on delete cascade,
  status text not null default 'proposee'
    check (status in ('proposee', 'acceptee', 'refusee', 'expiree', 'annulee', 'terminee')),
  proposed_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique(request_id, driver_profile_id)
);

create index if not exists my_driver_assignments_driver_idx
  on public.my_driver_assignments(driver_profile_id, status, proposed_at desc);

insert into public.business_rules(category, rule_key, label, value_json, unit, is_active, notes)
values
  ('my_driver', 'free_trial_days', 'Essai gratuit chauffeur Mon Chauffeur', '90', 'jours', true, 'Période de lancement gratuite avant abonnement'),
  ('my_driver', 'weekly_subscription_fcfa', 'Abonnement hebdomadaire chauffeur Mon Chauffeur', '1000', 'FCFA', true, 'Accès aux missions après la période gratuite'),
  ('my_driver', 'platform_fee_percent', 'Frais de plateforme Mon Chauffeur', '15', 'pourcentage', true, 'Le client paie SentraJet, jamais directement le chauffeur'),
  ('my_driver', 'assignment_response_minutes', 'Délai de réponse chauffeur', '5', 'minutes', true, 'Passé ce délai le système propose un autre chauffeur')
on conflict (category, rule_key) do nothing;

create or replace function public.start_my_driver_free_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := 90;
begin
  select coalesce((value_json #>> '{}')::integer, 90)
  into v_days
  from public.business_rules
  where category = 'my_driver' and rule_key = 'free_trial_days' and is_active
  limit 1;

  insert into public.my_driver_subscriptions(
    driver_profile_id, plan, amount_fcfa, starts_at, ends_at, status
  ) values (
    new.id, 'essai_gratuit', 0, now(), now() + make_interval(days => v_days), 'actif'
  );
  return new;
end;
$$;

drop trigger if exists trg_start_my_driver_free_trial on public.my_driver_profiles;
create trigger trg_start_my_driver_free_trial
after insert on public.my_driver_profiles
for each row execute function public.start_my_driver_free_trial();
revoke all on function public.start_my_driver_free_trial()
from public, anon, authenticated;

create or replace function public.match_my_driver_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.my_driver_requests%rowtype;
  v_driver public.my_driver_profiles%rowtype;
  v_payout integer;
  v_fee integer;
  v_total integer;
  v_fee_percent numeric := 15;
  v_response_minutes integer := 5;
  v_assignment public.my_driver_assignments%rowtype;
begin
  select * into v_request
  from public.my_driver_requests
  where id = p_request_id
  for update;

  if not found or v_request.status <> 'recherche' then
    return jsonb_build_object('matched', false, 'reason', 'request_not_searching');
  end if;
  if v_request.search_expires_at <= now() then
    update public.my_driver_requests
    set status = 'aucun_chauffeur', updated_at = now()
    where id = p_request_id;
    return jsonb_build_object('matched', false, 'reason', 'search_expired');
  end if;

  select coalesce((value_json #>> '{}')::numeric, 15)
  into v_fee_percent
  from public.business_rules
  where category = 'my_driver' and rule_key = 'platform_fee_percent' and is_active
  limit 1;

  select coalesce((value_json #>> '{}')::integer, 5)
  into v_response_minutes
  from public.business_rules
  where category = 'my_driver' and rule_key = 'assignment_response_minutes' and is_active
  limit 1;

  select profile.* into v_driver
  from public.my_driver_profiles profile
  where profile.status = 'verifie'
    and profile.is_available
    and v_request.vehicle_type = any(profile.vehicle_skills)
    and v_request.transmission = any(profile.transmission_skills)
    and (
      v_request.required_language is null
      or lower(v_request.required_language) = any(
        select lower(language) from unnest(profile.languages) language
      )
    )
    and exists (
      select 1
      from public.my_driver_subscriptions subscription
      where subscription.driver_profile_id = profile.id
        and subscription.status = 'actif'
        and subscription.starts_at <= now()
        and subscription.ends_at > now()
    )
    and not exists (
      select 1
      from public.my_driver_assignments prior
      where prior.request_id = v_request.id
        and prior.driver_profile_id = profile.id
        and prior.status in ('refusee', 'expiree')
    )
    and not exists (
      select 1
      from public.my_driver_assignments assignment
      join public.my_driver_requests request on request.id = assignment.request_id
      where assignment.driver_profile_id = profile.id
        and assignment.status in ('proposee', 'acceptee')
        and request.starts_at < v_request.starts_at
          + make_interval(hours => v_request.duration_hours)
        and request.starts_at + make_interval(hours => request.duration_hours)
          > v_request.starts_at
    )
    and (
      v_request.max_budget_fcfa is null
      or (
        case
          when v_request.duration_hours <= 4
            then profile.hourly_rate_fcfa * v_request.duration_hours
          else profile.daily_rate_fcfa * ceil(v_request.duration_hours / 8.0)::integer
        end
      ) * (1 + v_fee_percent / 100.0) <= v_request.max_budget_fcfa
    )
  order by
    profile.average_rating desc,
    profile.completed_jobs desc,
    case
      when v_request.duration_hours <= 4
        then profile.hourly_rate_fcfa * v_request.duration_hours
      else profile.daily_rate_fcfa * ceil(v_request.duration_hours / 8.0)::integer
    end asc,
    profile.availability_updated_at desc nulls last
  for update skip locked
  limit 1;

  if not found then
    return jsonb_build_object(
      'matched', false,
      'request_id', v_request.id,
      'expires_at', v_request.search_expires_at
    );
  end if;

  v_payout := case
    when v_request.duration_hours <= 4
      then v_driver.hourly_rate_fcfa * v_request.duration_hours
    else v_driver.daily_rate_fcfa * ceil(v_request.duration_hours / 8.0)::integer
  end;
  v_fee := round(v_payout * v_fee_percent / 100.0);
  v_total := v_payout + v_fee;

  insert into public.my_driver_assignments(
    request_id, driver_profile_id, status, expires_at
  ) values (
    v_request.id, v_driver.id, 'proposee',
    now() + make_interval(mins => v_response_minutes)
  )
  returning * into v_assignment;

  update public.my_driver_requests
  set assigned_driver_profile_id = v_driver.id,
      driver_payout_fcfa = v_payout,
      platform_fee_fcfa = v_fee,
      amount_fcfa = v_total,
      status = 'chauffeur_propose',
      payment_status = 'not_required',
      updated_at = now()
  where id = v_request.id;

  return jsonb_build_object(
    'matched', true,
    'request_id', v_request.id,
    'assignment_id', v_assignment.id,
    'driver_profile_id', v_driver.id,
    'amount_fcfa', v_total,
    'expires_at', v_assignment.expires_at
  );
end;
$$;
revoke all on function public.match_my_driver_request(uuid)
from public, anon, authenticated;
grant execute on function public.match_my_driver_request(uuid) to service_role;

create or replace function public.create_my_driver_request(
  p_user_id uuid,
  p_client_name text,
  p_client_phone text,
  p_pickup_address text,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_starts_at timestamptz,
  p_duration_hours integer,
  p_mission_type text,
  p_vehicle_type text,
  p_transmission text,
  p_required_language text,
  p_notes text,
  p_max_budget_fcfa integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.my_driver_requests%rowtype;
  v_match jsonb;
begin
  if p_user_id is null
     or nullif(trim(p_client_name), '') is null
     or length(regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g')) < 9
     or nullif(trim(p_pickup_address), '') is null
     or p_starts_at < now() + interval '30 minutes'
     or p_starts_at > now() + interval '90 days'
     or p_duration_hours not between 2 and 720
     or p_mission_type not in ('ponctuelle', 'journee', 'soiree', 'recurrente', 'recrutement')
     or p_vehicle_type not in ('citadine', 'berline', 'suv', 'van', 'minibus', 'bus', 'utilitaire')
     or p_transmission not in ('manuelle', 'automatique') then
    raise exception using errcode = '22023', message = 'my_driver_request_invalid';
  end if;

  insert into public.my_driver_requests(
    client_user_id, client_name, client_phone, pickup_address,
    pickup_lat, pickup_lng, starts_at, duration_hours, mission_type,
    vehicle_type, transmission, required_language, notes, max_budget_fcfa,
    status, payment_status, search_expires_at
  ) values (
    p_user_id, trim(p_client_name), trim(p_client_phone), trim(p_pickup_address),
    p_pickup_lat, p_pickup_lng, p_starts_at, p_duration_hours, p_mission_type,
    p_vehicle_type, p_transmission, nullif(trim(p_required_language), ''),
    nullif(trim(p_notes), ''), p_max_budget_fcfa, 'recherche', 'not_required',
    now() + interval '30 minutes'
  )
  returning * into v_request;

  select public.match_my_driver_request(v_request.id) into v_match;
  return jsonb_build_object('request_id', v_request.id, 'match', v_match);
end;
$$;
revoke all on function public.create_my_driver_request(
  uuid, text, text, text, double precision, double precision, timestamptz,
  integer, text, text, text, text, text, integer
) from public, anon, authenticated;
grant execute on function public.create_my_driver_request(
  uuid, text, text, text, double precision, double precision, timestamptz,
  integer, text, text, text, text, text, integer
) to service_role;

create or replace function public.respond_my_driver_assignment(
  p_assignment_id uuid,
  p_accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.my_driver_assignments%rowtype;
  v_profile_id uuid;
  v_rematch jsonb;
begin
  select profile.id into v_profile_id
  from public.my_driver_profiles profile
  where profile.user_id = auth.uid()
    and profile.status = 'verifie';
  if v_profile_id is null then
    raise exception using errcode = '42501', message = 'my_driver_not_authorized';
  end if;

  select * into v_assignment
  from public.my_driver_assignments
  where id = p_assignment_id
  for update;
  if not found or v_assignment.driver_profile_id <> v_profile_id
     or v_assignment.status <> 'proposee'
     or v_assignment.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'my_driver_assignment_unavailable';
  end if;

  if p_accept then
    update public.my_driver_assignments
    set status = 'acceptee', responded_at = now()
    where id = v_assignment.id;
    update public.my_driver_requests
    set status = 'en_attente_paiement', payment_status = 'pending', updated_at = now()
    where id = v_assignment.request_id;
    return jsonb_build_object('accepted', true, 'request_id', v_assignment.request_id);
  end if;

  update public.my_driver_assignments
  set status = 'refusee', responded_at = now()
  where id = v_assignment.id;
  update public.my_driver_requests
  set status = 'recherche', assigned_driver_profile_id = null,
      driver_payout_fcfa = null, platform_fee_fcfa = null, amount_fcfa = null,
      updated_at = now()
  where id = v_assignment.request_id;
  select public.match_my_driver_request(v_assignment.request_id) into v_rematch;
  return jsonb_build_object('accepted', false, 'request_id', v_assignment.request_id, 'rematch', v_rematch);
end;
$$;
revoke all on function public.respond_my_driver_assignment(uuid, boolean)
from public, anon;
grant execute on function public.respond_my_driver_assignment(uuid, boolean)
to authenticated;

create or replace function public.expire_my_driver_assignments()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment record;
  v_expired integer := 0;
begin
  for v_assignment in
    select id, request_id
    from public.my_driver_assignments
    where status = 'proposee' and expires_at <= now()
    for update skip locked
  loop
    update public.my_driver_assignments
    set status = 'expiree', responded_at = now()
    where id = v_assignment.id;
    update public.my_driver_requests
    set status = 'recherche', assigned_driver_profile_id = null,
        driver_payout_fcfa = null, platform_fee_fcfa = null, amount_fcfa = null,
        updated_at = now()
    where id = v_assignment.request_id
      and status = 'chauffeur_propose';
    perform public.match_my_driver_request(v_assignment.request_id);
    v_expired := v_expired + 1;
  end loop;

  update public.my_driver_requests
  set status = 'aucun_chauffeur', updated_at = now()
  where status = 'recherche' and search_expires_at <= now();

  return jsonb_build_object('expired_assignments', v_expired);
end;
$$;
revoke all on function public.expire_my_driver_assignments()
from public, anon, authenticated;
grant execute on function public.expire_my_driver_assignments() to service_role;

do $$
declare
  v_job_id bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select jobid into v_job_id
    from cron.job
    where jobname = 'sentrajet-expire-my-driver-assignments'
    limit 1;
    if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
    perform cron.schedule(
      'sentrajet-expire-my-driver-assignments',
      '* * * * *',
      'select public.expire_my_driver_assignments()'
    );
  end if;
end
$$;

alter table public.my_driver_profiles enable row level security;
alter table public.my_driver_subscriptions enable row level security;
alter table public.my_driver_requests enable row level security;
alter table public.my_driver_assignments enable row level security;

create policy "my_driver_profiles_select_owner_staff"
on public.my_driver_profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[])
);
create policy "my_driver_profiles_manage_staff"
on public.my_driver_profiles for all to authenticated
using (public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]))
with check (public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]));

create policy "my_driver_subscriptions_select_owner_staff"
on public.my_driver_subscriptions for select to authenticated
using (
  exists (
    select 1 from public.my_driver_profiles profile
    where profile.id = my_driver_subscriptions.driver_profile_id
      and profile.user_id = (select auth.uid())
  )
  or public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[])
);
create policy "my_driver_subscriptions_manage_staff"
on public.my_driver_subscriptions for all to authenticated
using (public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]))
with check (public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]));

create policy "my_driver_requests_select_participant_staff"
on public.my_driver_requests for select to authenticated
using (
  client_user_id = (select auth.uid())
  or exists (
    select 1 from public.my_driver_profiles profile
    where profile.id = my_driver_requests.assigned_driver_profile_id
      and profile.user_id = (select auth.uid())
  )
  or public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[])
);
create policy "my_driver_requests_manage_staff"
on public.my_driver_requests for all to authenticated
using (public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]))
with check (public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]));

create policy "my_driver_assignments_select_participant_staff"
on public.my_driver_assignments for select to authenticated
using (
  exists (
    select 1 from public.my_driver_profiles profile
    where profile.id = my_driver_assignments.driver_profile_id
      and profile.user_id = (select auth.uid())
  )
  or exists (
    select 1 from public.my_driver_requests request
    where request.id = my_driver_assignments.request_id
      and request.client_user_id = (select auth.uid())
  )
  or public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[])
);
create policy "my_driver_assignments_manage_staff"
on public.my_driver_assignments for all to authenticated
using (public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]))
with check (public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'my-driver-documents',
  'my-driver-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "my_driver_documents_insert_owner"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'my-driver-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "my_driver_documents_select_owner_staff"
on storage.objects for select to authenticated
using (
  bucket_id = 'my-driver-documents'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[])
  )
);

create policy "my_driver_documents_update_owner"
on storage.objects for update to authenticated
using (
  bucket_id = 'my-driver-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'my-driver-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
