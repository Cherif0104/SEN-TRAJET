-- Liste des missions réalisées par les véhicules d'un propriétaire, sans exposer les
-- données commerciales (client, téléphone, prix) — uniquement l'utilisation opérationnelle,
-- conformément au principe "jamais de rentabilité inventée" du blueprint Espace Partenaire.

create or replace function public.list_owner_vehicle_missions(_vehicle_id uuid default null)
returns table (
  booking_id uuid,
  vehicle_id uuid,
  pickup text,
  dropoff text,
  pickup_time timestamptz,
  status text,
  distance_km numeric,
  service_type text
)
language sql
security definer
set search_path = public
stable
as $$
  select b.id, da.vehicle_id, b.pickup, b.dropoff, b.pickup_time, b.status, b.distance_km, b.service_type
  from public.bookings b
  join public.service_orders so on so.booking_id = b.id
  join public.dispatch_assignments da on da.service_order_id = so.id
  join public.vehicle_exploitation_contracts vec on vec.vehicle_id = da.vehicle_id
  join public.vehicle_owners vo on vo.id = vec.owner_id
  where vo.user_id = auth.uid()
    and (_vehicle_id is null or da.vehicle_id = _vehicle_id)
  order by b.pickup_time desc;
$$;

revoke all on function public.list_owner_vehicle_missions(uuid) from public, anon;
grant execute on function public.list_owner_vehicle_missions(uuid) to authenticated;
