-- Corrige la référence à la catégorie business_rules dans book_allo_dakar_seats : elle pointait
-- encore vers 'intercity' après le renommage de la catégorie en 'allo_dakar'.

create or replace function public.book_allo_dakar_seats(
  p_departure_id uuid,
  p_client_full_name text,
  p_client_phone text,
  p_seats integer
)
returns public.allo_dakar_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_departure public.allo_dakar_departures%rowtype;
  v_commission_percent numeric;
  v_amount integer;
  v_commission integer;
  v_booking public.allo_dakar_bookings%rowtype;
begin
  if p_seats is null or p_seats < 1 then
    raise exception 'invalid_seats';
  end if;

  select * into v_departure
  from public.allo_dakar_departures
  where id = p_departure_id
  for update;

  if not found then
    raise exception 'departure_not_found';
  end if;

  if v_departure.status not in ('publie') then
    raise exception 'departure_not_bookable';
  end if;

  if v_departure.seats_available < p_seats then
    raise exception 'not_enough_seats';
  end if;

  select coalesce((value_json #>> '{}')::numeric, 10)
  into v_commission_percent
  from public.business_rules
  where category = 'allo_dakar' and rule_key = 'commission_percent' and is_active
  limit 1;

  v_amount := v_departure.price_per_seat_fcfa * p_seats;
  v_commission := round(v_amount * coalesce(v_commission_percent, 10) / 100.0);

  update public.allo_dakar_departures
  set seats_available = seats_available - p_seats,
      status = case when seats_available - p_seats <= 0 then 'complet' else status end,
      updated_at = now()
  where id = p_departure_id;

  insert into public.allo_dakar_bookings (
    departure_id, client_user_id, client_full_name, client_phone, seats_booked,
    amount_fcfa, commission_fcfa, driver_payout_fcfa, payment_status, status
  ) values (
    p_departure_id, auth.uid(), p_client_full_name, p_client_phone, p_seats,
    v_amount, v_commission, v_amount - v_commission, 'pending', 'confirmee'
  )
  returning * into v_booking;

  return v_booking;
end;
$$;
