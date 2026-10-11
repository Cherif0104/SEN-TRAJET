-- Interim automated verification for driver activation.
-- This validates completeness and technical consistency of the dossier.
-- It deliberately does not claim OCR, document authenticity or liveness.

alter table public.driver_profiles
  add column if not exists verification_score smallint
    check (verification_score between 0 and 100),
  add column if not exists verification_method text,
  add column if not exists verification_details jsonb not null default '{}'::jsonb,
  add column if not exists automated_verified_at timestamptz;

create or replace function private.driver_internal_verification(p_driver_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, storage
as $$
declare
  v_driver record;
  v_vehicle record;
  v_document_count integer := 0;
  v_profile_valid boolean := false;
  v_identity_context_valid boolean := false;
  v_license_valid boolean := false;
  v_vehicle_valid boolean := false;
  v_score integer := 0;
begin
  select
    d.*,
    p.full_name,
    p.phone
  into v_driver
  from public.driver_profiles d
  join public.profiles p on p.id = d.user_id
  where d.id = p_driver_id;

  if not found then
    return jsonb_build_object('score', 0, 'reason', 'driver_profile_required');
  end if;

  select *
  into v_vehicle
  from public.vehicles
  where driver_id = p_driver_id
  order by created_at
  limit 1;

  v_profile_valid :=
    length(trim(coalesce(v_driver.full_name, ''))) >= 3
    and length(regexp_replace(coalesce(v_driver.phone, ''), '[^0-9]', '', 'g')) >= 9;

  v_identity_context_valid :=
    v_driver.birth_date <= current_date - interval '18 years'
    and length(trim(coalesce(v_driver.operating_region, ''))) >= 2
    and v_driver.base_lat between -90 and 90
    and v_driver.base_lng between -180 and 180;

  v_license_valid :=
    length(trim(coalesce(v_driver.license_number, ''))) >= 4
    and v_driver.license_issued_at <= current_date
    and v_driver.license_expires_at > current_date
    and v_driver.license_expires_at =
      (v_driver.license_issued_at + interval '10 years')::date;

  v_vehicle_valid :=
    v_vehicle.id is not null
    and length(trim(coalesce(v_vehicle.brand, ''))) >= 2
    and length(trim(coalesce(v_vehicle.model, ''))) >= 1
    and v_vehicle.vehicle_year between 1995 and extract(year from current_date)::integer + 1
    and length(trim(coalesce(v_vehicle.plate, ''))) >= 3
    and length(trim(coalesce(v_vehicle.color, ''))) >= 2
    and v_vehicle.seats between 2 and 9;

  select count(distinct documents.kind)
  into v_document_count
  from public.driver_documents documents
  where documents.driver_id = p_driver_id
    and documents.kind in (
      'identity_front', 'identity_back', 'profile_photo',
      'driver_license_front', 'driver_license_back',
      'vehicle_registration', 'vehicle_insurance', 'vehicle_photo'
    )
    and documents.status <> 'rejected'
    and documents.mime_type in ('image/jpeg', 'image/png', 'image/webp')
    and documents.file_size > 0
    and exists (
      select 1
      from storage.objects objects
      where objects.bucket_id = 'sentrajet-driver-documents'
        and objects.name = documents.storage_path
        and split_part(objects.name, '/', 1) = v_driver.user_id::text
    );

  v_score :=
    (case when v_profile_valid then 15 else 0 end)
    + (case when v_identity_context_valid then 15 else 0 end)
    + (case when v_license_valid then 15 else 0 end)
    + (case when v_vehicle_valid then 15 else 0 end)
    + (least(v_document_count, 8) * 5);

  return jsonb_build_object(
    'score', v_score,
    'threshold', 99,
    'method', 'internal_consistency_v1',
    'profile_valid', v_profile_valid,
    'identity_context_valid', v_identity_context_valid,
    'license_valid', v_license_valid,
    'vehicle_valid', v_vehicle_valid,
    'verified_documents', v_document_count,
    'required_documents', 8,
    'scope', 'completeness_and_technical_consistency',
    'not_performed', jsonb_build_array(
      'document_authenticity',
      'ocr_field_matching',
      'biometric_face_matching',
      'liveness'
    )
  );
end;
$$;

revoke all on function private.driver_internal_verification(uuid)
from public, anon, authenticated;

create or replace function public.submit_driver_onboarding()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_driver public.driver_profiles%rowtype;
  v_required_documents integer;
  v_verification jsonb;
  v_score integer;
  v_approved boolean;
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
     or v_driver.years_experience is null
     or v_driver.operating_region is null
     or v_driver.base_lat is null
     or v_driver.base_lng is null
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
      'identity_front', 'identity_back', 'profile_photo',
      'driver_license_front', 'driver_license_back',
      'vehicle_registration', 'vehicle_insurance', 'vehicle_photo'
    );

  if v_required_documents <> 8 then
    raise exception 'required_documents_missing';
  end if;

  v_verification := private.driver_internal_verification(v_driver.id);
  v_score := coalesce((v_verification ->> 'score')::integer, 0);
  v_approved := v_score > 98;

  update public.driver_documents
  set status = case when v_approved then 'approved' else 'submitted' end,
      rejection_reason = null,
      reviewed_at = case when v_approved then now() else null end,
      updated_at = now()
  where driver_id = v_driver.id;

  update public.driver_profiles
  set status = case
        when v_approved then 'approved'::public.driver_status
        else 'pending'::public.driver_status
      end,
      onboarding_status = case when v_approved then 'approved' else 'submitted' end,
      automated_check_status = case when v_approved then 'verified' else 'needs_review' end,
      verification_score = v_score,
      verification_method = 'internal_consistency_v1',
      verification_details = v_verification,
      automated_verified_at = case when v_approved then now() else null end,
      submitted_at = now(),
      reviewed_at = case when v_approved then now() else null end,
      reviewed_by = null,
      review_notes = case
        when v_approved then 'Contrôle interne de complétude et cohérence réussi.'
        else 'Contrôle interne insuffisant ; revue manuelle requise.'
      end,
      rejection_reason = null,
      is_online = false,
      updated_at = now()
  where id = v_driver.id;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_driver.user_id,
    case when v_approved then 'driver_approved' else 'driver_review_required' end,
    case when v_approved then 'Compte chauffeur activé' else 'Contrôle complémentaire requis' end,
    case
      when v_approved then 'Votre dossier a obtenu un score interne de ' || v_score || '/100. Vous pouvez maintenant vous mettre en ligne.'
      else 'Votre dossier a obtenu un score interne de ' || v_score || '/100 et nécessite une vérification complémentaire.'
    end,
    jsonb_build_object(
      'driver_id', v_driver.id,
      'score', v_score,
      'method', 'internal_consistency_v1'
    )
  );

  return v_driver.id;
