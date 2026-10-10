-- Compact multi-step driver onboarding with explicit validation errors,
-- operating region and a truthful KYC provider hand-off state.

alter table public.driver_profiles
  add column if not exists operating_region text,
  add column if not exists base_lat double precision check (base_lat between -90 and 90),
  add column if not exists base_lng double precision check (base_lng between -180 and 180),
  add column if not exists automated_check_status text not null default 'not_started'
    check (automated_check_status in (
      'not_started', 'pending_provider', 'needs_review', 'verified', 'failed'
    )),
  add column if not exists kyc_provider_reference text;

create or replace function public.save_driver_onboarding(
  p_full_name text,
  p_phone text,
  p_birth_date date,
  p_operating_region text,
  p_base_lat double precision,
  p_base_lng double precision,
  p_license_number text,
  p_license_issued_at date,
  p_license_expires_at date,
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
  v_expected_expiry date;
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
  if length(trim(coalesce(p_full_name, ''))) < 3 then
    raise exception 'invalid_full_name';
  end if;
  if length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) < 9 then
    raise exception 'invalid_phone';
  end if;
  if p_birth_date is null or p_birth_date > current_date - interval '18 years' then
    raise exception 'driver_underage';
  end if;
  if length(trim(coalesce(p_operating_region, ''))) < 2
     or p_base_lat not between -90 and 90
     or p_base_lng not between -180 and 180 then
    raise exception 'operating_region_required';
  end if;
  if length(trim(coalesce(p_license_number, ''))) < 4 then
    raise exception 'invalid_license_number';
  end if;
  if p_license_issued_at is null or p_license_issued_at > current_date then
    raise exception 'invalid_license_issue_date';
  end if;
  v_expected_expiry := (p_license_issued_at + interval '10 years')::date;
  if p_license_expires_at is distinct from v_expected_expiry then
    raise exception 'invalid_license_validity';
  end if;
  if v_expected_expiry <= current_date then
    raise exception 'license_expired';
  end if;
  if p_years_experience not between 0 and 60 then
    raise exception 'invalid_experience';
  end if;
  if p_vehicle_year not between 1995 and extract(year from current_date)::integer + 1 then
    raise exception 'invalid_vehicle_year';
  end if;
  if length(trim(coalesce(p_brand, ''))) < 2
     or length(trim(coalesce(p_model, ''))) < 1 then
    raise exception 'invalid_vehicle_reference';
  end if;
  if length(trim(coalesce(p_plate, ''))) < 3 then
    raise exception 'invalid_vehicle_plate';
  end if;
  if length(trim(coalesce(p_color, ''))) < 2 then
    raise exception 'invalid_vehicle_color';
  end if;
  if p_seats not between 1 and 60 then
    raise exception 'invalid_vehicle_capacity';
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
  set full_name = left(trim(p_full_name), 120),
      phone = left(trim(p_phone), 30),
      updated_at = now()
  where id = auth.uid();

  update public.driver_profiles
  set license_number = left(trim(p_license_number), 80),
      license_issued_at = p_license_issued_at,
      license_expires_at = v_expected_expiry,
      birth_date = p_birth_date,
      address = null,
      operating_region = left(trim(p_operating_region), 100),
      base_lat = p_base_lat,
      base_lng = p_base_lng,
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
      automated_check_status = 'not_started',
      kyc_provider_reference = null,
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
  v_new_kyc boolean;
  v_required_documents integer;
begin
  select * into v_driver
  from public.driver_profiles
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'driver_profile_required' using errcode = '42501';
  end if;

  v_new_kyc := v_driver.license_issued_at is not null
    and v_driver.license_expires_at is not null
    and v_driver.license_expires_at > current_date
    and v_driver.operating_region is not null
    and v_driver.base_lat is not null
    and v_driver.base_lng is not null
    and exists (
      select 1 from public.vehicles
      where driver_id = v_driver.id and vehicle_year is not null
    );

  if v_driver.license_number is null
     or v_driver.birth_date is null
     or v_driver.years_experience is null
     or not exists (select 1 from public.vehicles where driver_id = v_driver.id)
     or (not v_new_kyc and length(trim(coalesce(v_driver.address, ''))) < 5) then
    raise exception 'driver_information_incomplete';
  end if;

  if v_new_kyc then
    select count(distinct kind) into v_required_documents
    from public.driver_documents
    where driver_id = v_driver.id
      and kind in (
        'identity_front', 'identity_back', 'profile_photo',
        'driver_license_front', 'driver_license_back',
        'vehicle_registration', 'vehicle_insurance', 'vehicle_photo'
      );
    if v_required_documents <> 8 then
      raise exception 'required_documents_missing';
    end if;
  else
    select count(distinct kind) into v_required_documents
    from public.driver_documents
    where driver_id = v_driver.id
      and kind in (
        'identity', 'driver_license',
        'vehicle_registration', 'vehicle_insurance'
      );
    if v_required_documents <> 4 then
      raise exception 'required_documents_missing';
    end if;
  end if;

  update public.driver_documents
  set status = 'submitted', rejection_reason = null, updated_at = now()
  where driver_id = v_driver.id;

  update public.driver_profiles
  set status = 'pending',
      onboarding_status = 'submitted',
      automated_check_status = case
        when v_new_kyc then 'pending_provider'
        else 'needs_review'
      end,
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

revoke all on function public.save_driver_onboarding(
  text, text, date, text, double precision, double precision,
  text, date, date, integer, text, text, integer, text, text, integer
) from public, anon;
grant execute on function public.save_driver_onboarding(
  text, text, date, text, double precision, double precision,
  text, date, date, integer, text, text, integer, text, text, integer
) to authenticated;
