-- Open driver enrollment without trusting editable auth user metadata for authorization.
-- Every Auth signup starts as client; this narrow RPC can only promote the caller
-- to a pending driver application. Ops validation remains mandatory.

create or replace function public.register_driver_application()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_driver public.drivers%rowtype;
  v_email text;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if coalesce(v_profile.role, 'client') not in ('client', 'driver') then
    raise exception 'role_change_not_allowed' using errcode = '42501';
  end if;

  select email
  into v_email
  from auth.users
  where id = v_user_id;

  update public.profiles
  set role = 'driver',
      updated_at = now()
  where id = v_user_id;

  delete from public.user_roles
  where user_id = v_user_id
    and role = 'client'::public.app_role;

  insert into public.user_roles (user_id, role)
  values (v_user_id, 'driver'::public.app_role)
  on conflict (user_id, role) do nothing;

  insert into public.drivers (user_id, full_name, phone, email, status)
  values (
    v_user_id,
    coalesce(nullif(trim(v_profile.full_name), ''), 'Chauffeur SentraJet'),
    v_profile.phone,
    v_email,
    'pending'
  )
  on conflict (user_id) do update
  set full_name = excluded.full_name,
      phone = coalesce(excluded.phone, public.drivers.phone),
      email = coalesce(excluded.email, public.drivers.email),
      updated_at = now()
  returning * into v_driver;

  return jsonb_build_object(
    'driver_id', v_driver.id,
    'status', v_driver.status,
    'role', 'driver'
  );
end;
$$;

revoke all on function public.register_driver_application() from public;
revoke all on function public.register_driver_application() from anon;
grant execute on function public.register_driver_application() to authenticated;

comment on function public.register_driver_application() is
  'Promotes the authenticated client to a pending driver application; never grants internal roles.';
