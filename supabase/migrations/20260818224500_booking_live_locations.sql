-- Suivi live chauffeur/client sur une réservation en cours. Remplace l'ancienne infrastructure
-- frontend "trip_locations" (jamais branchée : la table n'existait pas en base) par une table
-- proprement scopée sur `bookings`, cohérente avec le modèle flotte directe SentraJet Premium.

create table if not exists public.booking_locations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  role text not null check (role in ('client', 'driver')),
  lat double precision not null,
  lng double precision not null,
  accuracy_m numeric,
  heading_deg numeric,
  speed_kmh numeric,
  created_at timestamptz not null default now()
);

create index if not exists booking_locations_booking_id_created_at_idx
  on public.booking_locations (booking_id, created_at desc);

alter table public.booking_locations enable row level security;

create policy "booking_locations_insert_participant" on public.booking_locations
for insert to authenticated
with check (
  (
    role = 'client'
    and exists (
      select 1 from public.bookings b
      join public.clients c on c.id = b.client_id
      where b.id = booking_locations.booking_id and c.user_id = auth.uid()
    )
  )
  or (
    role = 'driver'
    and exists (
      select 1 from public.bookings b
      join public.service_orders so on so.booking_id = b.id
      join public.dispatch_assignments da on da.service_order_id = so.id
      join public.drivers d on d.id = da.driver_id
      where b.id = booking_locations.booking_id and d.user_id = auth.uid()
    )
  )
);

create policy "booking_locations_read_participant_or_staff" on public.booking_locations
for select to authenticated
using (
  has_any_role(array['super_admin', 'manager', 'ops', 'commercial']::app_role[])
  or exists (
    select 1 from public.bookings b
    join public.clients c on c.id = b.client_id
    where b.id = booking_locations.booking_id and c.user_id = auth.uid()
  )
  or exists (
    select 1 from public.bookings b
    join public.service_orders so on so.booking_id = b.id
    join public.dispatch_assignments da on da.service_order_id = so.id
    join public.drivers d on d.id = da.driver_id
    where b.id = booking_locations.booking_id and d.user_id = auth.uid()
  )
);

-- Pas de policy UPDATE/DELETE : historique de position immuable, purgé uniquement par le job
-- planifié ci-dessous.

alter publication supabase_realtime add table public.booking_locations;

create or replace function public.purge_old_booking_locations()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.booking_locations where created_at < now() - interval '2 days';
$$;

revoke all on function public.purge_old_booking_locations() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('purge-old-booking-locations-daily');
exception when others then
  null;
end $$;

select cron.schedule(
  'purge-old-booking-locations-daily',
  '30 3 * * *',
  $$select public.purge_old_booking_locations();$$
);
