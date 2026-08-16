-- Les utilisateurs peuvent modifier leurs informations de profil, mais jamais
-- leur rôle d'autorisation. Les changements de rôle passent par l'API serveur
-- avec la clé service_role ou par un super administrateur.
create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.role is distinct from old.role then
    if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
      return new;
    end if;

    if exists (
      select 1
      from public.user_roles
      where user_id = (select auth.uid())
        and role = 'super_admin'::public.app_role
    ) then
      return new;
    end if;

    raise exception 'profile_role_change_forbidden'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_profile_role_change() from public;
revoke all on function public.guard_profile_role_change() from anon;
revoke all on function public.guard_profile_role_change() from authenticated;

drop trigger if exists guard_profile_role_change on public.profiles;
create trigger guard_profile_role_change
before update of role on public.profiles
for each row
execute function public.guard_profile_role_change();
