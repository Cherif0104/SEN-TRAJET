alter table public.bookings
  add column if not exists ride_class text;

alter table public.bookings
  drop constraint if exists bookings_ride_class_check;
alter table public.bookings
  add constraint bookings_ride_class_check
  check (ride_class is null or ride_class in ('comfort', 'comfort_plus', 'vip'));

insert into public.business_rules(category, rule_key, label, value_json, unit, is_active, notes)
values
  ('live_pricing', 'comfort_minimum_fcfa', 'Minimum course Comfort', '1000', 'FCFA', true, '1 km et 4 minutes inclus'),
  ('live_pricing', 'comfort_plus_minimum_fcfa', 'Minimum course Comfort Plus', '1500', 'FCFA', true, '1 km et 4 minutes inclus'),
  ('live_pricing', 'vip_minimum_fcfa', 'Minimum course VIP', '2500', 'FCFA', true, '1 km et 4 minutes inclus'),
  ('live_pricing', 'night_start_hour', 'Début du tarif de nuit', '22', 'heure', true, null),
  ('live_pricing', 'night_end_hour', 'Fin du tarif de nuit', '6', 'heure', true, null),
  ('live_pricing', 'night_minimum_fee_fcfa', 'Supplément nuit minimum', '1000', 'FCFA', true, null),
  ('live_pricing', 'night_percent', 'Supplément nuit proportionnel', '20', 'pourcentage', true, null),
  ('live_pricing', 'maximum_demand_percent', 'Plafond forte demande', '30', 'pourcentage', true, null)
on conflict (category, rule_key) do update
set label = excluded.label,
    value_json = excluded.value_json,
    unit = excluded.unit,
    is_active = excluded.is_active,
    notes = excluded.notes,
    updated_at = now();

alter table public.driver_live_status
  drop constraint if exists driver_live_status_services_check;
alter table public.driver_live_status
  add constraint driver_live_status_services_check
  check (
    available_services
    <@ array['course_urbaine', 'taxi_aeroport', 'premium', 'allo_dakar']::text[]
  );

create or replace function public.set_driver_live_status(
  p_is_online boolean,
  p_lat double precision default null,
  p_lng double precision default null,
  p_accuracy_m double precision default null,
  p_heading double precision default null,
  p_available_services text[] default array['course_urbaine', 'taxi_aeroport']::text[]
)
returns public.driver_live_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid;
  v_result public.driver_live_status;
begin
  select id into v_driver_id
  from public.drivers
  where user_id = auth.uid();

  if v_driver_id is null then
    raise exception 'driver_profile_required';
  end if;

  if p_is_online and (
    p_lat is null or p_lng is null
    or p_lat not between -90 and 90
    or p_lng not between -180 and 180
  ) then
    raise exception 'valid_position_required';
  end if;

  if not (
    coalesce(p_available_services, array[]::text[])
    <@ array['course_urbaine', 'taxi_aeroport', 'premium', 'allo_dakar']::text[]
  ) then
    raise exception 'invalid_service';
  end if;

  insert into public.driver_live_status (
    driver_id, is_online, available_services, lat, lng, accuracy_m, heading,
    last_seen_at, updated_at
  )
  values (
    v_driver_id,
    p_is_online,
    coalesce(p_available_services, array['course_urbaine', 'taxi_aeroport']::text[]),
    case when p_is_online then p_lat else null end,
    case when p_is_online then p_lng else null end,
    case when p_is_online then p_accuracy_m else null end,
    case when p_is_online then p_heading else null end,
    case when p_is_online then now() else null end,
    now()
  )
  on conflict (driver_id) do update set
    is_online = excluded.is_online,
    available_services = excluded.available_services,
    lat = excluded.lat,
    lng = excluded.lng,
    accuracy_m = excluded.accuracy_m,
    heading = excluded.heading,
    last_seen_at = excluded.last_seen_at,
    updated_at = now()
  returning * into v_result;

  update public.drivers
  set status = case when p_is_online then 'available' else 'offline' end,
      updated_at = now()
  where id = v_driver_id
    and lower(status) not in ('on_trip', 'suspendu', 'suspended', 'inactive');

  return v_result;
end;
$$;

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
    and live.last_seen_at >= now() - interval '2 minutes'
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
        else vehicle.service_class::text in ('confort', 'confort_plus', 'premium', 'premium_plus')
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
