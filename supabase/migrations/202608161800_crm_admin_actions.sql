-- SentraJet OS — actions CRM et création atomique des prospects partenaires

create or replace function public.list_crm_staff()
returns table (
  user_id uuid,
  full_name text,
  role text
)
language sql
security definer
set search_path = public
stable
as $$
  select distinct
    p.id as user_id,
    coalesce(nullif(p.full_name, ''), 'Collaborateur SentraJet') as full_name,
    ur.role::text as role
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  where public.has_any_role(
    array['super_admin','manager','commercial','ops','finance','rh']::public.app_role[]
  )
    and ur.role = any (
      array['super_admin','manager','commercial','ops','finance','rh']::public.app_role[]
    )
  order by full_name;
$$;

revoke all on function public.list_crm_staff() from public;
grant execute on function public.list_crm_staff() to authenticated;

create or replace function public.create_crm_activity(
  p_client_id uuid default null,
  p_partner_org_id uuid default null,
  p_lead_id uuid default null,
  p_booking_id uuid default null,
  p_channel text default 'autre',
  p_direction text default 'inbound',
  p_motif text default 'autre',
  p_subject text default null,
  p_message text default null,
  p_next_action_at timestamptz default null,
  p_next_action_label text default null,
  p_next_action_assignee uuid default null
)
returns public.crm_activities
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity public.crm_activities;
begin
  if not public.has_any_role(
    array['super_admin','manager','commercial','ops','finance','rh']::public.app_role[]
  ) then
    raise exception 'Accès CRM refusé';
  end if;

  if p_client_id is null and p_partner_org_id is null
     and p_lead_id is null and p_booking_id is null then
    raise exception 'Une cible CRM est requise';
  end if;

  if p_next_action_at is not null
     and nullif(btrim(coalesce(p_next_action_label, '')), '') is null then
    raise exception 'Le libellé de la prochaine action est requis';
  end if;

  insert into public.crm_activities (
    client_id, partner_org_id, lead_id, booking_id,
    channel, direction, motif, subject, message,
    handled_by, occurred_at,
    next_action_at, next_action_label, next_action_assignee,
    status
  )
  values (
    p_client_id, p_partner_org_id, p_lead_id, p_booking_id,
    p_channel, p_direction, p_motif, nullif(btrim(coalesce(p_subject, '')), ''),
    nullif(btrim(coalesce(p_message, '')), ''),
    auth.uid(), now(),
    p_next_action_at, nullif(btrim(coalesce(p_next_action_label, '')), ''),
    coalesce(p_next_action_assignee, auth.uid()),
    'open'
  )
  returning * into v_activity;

  perform public.write_audit_log(
    'create',
    'crm_activity',
    v_activity.id::text,
    jsonb_build_object(
      'motif', v_activity.motif,
      'client_id', v_activity.client_id,
      'partner_org_id', v_activity.partner_org_id,
      'next_action_at', v_activity.next_action_at
    )
  );

  return v_activity;
end;
$$;

revoke all on function public.create_crm_activity(
  uuid, uuid, uuid, uuid, text, text, text, text, text, timestamptz, text, uuid
) from public;
grant execute on function public.create_crm_activity(
  uuid, uuid, uuid, uuid, text, text, text, text, text, timestamptz, text, uuid
) to authenticated;

create or replace function public.complete_crm_activity(p_activity_id uuid)
returns public.crm_activities
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity public.crm_activities;
begin
  if not public.has_any_role(
    array['super_admin','manager','commercial','ops','finance','rh']::public.app_role[]
  ) then
    raise exception 'Accès CRM refusé';
  end if;

  update public.crm_activities
  set status = 'done', updated_at = now()
  where id = p_activity_id
  returning * into v_activity;

  if v_activity.id is null then
    raise exception 'Activité introuvable';
  end if;

  perform public.write_audit_log(
    'complete',
    'crm_activity',
    v_activity.id::text,
    jsonb_build_object('completed_at', now())
  );

  return v_activity;
end;
$$;

revoke all on function public.complete_crm_activity(uuid) from public;
grant execute on function public.complete_crm_activity(uuid) to authenticated;

create or replace function public.create_partner_prospect(
  p_legal_name text,
  p_category text,
  p_primary_contact_name text default null,
  p_primary_contact_phone text default null,
  p_primary_contact_email text default null,
  p_city text default null,
  p_notes text default null,
  p_diagnostic jsonb default '{}'::jsonb,
  p_next_action_at timestamptz default null,
  p_next_action_label text default null,
  p_next_action_assignee uuid default null
)
returns public.partner_organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner public.partner_organizations;
  v_activity public.crm_activities;
begin
  if not public.has_any_role(
    array['super_admin','manager','commercial','ops']::public.app_role[]
  ) then
    raise exception 'Création de prospect partenaire refusée';
  end if;

  if nullif(btrim(coalesce(p_legal_name, '')), '') is null then
    raise exception 'La raison sociale est requise';
  end if;

  if p_category not in ('hotel','conciergerie','travel_agency','enterprise','other') then
    raise exception 'Catégorie partenaire invalide';
  end if;

  insert into public.partner_organizations (
    relation_kind, category, certification_status,
    legal_name, primary_contact_name, primary_contact_phone,
    primary_contact_email, city, diagnostic, notes, created_by
  )
  values (
    'commercial', p_category, 'prospect',
    btrim(p_legal_name), nullif(btrim(coalesce(p_primary_contact_name, '')), ''),
    nullif(btrim(coalesce(p_primary_contact_phone, '')), ''),
    nullif(btrim(coalesce(p_primary_contact_email, '')), ''),
    nullif(btrim(coalesce(p_city, '')), ''),
    coalesce(p_diagnostic, '{}'::jsonb),
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning * into v_partner;

  insert into public.crm_activities (
    partner_org_id, channel, direction, motif, subject, message,
    handled_by, next_action_at, next_action_label,
    next_action_assignee, status
  )
  values (
    v_partner.id, 'autre', 'internal', 'prospect_partenaire',
    'Création du prospect partenaire', v_partner.notes,
    auth.uid(), p_next_action_at,
    nullif(btrim(coalesce(p_next_action_label, '')), ''),
    coalesce(p_next_action_assignee, auth.uid()), 'open'
  )
  returning * into v_activity;

  perform public.write_audit_log(
    'create',
    'partner_organization',
    v_partner.id::text,
    jsonb_build_object(
      'matricule', v_partner.matricule,
      'category', v_partner.category,
      'certification_status', v_partner.certification_status,
      'crm_activity_id', v_activity.id
    )
  );

  return v_partner;
end;
$$;

revoke all on function public.create_partner_prospect(
  text, text, text, text, text, text, text, jsonb, timestamptz, text, uuid
) from public;
grant execute on function public.create_partner_prospect(
  text, text, text, text, text, text, text, jsonb, timestamptz, text, uuid
) to authenticated;
