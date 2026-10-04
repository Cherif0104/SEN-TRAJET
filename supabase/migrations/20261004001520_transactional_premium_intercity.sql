create or replace function public.create_premium_intercity_booking(
  p_user_id uuid,
  p_vehicle_id uuid,
  p_pickup text,
  p_dropoff text,
  p_pickup_time timestamptz,
  p_return_time timestamptz,
  p_trip_mode text,
  p_passengers integer,
  p_phone text,
  p_distance_km numeric,
  p_duration_minutes integer,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  client_uuid uuid;
  vehicle_row public.vehicles%rowtype;
  rate_fcfa integer;
  minimum_fcfa integer;
  multiplier numeric := 1;
  amount integer;
  end_time timestamptz;
  created_booking public.bookings%rowtype;
  created_payment public.payments%rowtype;
begin
  if p_trip_mode not in ('aller_simple', 'aller_retour')
     or p_distance_km <= 0
     or p_duration_minutes <= 0
     or p_pickup_time <= now() + interval '2 hours' then
    raise exception using errcode = '22023', message = 'intercity_input_invalid';
  end if;
  if p_trip_mode = 'aller_retour' and (p_return_time is null or p_return_time <= p_pickup_time) then
    raise exception using errcode = '22023', message = 'intercity_return_invalid';
  end if;

  select c.id into client_uuid from public.clients c where c.user_id = p_user_id limit 1;
  if client_uuid is null then
    raise exception using errcode = 'P0001', message = 'intercity_client_missing';
  end if;
  select v.* into vehicle_row
  from public.vehicles v
  join public.vip_vehicle_offers o on o.vehicle_id = v.id and o.status = 'active'
  where v.id = p_vehicle_id
    and v.fleet_source = 'owned'
    and lower(coalesce(v.status::text, '')) in ('available', 'in_service');
  if not found or p_passengers < 1 or p_passengers > coalesce(vehicle_row.seats, 0) then
    raise exception using errcode = 'P0001', message = 'intercity_vehicle_unavailable';
  end if;

  select amount_fcfa into rate_fcfa
  from public.sentrajet_tariffs
  where segment = 'client' and rule_key = 'interurbain_km' and is_active
  limit 1;
  select amount_fcfa into minimum_fcfa
  from public.sentrajet_tariffs
  where segment = 'client' and rule_key = 'interurbain_min' and is_active
  limit 1;
  if lower(coalesce(vehicle_row.category, '')) = 'vip' then multiplier := 1.35;
  elsif lower(coalesce(vehicle_row.category, '')) like '%van%' or coalesce(vehicle_row.seats, 0) >= 8 then multiplier := 1.20;
  elsif lower(coalesce(vehicle_row.category, '')) = 'premium' then multiplier := 1.10;
  end if;
  amount := greatest(
    coalesce(minimum_fcfa, 30000),
    ceil(p_distance_km * coalesce(rate_fcfa, 850) * multiplier
      * case when p_trip_mode = 'aller_retour' then 1.8 else 1 end / 500.0)::integer * 500
  );
  end_time := case
    when p_trip_mode = 'aller_retour' then p_return_time + make_interval(mins => p_duration_minutes)
    else p_pickup_time + make_interval(mins => p_duration_minutes + 120)
  end;

  insert into public.bookings (
    client_id, pickup, dropoff, pickup_time, service_type, passengers, phone,
    distance_km, estimated_price, final_amount_fcfa, requested_vehicle_id,
    service_end_time, is_round_trip, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
    reference, status, booking_mode, source, tariff_version_code
  ) values (
    client_uuid, trim(p_pickup), trim(p_dropoff), p_pickup_time, 'interurbain',
    p_passengers, nullif(trim(p_phone), ''), p_distance_km, amount, amount,
    p_vehicle_id, end_time, p_trip_mode = 'aller_retour',
    p_pickup_lat, p_pickup_lng, p_dropoff_lat, p_dropoff_lng,
    'SJ-REG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    'en_attente_de_paiement', 'scheduled', 'intercity_transactional', 'INTERCITY_V1'
  ) returning * into created_booking;

  insert into public.payments(booking_id, amount_fcfa, provider, booking_ref, status, meta)
  values(created_booking.id, amount, 'wave', created_booking.reference, 'pending',
    jsonb_build_object('service', 'interurbain', 'trip_mode', p_trip_mode))
  returning * into created_payment;

  return jsonb_build_object(
    'booking_id', created_booking.id, 'reference', created_booking.reference,
    'amount_fcfa', amount, 'payment_id', created_payment.id,
    'service_end_time', end_time
  );
end;
$$;

revoke all on function public.create_premium_intercity_booking(
  uuid, uuid, text, text, timestamptz, timestamptz, text, integer, text,
  numeric, integer, double precision, double precision, double precision, double precision
) from public, anon, authenticated;
grant execute on function public.create_premium_intercity_booking(
  uuid, uuid, text, text, timestamptz, timestamptz, text, integer, text,
  numeric, integer, double precision, double precision, double precision, double precision
) to service_role;