end;
$$;

revoke all on function public.submit_driver_onboarding()
from public, anon;
grant execute on function public.submit_driver_onboarding()
to authenticated;

-- Re-evaluate dossiers that were blocked waiting for an unavailable provider.
do $$
declare
  pending_driver record;
  verification jsonb;
  score integer;
begin
  for pending_driver in
    select id, user_id
    from public.driver_profiles
    where onboarding_status = 'submitted'
      and automated_check_status = 'pending_provider'
  loop
    verification := private.driver_internal_verification(pending_driver.id);
    score := coalesce((verification ->> 'score')::integer, 0);

    update public.driver_profiles
    set status = case
          when score > 98 then 'approved'::public.driver_status
          else 'pending'::public.driver_status
        end,
        onboarding_status = case when score > 98 then 'approved' else 'submitted' end,
        automated_check_status = case when score > 98 then 'verified' else 'needs_review' end,
        verification_score = score,
        verification_method = 'internal_consistency_v1',
        verification_details = verification,
        automated_verified_at = case when score > 98 then now() else null end,
        reviewed_at = case when score > 98 then now() else null end,
        review_notes = case
          when score > 98 then 'Contrôle interne de complétude et cohérence réussi.'
          else 'Contrôle interne insuffisant ; revue manuelle requise.'
        end,
        updated_at = now()
    where id = pending_driver.id;

    if score > 98 then
      update public.driver_documents
      set status = 'approved', reviewed_at = now(), updated_at = now()
      where driver_id = pending_driver.id;

      insert into public.notifications (user_id, type, title, body, data)
      select
        pending_driver.user_id,
        'driver_approved',
        'Compte chauffeur activé',
        'Votre dossier a obtenu un score interne de ' || score || '/100. Vous pouvez maintenant vous mettre en ligne.',
        jsonb_build_object(
          'driver_id', pending_driver.id,
          'score', score,
          'method', 'internal_consistency_v1'
        )
      where not exists (
        select 1
        from public.notifications existing
        where existing.user_id = pending_driver.user_id
          and existing.type = 'driver_approved'
          and existing.data ->> 'method' = 'internal_consistency_v1'
      );
    end if;
  end loop;
end;
$$;
