-- Prevent users from changing authorization or verification fields on their own
-- profile through the Data API. Internal staff roles retain their review powers.

create or replace function public.protect_profile_authorization_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_is_internal boolean;
  v_is_pending_driver_transition boolean;
begin
  if auth.uid() is null or auth.uid() <> old.id then
    return new;
  end if;

  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = any (
        array[
          'super_admin'::public.app_role,
          'manager'::public.app_role,
          'rh'::public.app_role,
          'ops'::public.app_role
        ]
      )
  ) into v_is_internal;

  if v_is_internal then
    return new;
  end if;

  if new.is_verified is distinct from old.is_verified
     or new.average_rating is distinct from old.average_rating
     or new.total_reviews is distinct from old.total_reviews then
    raise exception 'protected_profile_field' using errcode = '42501';
  end if;

  if new.role is distinct from old.role then
    select old.role = 'client'
      and new.role = 'driver'
      and exists (
        select 1
        from public.drivers d
        where d.user_id = auth.uid()
          and d.status = 'pending'
      )
    into v_is_pending_driver_transition;

    if not coalesce(v_is_pending_driver_transition, false) then
      raise exception 'profile_role_change_not_allowed' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_authorization_fields_trigger on public.profiles;
create trigger protect_profile_authorization_fields_trigger
before update on public.profiles
for each row execute function public.protect_profile_authorization_fields();

revoke all on function public.protect_profile_authorization_fields() from public;
revoke all on function public.protect_profile_authorization_fields() from anon;
revoke all on function public.protect_profile_authorization_fields() from authenticated;

-- Reorder the pending driver creation before the protected role transition.
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
