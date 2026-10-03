create table if not exists public.vip_vehicle_offers (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null unique references public.vehicles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused')),
  price_4h_fcfa integer not null check (price_4h_fcfa > 0),
  price_8h_fcfa integer not null check (price_8h_fcfa > 0),
  price_12h_fcfa integer not null check (price_12h_fcfa > 0),
  included_km_4h integer not null default 50 check (included_km_4h >= 0),
  included_km_8h integer not null default 100 check (included_km_8h >= 0),
  included_km_12h integer not null default 150 check (included_km_12h >= 0),
  extra_km_rate_fcfa integer not null default 700 check (extra_km_rate_fcfa >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings
  add column if not exists requested_vehicle_id uuid references public.vehicles(id) on delete set null,
  add column if not exists service_duration_hours integer,
  add column if not exists service_end_time timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and conname = 'bookings_vip_duration_check'
  ) then
    alter table public.bookings
      add constraint bookings_vip_duration_check
      check (service_duration_hours is null or service_duration_hours in (4, 8, 12));
  end if;
end $$;

alter table public.bookings
  drop constraint if exists bookings_vip_vehicle_no_overlap;
alter table public.bookings
  add constraint bookings_vip_vehicle_no_overlap
  exclude using gist (
    requested_vehicle_id with =,
    tstzrange(pickup_time, service_end_time, '[)') with &&
  )
  where (
    requested_vehicle_id is not null
    and service_end_time is not null
    and status not in ('annulee', 'cancelled', 'terminee', 'completed', 'refusee', 'expired')
  );

create index if not exists idx_bookings_requested_vehicle_time
  on public.bookings(requested_vehicle_id, pickup_time, service_end_time)
  where requested_vehicle_id is not null;

create or replace function public.prepare_vip_booking()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  offer public.vip_vehicle_offers%rowtype;
  amount integer;
begin
  if new.service_type <> 'mise_a_disposition' or new.requested_vehicle_id is null then
    return new;
  end if;
  if new.pickup_time <= now() + interval '1 hour' then
    raise exception using errcode = '22007', message = 'vip_pickup_too_soon';
  end if;
  if new.service_duration_hours not in (4, 8, 12) then
    raise exception using errcode = '22023', message = 'vip_duration_invalid';
  end if;

  select * into offer
  from public.vip_vehicle_offers
  where vehicle_id = new.requested_vehicle_id and status = 'active'
  for share;
  if not found then
    raise exception using errcode = 'P0001', message = 'vip_vehicle_unavailable';
  end if;

  amount := case new.service_duration_hours
    when 4 then offer.price_4h_fcfa
    when 8 then offer.price_8h_fcfa
    else offer.price_12h_fcfa
  end;
  new.service_end_time := new.pickup_time + make_interval(hours => new.service_duration_hours);
  new.reference := coalesce(
    nullif(new.reference, ''),
    'SJ-VIP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  );
  new.dropoff := coalesce(nullif(new.dropoff, ''), new.pickup);
  new.estimated_price := amount;
  new.final_amount_fcfa := amount;
  new.account_discount_percent := 0;
  new.status := 'en_attente_de_paiement';
  new.booking_mode := 'scheduled';
  new.source := 'vip_transactional';
  new.tariff_version_code := 'VIP_MAD_V1';
  return new;
end;
$$;

drop trigger if exists trg_prepare_vip_booking on public.bookings;
create trigger trg_prepare_vip_booking
before insert on public.bookings
for each row execute function public.prepare_vip_booking();

alter table public.vip_vehicle_offers enable row level security;

drop policy if exists vip_vehicle_offers_authenticated_read on public.vip_vehicle_offers;
create policy vip_vehicle_offers_authenticated_read
on public.vip_vehicle_offers for select
to authenticated
using (status = 'active');

drop policy if exists vip_vehicle_offers_staff_manage on public.vip_vehicle_offers;
create policy vip_vehicle_offers_staff_manage
on public.vip_vehicle_offers for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

revoke all on function public.prepare_vip_booking() from public, anon, authenticated;

insert into public.vip_vehicle_offers (
  vehicle_id,
  price_4h_fcfa,
  price_8h_fcfa,
  price_12h_fcfa,
  included_km_4h,
  included_km_8h,
  included_km_12h,
  extra_km_rate_fcfa
)
select
  v.id,
  case
    when lower(coalesce(v.category, '')) = 'vip' then 55000
    when lower(coalesce(v.category, '')) like '%van%' or coalesce(v.seats, 0) >= 8 then 45000
    else 40000
  end,
  case
    when lower(coalesce(v.category, '')) = 'vip' then 85000
    when lower(coalesce(v.category, '')) like '%van%' or coalesce(v.seats, 0) >= 8 then 70000
    else 65000
  end,
  case
    when lower(coalesce(v.category, '')) = 'vip' then 120000
    when lower(coalesce(v.category, '')) like '%van%' or coalesce(v.seats, 0) >= 8 then 100000
    else 90000
  end,
  50,
  100,
  150,
  700
from public.vehicles v
where lower(coalesce(v.status::text, '')) in ('available', 'in_service')
on conflict (vehicle_id) do nothing;

create or replace function public.create_vip_booking(
  p_user_id uuid,
  p_vehicle_id uuid,
  p_pickup text,
  p_pickup_time timestamptz,
  p_duration_hours integer,
  p_passengers integer,
  p_phone text,
  p_pickup_lat double precision default null,
  p_pickup_lng double precision default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  client_uuid uuid;
  vehicle_capacity integer;
  created_booking public.bookings%rowtype;
  created_payment public.payments%rowtype;
begin
  select c.id into client_uuid
  from public.clients c
  where c.user_id = p_user_id
  limit 1;
  if client_uuid is null then
    raise exception using errcode = 'P0001', message = 'vip_client_profile_missing';
  end if;
  select v.seats into vehicle_capacity
  from public.vehicles v
  join public.vip_vehicle_offers o on o.vehicle_id = v.id and o.status = 'active'
  where v.id = p_vehicle_id
    and lower(coalesce(v.status::text, '')) in ('available', 'in_service');
  if vehicle_capacity is null then
    raise exception using errcode = 'P0001', message = 'vip_vehicle_unavailable';
  end if;
  if p_passengers < 1 or p_passengers > vehicle_capacity then
    raise exception using errcode = '22023', message = 'vip_vehicle_capacity_exceeded';
  end if;

  insert into public.bookings (
    client_id,
    pickup,
    dropoff,
    pickup_time,
    service_type,
    passengers,
    phone,
    notes,
    pickup_lat,
    pickup_lng,
    requested_vehicle_id,
    service_duration_hours
  )
  values (
    client_uuid,
    trim(p_pickup),
    trim(p_pickup),
    p_pickup_time,
    'mise_a_disposition',
    greatest(1, p_passengers),
    nullif(trim(p_phone), ''),
    nullif(trim(p_notes), ''),
    p_pickup_lat,
    p_pickup_lng,
    p_vehicle_id,
    p_duration_hours
  )
  returning * into created_booking;

  insert into public.payments (
    booking_id,
    amount_fcfa,
    provider,
    booking_ref,
    status,
    meta
  )
  values (
    created_booking.id,
    created_booking.final_amount_fcfa,
    'wave',
    created_booking.reference,
    'pending',
    jsonb_build_object('service', 'vip_mad', 'duration_hours', p_duration_hours)
  )
  returning * into created_payment;

  return jsonb_build_object(
    'booking_id', created_booking.id,
    'reference', created_booking.reference,
    'status', created_booking.status,
    'pickup_time', created_booking.pickup_time,
    'service_end_time', created_booking.service_end_time,
    'amount_fcfa', created_booking.final_amount_fcfa,
    'payment_id', created_payment.id,
    'payment_status', created_payment.status
  );
end;
$$;

revoke all on function public.create_vip_booking(
  uuid, uuid, text, timestamptz, integer, integer, text, double precision, double precision, text
) from public, anon, authenticated;
grant execute on function public.create_vip_booking(
  uuid, uuid, text, timestamptz, integer, integer, text, double precision, double precision, text
) to service_role;
