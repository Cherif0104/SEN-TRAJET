-- Keep the current production frontend operational while the VTC branch is
-- reviewed. This compatibility overload can be removed after the rollout.

alter table public.driver_documents
  drop constraint if exists driver_documents_kind_check;
alter table public.driver_documents
  add constraint driver_documents_kind_check check (
    kind in (
      'identity',
      'driver_license',
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
      v_driver.id, p_ride_class::public.ride_class,
      left(trim(p_brand), 80), left(trim(p_model), 80),
      upper(left(trim(p_plate), 30)), left(trim(p_color), 50), p_seats, false
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
        'identity_front', 'identity_back',
        'driver_license_front', 'driver_license_back',
        'vehicle_registration', 'vehicle_insurance'
      );
    if v_required_documents <> 6 then
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
  text, date, text, integer, text[], text, text, text, text, text, integer
) from public, anon;
grant execute on function public.save_driver_onboarding(
  text, date, text, integer, text[], text, text, text, text, text, integer
) to authenticated;
