-- RPC de réservation atomique (évite la survente de places en cas d'accès concurrent) + calcul
-- de la commission à la source, conformément au modèle validé : la commission SentraJet est
-- retenue dès l'encaissement, jamais soumise à une déclaration ultérieure du chauffeur.

create or replace function public.book_intercity_seats(
  p_departure_id uuid,
  p_client_full_name text,
  p_client_phone text,
  p_seats integer
)
returns public.intercity_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_departure public.intercity_departures%rowtype;
  v_commission_percent numeric;
  v_amount integer;
  v_commission integer;
  v_booking public.intercity_bookings%rowtype;
begin
  if p_seats is null or p_seats < 1 then
    raise exception 'invalid_seats';
  end if;

  select * into v_departure
  from public.intercity_departures
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
  where category = 'intercity' and rule_key = 'commission_percent' and is_active
  limit 1;

  v_amount := v_departure.price_per_seat_fcfa * p_seats;
  v_commission := round(v_amount * coalesce(v_commission_percent, 10) / 100.0);

  update public.intercity_departures
  set seats_available = seats_available - p_seats,
      status = case when seats_available - p_seats <= 0 then 'complet' else status end,
      updated_at = now()
  where id = p_departure_id;

  insert into public.intercity_bookings (
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

revoke all on function public.book_intercity_seats(uuid, text, text, integer) from public;
grant execute on function public.book_intercity_seats(uuid, text, text, integer) to anon, authenticated;

-- Annulation d'une réservation par son auteur (ou le staff) : restitue les places.
create or replace function public.cancel_intercity_booking(p_booking_id uuid)
returns public.intercity_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.intercity_bookings%rowtype;
  v_is_staff boolean;
begin
  select has_any_role(array['super_admin', 'manager', 'ops']::app_role[]) into v_is_staff;

  select * into v_booking from public.intercity_bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found';
  end if;

  if not v_is_staff and (v_booking.client_user_id is null or v_booking.client_user_id <> auth.uid()) then
    raise exception 'not_authorized';
  end if;

  if v_booking.status = 'annulee' then
    return v_booking;
  end if;

  update public.intercity_bookings
  set status = 'annulee', payment_status = case when payment_status = 'paid' then 'refunded' else payment_status end, updated_at = now()
  where id = p_booking_id
  returning * into v_booking;

  update public.intercity_departures
  set seats_available = least(seats_total, seats_available + v_booking.seats_booked),
      status = case when status = 'complet' then 'publie' else status end,
      updated_at = now()
  where id = v_booking.departure_id;

  return v_booking;
end;
$$;

revoke all on function public.cancel_intercity_booking(uuid) from public;
grant execute on function public.cancel_intercity_booking(uuid) to authenticated;
