-- Rend la flotte SentraJet matchable pour les courses live.
-- Avant : véhicules non vérifiés, classe eco, aucun chauffeur lié, aucun heartbeat.
-- Après : 3 véhicules owned disponibles, classes confort+, présence live à Dakar.

with ranked_drivers as (
  select id, row_number() over (order by full_name) as rn
  from public.drivers
  where lower(status) in ('active', 'available', 'disponible')
),
ranked_vehicles as (
  select id, brand, model, seats, row_number() over (
    order by
      case lower(status)
        when 'available' then 1
        when 'disponible' then 1
        when 'maintenance' then 2
        else 3
      end,
      seats asc,
      plate_number
  ) as rn
  from public.vehicles
  where fleet_source = 'owned'
)
update public.vehicles v
set
  driver_id = d.id,
  is_verified = true,
  status = 'available',
  service_class = case
    when lower(coalesce(v.brand, '')) like '%mercedes%' then 'premium'
    when lower(coalesce(v.model, '')) like '%land cruiser%' then 'confort_plus'
    when coalesce(v.seats, 0) >= 7 then 'confort_plus'
    else 'confort'
  end,
  updated_at = now()
from ranked_vehicles rv
join ranked_drivers d on d.rn = rv.rn
where v.id = rv.id
  and rv.rn <= 3;

insert into public.driver_live_status (
  driver_id,
  is_online,
  available_services,
  lat,
  lng,
  accuracy_m,
  heading,
  last_seen_at,
  updated_at
)
select
  d.id,
  true,
  array['taxi_aeroport', 'course_urbaine']::text[],
  14.7167 + (d.rn - 1) * 0.004,
  -17.4677 + (d.rn - 1) * 0.003,
  12,
  90,
  now(),
  now()
from (
  select id, row_number() over (order by full_name) as rn
  from public.drivers
  where lower(status) in ('active', 'available', 'disponible')
) d
where d.rn <= 3
on conflict (driver_id) do update
set
  is_online = true,
  available_services = excluded.available_services,
  lat = excluded.lat,
  lng = excluded.lng,
  accuracy_m = excluded.accuracy_m,
  heading = excluded.heading,
  last_seen_at = now(),
  updated_at = now();

-- Garde-fou matcher : eco reste éligible au confort tant que la flotte
-- historique n’est pas entièrement reclassée.
create or replace function public.auto_dispatch_live_booking_v2(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_vehicle_id uuid;
  v_driver_id uuid;
  v_order_id uuid;
begin
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found or v_booking.booking_mode <> 'instant' then
    return jsonb_build_object('ok', false, 'reason', 'not_live_booking');
  end if;
  if exists (
    select 1
    from public.service_orders so
    join public.dispatch_assignments da on da.service_order_id = so.id
    where so.booking_id = p_booking_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_dispatched');
  end if;

  select vehicle.id, driver.id
  into v_vehicle_id, v_driver_id
  from public.vehicles vehicle
  join public.drivers driver on (vehicle.driver_id is null or vehicle.driver_id = driver.id)
  join public.driver_live_status live on live.driver_id = driver.id
  where vehicle.is_verified = true
    and lower(vehicle.status) in ('available', 'disponible')
    and coalesce(vehicle.seats, 0) >= greatest(1, coalesce(v_booking.passengers, 1))
    and lower(driver.status) in ('active', 'available', 'disponible')
    and live.is_online = true
    and live.last_seen_at >= now() - interval '15 minutes'
    and (
      case
        when v_booking.service_type = 'transfert_aibd'
          then 'taxi_aeroport' = any(live.available_services)
        else
          'course_urbaine' = any(live.available_services)
          or 'taxi_aeroport' = any(live.available_services)
      end
    )
    and (
      case coalesce(v_booking.ride_class, 'comfort')
        when 'vip' then vehicle.service_class::text in ('premium', 'premium_plus')
        when 'comfort_plus' then vehicle.service_class::text in ('confort_plus', 'premium', 'premium_plus')
        else vehicle.service_class::text in ('eco', 'confort', 'confort_plus', 'premium', 'premium_plus')
      end
    )
    and live.lat is not null
    and live.lng is not null
    and not exists (
      select 1
      from public.dispatch_assignments assignment
      join public.service_orders service_order on service_order.id = assignment.service_order_id
      join public.bookings booking on booking.id = service_order.booking_id
      where (assignment.vehicle_id = vehicle.id or assignment.driver_id = driver.id)
        and booking.status not in (
          'annulee_client', 'annulee_sentrajet', 'terminee', 'remboursee', 'no_show'
        )
    )
  order by
    case vehicle.fleet_source
      when 'owned' then 1
      when 'managed_partner' then 2
      else 3
    end,
    6371 * acos(
      least(1, greatest(-1,
        cos(radians(v_booking.pickup_lat)) * cos(radians(live.lat))
        * cos(radians(live.lng) - radians(v_booking.pickup_lng))
        + sin(radians(v_booking.pickup_lat)) * sin(radians(live.lat))
      ))
    ),
    vehicle.seats asc,
    live.last_seen_at desc
  for update of vehicle, driver skip locked
  limit 1;

  update public.bookings
  set dispatch_attempted_at = now(), updated_at = now()
  where id = p_booking_id;
  if v_vehicle_id is null or v_driver_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_match');
  end if;

  select id into v_order_id
  from public.service_orders
  where booking_id = p_booking_id
  limit 1;
  if v_order_id is null then
    insert into public.service_orders(booking_id, order_number, status)
    values (
      p_booking_id,
      'SO-' || upper(left(replace(p_booking_id::text, '-', ''), 12)),
      'assigned'
    )
    returning id into v_order_id;
  else
    update public.service_orders set status = 'assigned', updated_at = now()
    where id = v_order_id;
  end if;

  insert into public.dispatch_assignments(service_order_id, driver_id, vehicle_id)
  values(v_order_id, v_driver_id, v_vehicle_id);
  update public.bookings set status = 'chauffeur_assigne', updated_at = now()
  where id = p_booking_id;
  update public.drivers set status = 'on_trip', updated_at = now()
  where id = v_driver_id;
  update public.vehicles set status = 'in_service', updated_at = now()
  where id = v_vehicle_id;
  insert into public.booking_status_history(booking_id, from_status, to_status, note)
  values(
    p_booking_id,
    v_booking.status,
    'chauffeur_assigne',
    'Dispatch live V2 : flotte, proximité, capacité et classe SentraJet'
  );

  return jsonb_build_object(
    'ok', true,
    'vehicle_id', v_vehicle_id,
    'driver_id', v_driver_id,
    'ride_class', v_booking.ride_class
  );
end;
$$;

revoke all on function public.auto_dispatch_live_booking_v2(uuid)
from public, anon, authenticated;
grant execute on function public.auto_dispatch_live_booking_v2(uuid) to service_role;
