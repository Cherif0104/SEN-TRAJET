-- Upload de la carte grise + workflow de validation pour les véhicules Allo Dakar. La validation
-- est une action du gestionnaire de garage (ou du staff) — jamais du chauffeur lui-même, via une
-- RPC dédiée plutôt qu'une simple colonne modifiable par la policy UPDATE générale.

alter table public.allo_dakar_vehicles add column if not exists grey_card_url text;
alter table public.allo_dakar_vehicles add column if not exists rejection_reason text;
alter table public.allo_dakar_vehicles add column if not exists verified_at timestamptz;

insert into storage.buckets (id, name, public)
values ('allo-dakar-documents', 'allo-dakar-documents', false)
on conflict (id) do nothing;

create policy "allo_dakar_documents_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'allo-dakar-documents'
  and (
    has_any_role(array['super_admin', 'manager', 'ops']::app_role[])
    or exists (
      select 1 from public.allo_dakar_drivers d
      where d.user_id = auth.uid() and (storage.foldername(name))[1] = d.id::text
    )
    or exists (
      select 1 from public.allo_dakar_drivers d
      join public.allo_dakar_garages g on g.id = d.garage_id
      where g.manager_user_id = auth.uid() and (storage.foldername(name))[1] = d.id::text
    )
  )
);

create policy "allo_dakar_documents_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'allo-dakar-documents'
  and (
    has_any_role(array['super_admin', 'manager', 'ops']::app_role[])
    or exists (
      select 1 from public.allo_dakar_drivers d
      where d.user_id = auth.uid() and (storage.foldername(name))[1] = d.id::text
    )
    or exists (
      select 1 from public.allo_dakar_drivers d
      join public.allo_dakar_garages g on g.id = d.garage_id
      where g.manager_user_id = auth.uid() and (storage.foldername(name))[1] = d.id::text
    )
  )
);

create or replace function public.verify_allo_dakar_vehicle(
  p_vehicle_id uuid,
  p_approved boolean,
  p_reason text default null
)
returns public.allo_dakar_vehicles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicle public.allo_dakar_vehicles%rowtype;
  v_authorized boolean;
begin
  select * into v_vehicle from public.allo_dakar_vehicles where id = p_vehicle_id;
  if not found then
    raise exception 'vehicle_not_found';
  end if;

  select
    has_any_role(array['super_admin', 'manager', 'ops']::app_role[])
    or exists (
      select 1 from public.allo_dakar_drivers d
      join public.allo_dakar_garages g on g.id = d.garage_id
      where d.id = v_vehicle.allo_dakar_driver_id and g.manager_user_id = auth.uid()
    )
  into v_authorized;

  if not v_authorized then
    raise exception 'not_authorized';
  end if;

  update public.allo_dakar_vehicles
  set is_verified = p_approved,
      rejection_reason = case when p_approved then null else p_reason end,
      verified_at = now()
  where id = p_vehicle_id
  returning * into v_vehicle;

  return v_vehicle;
end;
$$;

revoke all on function public.verify_allo_dakar_vehicle(uuid, boolean, text) from public;
grant execute on function public.verify_allo_dakar_vehicle(uuid, boolean, text) to authenticated;
