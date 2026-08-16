create unique index if not exists drivers_user_id_idx
  on public.drivers(user_id)
  where user_id is not null;

drop policy if exists "vehicles_driver_manage_own" on public.vehicles;
create policy "vehicles_driver_manage_own"
on public.vehicles for all to authenticated
using (
  exists (
    select 1
    from public.drivers
    where drivers.id = vehicles.driver_id
      and drivers.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.drivers
    where drivers.id = vehicles.driver_id
      and drivers.user_id = (select auth.uid())
  )
);
