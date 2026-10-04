create table if not exists public.voyager_operators (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null unique,
  display_name text not null,
  operator_kind text not null
    check (operator_kind in ('compagnie', 'agence', 'transporteur', 'horaires')),
  status text not null default 'en_attente'
    check (status in ('en_attente', 'actif', 'suspendu')),
  contact_phone text not null,
  contact_email text,
  payout_wave_mobile text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voyager_lines (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.voyager_operators(id) on delete cascade,
  origin_city text not null,
  destination_city text not null,
  region_label text,
  boarding_point text not null,
  arrival_point text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists voyager_lines_identity_idx
  on public.voyager_lines(
    operator_id,
    lower(origin_city),
    lower(destination_city),
    lower(boarding_point)
  );

create table if not exists public.voyager_departures (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.voyager_lines(id) on delete cascade,
  departure_at timestamptz not null,
  vehicle_type text not null
    check (vehicle_type in ('citadine', 'berline', 'suv', 'minivan', 'minibus', 'bus')),
  vehicle_label text,
  seats_total integer not null check (seats_total between 1 and 60),
  seats_available integer not null check (seats_available between 0 and 60),
  price_per_seat_fcfa integer not null check (price_per_seat_fcfa > 0),
  status text not null default 'publie'
    check (status in ('publie', 'complet', 'annule', 'termine')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voyager_departures_capacity_check check (seats_available <= seats_total)
);

create index if not exists voyager_departures_search_idx
  on public.voyager_departures(departure_at, status, seats_available);

create table if not exists public.voyager_bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'SJ-VG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  departure_id uuid not null references public.voyager_departures(id) on delete restrict,
  client_user_id uuid not null references auth.users(id) on delete cascade,
  client_full_name text not null,
  client_phone text not null,
  seats_booked integer not null check (seats_booked between 1 and 10),
  amount_fcfa integer not null check (amount_fcfa > 0),
  commission_fcfa integer not null default 0 check (commission_fcfa >= 0),
  operator_payout_fcfa integer not null default 0 check (operator_payout_fcfa >= 0),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  payment_provider_ref text,
  status text not null default 'reservee'
    check (status in ('reservee', 'confirmee', 'annulee', 'terminee', 'expiree')),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voyager_bookings_client_idx
  on public.voyager_bookings(client_user_id, created_at desc);
create index if not exists voyager_bookings_departure_idx
  on public.voyager_bookings(departure_id, status);

insert into public.business_rules(category, rule_key, label, value_json, unit, is_active, notes)
values
  ('voyager', 'commission_percent', 'Commission Voyager', '12', 'pourcentage', true, 'Retenue SentraJet sur chaque place'),
  ('voyager', 'booking_cutoff_minutes', 'Clôture réservation Voyager', '30', 'minutes', true, 'Délai avant le départ'),
  ('voyager', 'payment_hold_minutes', 'Blocage temporaire des places', '15', 'minutes', true, 'Places libérées sans paiement')
on conflict (category, rule_key) do update
set label = excluded.label,
    value_json = excluded.value_json,
    unit = excluded.unit,
    is_active = excluded.is_active,
    notes = excluded.notes,
    updated_at = now();

create or replace function public.expire_voyager_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_departures integer := 0;
begin
  with expired as (
    update public.voyager_bookings
    set status = 'expiree',
        payment_status = 'failed',
        updated_at = now()
    where status = 'reservee'
      and payment_status = 'pending'
      and expires_at <= now()
    returning departure_id, seats_booked
  ),
  restored as (
    select departure_id, sum(seats_booked)::integer as seats
    from expired
    group by departure_id
  )
  update public.voyager_departures departure
  set seats_available = least(departure.seats_total, departure.seats_available + restored.seats),
      status = case when departure.status = 'complet' then 'publie' else departure.status end,
      updated_at = now()
  from restored
  where departure.id = restored.departure_id;
  get diagnostics v_departures = row_count;
  return v_departures;
end;
$$;

create or replace function public.book_voyager_seats(
  p_departure_id uuid,
  p_client_user_id uuid,
  p_client_full_name text,
  p_client_phone text,
  p_seats integer
)
returns public.voyager_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_departure public.voyager_departures%rowtype;
  v_booking public.voyager_bookings%rowtype;
  v_commission_percent numeric := 12;
  v_cutoff_minutes integer := 30;
  v_hold_minutes integer := 15;
  v_amount integer;
  v_commission integer;
begin
  if p_client_user_id is null
    or nullif(trim(p_client_full_name), '') is null
    or length(regexp_replace(coalesce(p_client_phone, ''), '[^0-9]', '', 'g')) < 9
    or p_seats not between 1 and 10 then
    raise exception 'voyager_booking_invalid';
  end if;

  perform public.expire_voyager_bookings();

  select * into v_departure
  from public.voyager_departures
  where id = p_departure_id
  for update;

  if not found then raise exception 'voyager_departure_not_found'; end if;
  if v_departure.status <> 'publie' then raise exception 'voyager_departure_not_bookable'; end if;

  select coalesce((value_json #>> '{}')::numeric, 12)
  into v_commission_percent
  from public.business_rules
  where category = 'voyager' and rule_key = 'commission_percent' and is_active
  limit 1;
  select coalesce((value_json #>> '{}')::integer, 30)
  into v_cutoff_minutes
  from public.business_rules
  where category = 'voyager' and rule_key = 'booking_cutoff_minutes' and is_active
  limit 1;
  select coalesce((value_json #>> '{}')::integer, 15)
  into v_hold_minutes
  from public.business_rules
  where category = 'voyager' and rule_key = 'payment_hold_minutes' and is_active
  limit 1;

  if v_departure.departure_at <= now() + make_interval(mins => coalesce(v_cutoff_minutes, 30)) then
    raise exception 'voyager_booking_closed';
  end if;
  if v_departure.seats_available < p_seats then
    raise exception 'voyager_not_enough_seats';
  end if;

  v_amount := v_departure.price_per_seat_fcfa * p_seats;
  v_commission := round(v_amount * coalesce(v_commission_percent, 12) / 100.0);

  insert into public.voyager_bookings(
    departure_id,
    client_user_id,
    client_full_name,
    client_phone,
    seats_booked,
    amount_fcfa,
    commission_fcfa,
    operator_payout_fcfa,
    expires_at
  )
  values(
    p_departure_id,
    p_client_user_id,
    trim(p_client_full_name),
    trim(p_client_phone),
    p_seats,
    v_amount,
    v_commission,
    v_amount - v_commission,
    now() + make_interval(mins => coalesce(v_hold_minutes, 15))
  )
  returning * into v_booking;

  update public.voyager_departures
  set seats_available = seats_available - p_seats,
      status = case when seats_available - p_seats = 0 then 'complet' else status end,
      updated_at = now()
  where id = p_departure_id;

  return v_booking;
end;
$$;

create or replace function public.finalize_voyager_payment(
  p_booking_id uuid,
  p_succeeded boolean,
  p_provider_ref text default null
)
returns public.voyager_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.voyager_bookings%rowtype;
begin
  select * into v_booking
  from public.voyager_bookings
  where id = p_booking_id
  for update;
  if not found then raise exception 'voyager_booking_not_found'; end if;
  if v_booking.status <> 'reservee' or v_booking.payment_status <> 'pending' then
    return v_booking;
  end if;

  if p_succeeded then
    update public.voyager_bookings
    set status = 'confirmee',
        payment_status = 'paid',
        payment_provider_ref = coalesce(p_provider_ref, payment_provider_ref),
        paid_at = now(),
        updated_at = now()
    where id = p_booking_id
    returning * into v_booking;
  else
    update public.voyager_bookings
    set status = 'annulee',
        payment_status = 'failed',
        payment_provider_ref = coalesce(p_provider_ref, payment_provider_ref),
        updated_at = now()
    where id = p_booking_id
    returning * into v_booking;
    update public.voyager_departures
    set seats_available = least(seats_total, seats_available + v_booking.seats_booked),
        status = case when status = 'complet' then 'publie' else status end,
        updated_at = now()
    where id = v_booking.departure_id;
  end if;
  return v_booking;
end;
$$;

alter table public.voyager_operators enable row level security;
alter table public.voyager_lines enable row level security;
alter table public.voyager_departures enable row level security;
alter table public.voyager_bookings enable row level security;

revoke all on public.voyager_operators, public.voyager_lines,
  public.voyager_departures, public.voyager_bookings from public, anon, authenticated;
grant select, insert, update, delete on public.voyager_operators, public.voyager_lines,
  public.voyager_departures to authenticated;
grant select on public.voyager_bookings to authenticated;

create policy "voyager_operators_staff"
on public.voyager_operators for all to authenticated
using (public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]))
with check (public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]));

create policy "voyager_lines_read_active"
on public.voyager_lines for select to authenticated
using (is_active = true or public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]));
create policy "voyager_lines_staff_write"
on public.voyager_lines for all to authenticated
using (public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]))
with check (public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]));

