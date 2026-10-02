-- Espace Gestionnaire de garage pour SentraJet Allo Dakar : un garage peut regrouper plusieurs
-- chauffeurs (certains sans compte SentraJet propre — le gestionnaire agit alors pour leur
-- compte), avec une vue consolidée pour le gestionnaire et pour le staff SentraJet.

create table if not exists public.allo_dakar_garages (
  id uuid primary key default gen_random_uuid(),
  manager_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  city text,
  status text not null default 'en_attente' check (status in ('en_attente', 'actif', 'suspendu')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists allo_dakar_garages_manager_unique on public.allo_dakar_garages (manager_user_id);

alter table public.allo_dakar_drivers add column if not exists garage_id uuid references public.allo_dakar_garages(id) on delete set null;
create index if not exists allo_dakar_drivers_garage_idx on public.allo_dakar_drivers (garage_id);

alter table public.allo_dakar_garages enable row level security;

create policy "allo_dakar_garages_select_own_or_staff" on public.allo_dakar_garages
for select to authenticated
using (manager_user_id = auth.uid() or has_any_role(array['super_admin', 'manager', 'ops']::app_role[]));

create policy "allo_dakar_garages_insert_own_or_staff" on public.allo_dakar_garages
for insert to authenticated
with check (manager_user_id = auth.uid() or has_any_role(array['super_admin', 'manager', 'ops']::app_role[]));

create policy "allo_dakar_garages_update_own_or_staff" on public.allo_dakar_garages
for update to authenticated
using (manager_user_id = auth.uid() or has_any_role(array['super_admin', 'manager', 'ops']::app_role[]))
with check (manager_user_id = auth.uid() or has_any_role(array['super_admin', 'manager', 'ops']::app_role[]));

-- Le gestionnaire de garage peut aussi gérer les chauffeurs/véhicules/départs rattachés à SON
-- garage (en plus de ses propres policies déjà existantes pour un chauffeur individuel).
create policy "allo_dakar_drivers_select_garage_manager" on public.allo_dakar_drivers
for select to authenticated
using (
  garage_id is not null
  and exists (select 1 from public.allo_dakar_garages g where g.id = allo_dakar_drivers.garage_id and g.manager_user_id = auth.uid())
);

create policy "allo_dakar_drivers_write_garage_manager" on public.allo_dakar_drivers
for all to authenticated
using (
  garage_id is not null
  and exists (select 1 from public.allo_dakar_garages g where g.id = allo_dakar_drivers.garage_id and g.manager_user_id = auth.uid())
)
with check (
  garage_id is not null
  and exists (select 1 from public.allo_dakar_garages g where g.id = allo_dakar_drivers.garage_id and g.manager_user_id = auth.uid())
);

create policy "allo_dakar_vehicles_select_garage_manager" on public.allo_dakar_vehicles
for select to authenticated
using (
  exists (
    select 1 from public.allo_dakar_drivers d
    join public.allo_dakar_garages g on g.id = d.garage_id
    where d.id = allo_dakar_vehicles.allo_dakar_driver_id and g.manager_user_id = auth.uid()
  )
);

create policy "allo_dakar_vehicles_write_garage_manager" on public.allo_dakar_vehicles
for all to authenticated
using (
  exists (
    select 1 from public.allo_dakar_drivers d
    join public.allo_dakar_garages g on g.id = d.garage_id
    where d.id = allo_dakar_vehicles.allo_dakar_driver_id and g.manager_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.allo_dakar_drivers d
    join public.allo_dakar_garages g on g.id = d.garage_id
    where d.id = allo_dakar_vehicles.allo_dakar_driver_id and g.manager_user_id = auth.uid()
  )
);

create policy "allo_dakar_departures_select_garage_manager" on public.allo_dakar_departures
for select to authenticated
using (
  exists (
    select 1 from public.allo_dakar_drivers d
    join public.allo_dakar_garages g on g.id = d.garage_id
    where d.id = allo_dakar_departures.allo_dakar_driver_id and g.manager_user_id = auth.uid()
  )
);

create policy "allo_dakar_subscriptions_select_garage_manager" on public.allo_dakar_driver_subscriptions
for select to authenticated
using (
  exists (
    select 1 from public.allo_dakar_drivers d
    join public.allo_dakar_garages g on g.id = d.garage_id
    where d.id = allo_dakar_driver_subscriptions.allo_dakar_driver_id and g.manager_user_id = auth.uid()
  )
);

create policy "allo_dakar_bookings_select_garage_manager" on public.allo_dakar_bookings
for select to authenticated
using (
  exists (
    select 1 from public.allo_dakar_departures dep
    join public.allo_dakar_drivers d on d.id = dep.allo_dakar_driver_id
    join public.allo_dakar_garages g on g.id = d.garage_id
    where dep.id = allo_dakar_bookings.departure_id and g.manager_user_id = auth.uid()
  )
);
