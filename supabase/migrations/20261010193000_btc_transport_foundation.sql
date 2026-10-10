-- SentraJet VTC foundation: transport-only catalog, stronger driver KYC,
-- server-assigned service classes and continuous location updates.

alter table public.driver_profiles
  add column if not exists license_issued_at date,
  add column if not exists license_expires_at date;

alter table public.vehicles
  add column if not exists vehicle_year integer
    check (vehicle_year between 1995 and extract(year from current_date)::integer + 1),
  add column if not exists eligible_classes public.ride_class[] not null
    default array['eco'::public.ride_class];

alter table public.driver_documents
  drop constraint if exists driver_documents_kind_check;
update public.driver_documents set kind = 'identity_front' where kind = 'identity';
update public.driver_documents set kind = 'driver_license_front' where kind = 'driver_license';
alter table public.driver_documents
  add constraint driver_documents_kind_check check (
    kind in (
      'identity_front',
      'identity_back',
      'driver_license_front',
      'driver_license_back',
      'vehicle_registration',
      'vehicle_insurance',
      'profile_photo',
      'vehicle_photo'
    )
  );

update public.service_catalog
set is_active = false, updated_at = now()
where slug = 'delivery';

insert into public.service_catalog (slug, title, subtitle, badge, sort_order, is_active)
values
  ('ride', 'Course', 'Maintenant ou sur réservation', 'Chauffeur en direct', 10, true),
  ('intercity', 'Allô Dakar', 'Départs planifiés vers toutes les régions', 'Réservation à la place', 20, true),
  ('airport', 'Taxi Aéroport', 'Vers ou depuis l’AIBD', 'Instantané ou réservé', 30, true),
  ('carpool', 'Covoiturage', 'Partagez un trajet compatible', 'Trajet partagé', 40, true)
on conflict (slug) do update
set title = excluded.title,
    subtitle = excluded.subtitle,
    badge = excluded.badge,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    updated_at = now();

drop function if exists public.save_driver_onboarding(
  text, date, text, integer, text[], text, text, text, text, text, integer
);

create or replace function public.save_driver_onboarding(
  p_full_name text,
  p_license_number text,
  p_license_issued_at date,
  p_license_expires_at date,
  p_birth_date date,
  p_years_experience integer,
  p_brand text,
  p_model text,
  p_vehicle_year integer,
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
  v_primary_class public.ride_class;
  v_eligible_classes public.ride_class[];
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
  if length(trim(coalesce(p_full_name, ''))) < 3
     or length(trim(coalesce(p_license_number, ''))) < 4
     or p_birth_date is null
     or p_birth_date > current_date - interval '18 years'
     or p_license_issued_at is null
     or p_license_issued_at > current_date
     or p_license_expires_at is null
     or p_license_expires_at <= current_date
     or p_license_expires_at <= p_license_issued_at
     or p_years_experience not between 0 and 60
     or p_seats not between 1 and 60
     or p_vehicle_year not between 1995 and extract(year from current_date)::integer + 1
     or length(trim(coalesce(p_brand, ''))) < 2
     or length(trim(coalesce(p_model, ''))) < 1
     or length(trim(coalesce(p_plate, ''))) < 3
     or length(trim(coalesce(p_color, ''))) < 2 then
    raise exception 'invalid_driver_onboarding_data';
  end if;

  v_eligible_classes := array['eco'::public.ride_class];
  if p_vehicle_year >= 2015 then
    v_eligible_classes := array_append(v_eligible_classes, 'comfort'::public.ride_class);
  end if;
  if p_vehicle_year >= 2019 then
    v_eligible_classes := array_append(v_eligible_classes, 'comfort_plus'::public.ride_class);
  end if;
  if p_vehicle_year >= 2022 then
    v_eligible_classes := array_append(v_eligible_classes, 'vip'::public.ride_class);
  end if;
  v_primary_class := v_eligible_classes[array_length(v_eligible_classes, 1)];

  update public.profiles
  set full_name = left(trim(p_full_name), 120), updated_at = now()
  where id = auth.uid();

  update public.driver_profiles
  set license_number = left(trim(p_license_number), 80),
      license_issued_at = p_license_issued_at,
      license_expires_at = p_license_expires_at,
      birth_date = p_birth_date,
      address = null,
      years_experience = p_years_experience,
      accepted_services = array[
        'ride'::public.service_type,
        'intercity'::public.service_type,
        'airport'::public.service_type,
        'carpool'::public.service_type
      ],
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
      driver_id, ride_class, eligible_classes, brand, model, vehicle_year,
      plate, color, seats, is_verified
    )
    values (
      v_driver.id, v_primary_class, v_eligible_classes,
      left(trim(p_brand), 80), left(trim(p_model), 80), p_vehicle_year,
      upper(left(trim(p_plate), 30)), left(trim(p_color), 50), p_seats, false
    )
    returning id into v_vehicle_id;
  else
    update public.vehicles
    set ride_class = v_primary_class,
        eligible_classes = v_eligible_classes,
        brand = left(trim(p_brand), 80),
        model = left(trim(p_model), 80),
        vehicle_year = p_vehicle_year,
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
     or v_driver.license_issued_at is null
     or v_driver.license_expires_at is null
     or v_driver.license_expires_at <= current_date
     or v_driver.birth_date is null
     or v_driver.years_experience is null
     or not exists (
       select 1 from public.vehicles
       where driver_id = v_driver.id and vehicle_year is not null
     ) then
    raise exception 'driver_information_incomplete';
  end if;

  select count(distinct kind) into v_required_documents
  from public.driver_documents
  where driver_id = v_driver.id
    and kind in (
      'identity_front',
      'identity_back',
      'driver_license_front',
      'driver_license_back',
      'vehicle_registration',
      'vehicle_insurance'
    );

  if v_required_documents <> 6 then
    raise exception 'required_documents_missing';
  end if;

  update public.driver_documents
  set status = 'submitted', rejection_reason = null, updated_at = now()
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

create or replace function public.update_driver_location(
  p_lat double precision,
  p_lng double precision,
  p_heading double precision default null,
  p_accuracy_m double precision default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_driver_id uuid;
begin
  select id into v_driver_id
  from public.driver_profiles
  where user_id = auth.uid() and status = 'approved';

  if v_driver_id is null then
    raise exception 'approved_driver_required' using errcode = '42501';
  end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'invalid_location';
  end if;

  insert into public.driver_locations (driver_id, lat, lng, heading, accuracy_m, updated_at)
  values (v_driver_id, p_lat, p_lng, p_heading, p_accuracy_m, now())
  on conflict (driver_id) do update
  set lat = excluded.lat,
      lng = excluded.lng,
      heading = excluded.heading,
      accuracy_m = excluded.accuracy_m,
      updated_at = now();
end;
$$;

revoke all on function public.save_driver_onboarding(
  text, text, date, date, date, integer, text, text, integer, text, text, integer
) from public, anon;
revoke all on function public.submit_driver_onboarding() from public, anon;
revoke all on function public.update_driver_location(
  double precision, double precision, double precision, double precision
) from public, anon;

grant execute on function public.save_driver_onboarding(
  text, text, date, date, date, integer, text, text, integer, text, text, integer
) to authenticated;
grant execute on function public.submit_driver_onboarding() to authenticated;
grant execute on function public.update_driver_location(
  double precision, double precision, double precision, double precision
) to authenticated;