create policy "voyager_departures_read_published"
on public.voyager_departures for select to authenticated
using (
  (status in ('publie', 'complet') and departure_at > now())
  or public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[])
);
create policy "voyager_departures_staff_write"
on public.voyager_departures for all to authenticated
using (public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]))
with check (public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[]));

create policy "voyager_bookings_read_own_or_staff"
on public.voyager_bookings for select to authenticated
using (
  client_user_id = (select auth.uid())
  or public.has_any_role(array['super_admin', 'manager', 'ops']::public.app_role[])
);

revoke all on function public.expire_voyager_bookings() from public, anon, authenticated;
revoke all on function public.book_voyager_seats(uuid, uuid, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.finalize_voyager_payment(uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.expire_voyager_bookings() to service_role;
grant execute on function public.book_voyager_seats(uuid, uuid, text, text, integer) to service_role;
grant execute on function public.finalize_voyager_payment(uuid, boolean, text) to service_role;

with pilot_operator as (
  insert into public.voyager_operators(
    legal_name, display_name, operator_kind, status, contact_phone
  )
  values(
    'SentraJet Mobilité',
    'SentraJet Voyager',
    'compagnie',
    'actif',
    '+221000000000'
  )
  on conflict (legal_name) do update
  set display_name = excluded.display_name,
      status = excluded.status,
      updated_at = now()
  returning id
),
pilot_line as (
  insert into public.voyager_lines(
    operator_id, origin_city, destination_city, region_label,
    boarding_point, arrival_point
  )
  select
    id,
    'Dakar',
    'Saint-Louis',
    'Saint-Louis',
    'Point de rassemblement SentraJet — Dakar',
    'Centre-ville — Saint-Louis'
  from pilot_operator
  on conflict do nothing
  returning id
),
selected_line as (
  select id from pilot_line
  union all
  select line.id
  from public.voyager_lines line
  join public.voyager_operators operator on operator.id = line.operator_id
  where operator.legal_name = 'SentraJet Mobilité'
    and lower(line.origin_city) = 'dakar'
    and lower(line.destination_city) = 'saint-louis'
  limit 1
)
insert into public.voyager_departures(
  line_id, departure_at, vehicle_type, vehicle_label,
  seats_total, seats_available, price_per_seat_fcfa, notes
)
select
  selected_line.id,
  date_trunc('day', now()) + make_interval(days => day_offset, hours => 7),
  case when day_offset % 4 = 1 then 'minibus' else 'bus' end,
  case when day_offset % 4 = 1 then 'Hyundai H1' else 'Bus confort climatisé' end,
  case when day_offset % 4 = 1 then 10 else 50 end,
  case when day_offset % 4 = 1 then 10 else 50 end,
  7500,
  'Départ pilote Voyager · bagage cabine inclus'
from selected_line
cross join generate_series(1, 13, 2) as day_offset;
