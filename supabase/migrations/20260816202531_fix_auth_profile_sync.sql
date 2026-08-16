-- Garantit qu'un compte Auth possède toujours un profil et un rôle métier.
-- La fonction existait dans le projet, mais aucun trigger n'était attaché.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'client'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'client'::public.app_role)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Répare les comptes créés pendant la période sans trigger.
insert into public.profiles (id, full_name, phone, role)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  nullif(u.raw_user_meta_data ->> 'phone', ''),
  coalesce(
    (
      select case
        when ur.role::text in ('manager', 'ops', 'finance', 'rh', 'fleet_manager') then 'admin'
        when ur.role::text = 'provider' then 'partner'
        else ur.role::text
      end
      from public.user_roles ur
      where ur.user_id = u.id
      order by case ur.role::text
        when 'super_admin' then 1
        when 'manager' then 2
        when 'ops' then 3
        when 'commercial' then 4
        when 'finance' then 5
        when 'rh' then 6
        when 'fleet_manager' then 7
        when 'partner' then 8
        when 'provider' then 9
        when 'driver' then 10
        else 20
      end
      limit 1
    ),
    'client'
  )
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

update public.profiles p
set role = coalesce(
  (
    select case
      when ur.role::text in ('manager', 'ops', 'finance', 'rh', 'fleet_manager') then 'admin'
      when ur.role::text = 'provider' then 'partner'
      else ur.role::text
    end
    from public.user_roles ur
    where ur.user_id = p.id
    order by case ur.role::text
      when 'super_admin' then 1
      when 'manager' then 2
      when 'ops' then 3
      when 'commercial' then 4
      when 'finance' then 5
      when 'rh' then 6
      when 'fleet_manager' then 7
      when 'partner' then 8
      when 'provider' then 9
      when 'driver' then 10
      else 20
    end
    limit 1
  ),
  'client'
)
where p.role is null;
