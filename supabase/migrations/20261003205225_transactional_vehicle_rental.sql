-- Location transactionnelle SentraJet.
-- `vehicles` reste la flotte d'exploitation ; `rental_listings` est le catalogue louable.

create extension if not exists btree_gist with schema extensions;

create table if not exists public.rental_listings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null unique references public.vehicles(id) on delete restrict,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  partner_organization_id uuid references public.partner_organizations(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'active', 'paused', 'rejected')),
  city text not null default 'Dakar',
  pickup_location_label text not null default 'Dakar',
  daily_rate_fcfa integer not null check (daily_rate_fcfa > 0),
  deposit_fcfa integer not null default 0 check (deposit_fcfa >= 0),
  included_km_per_day integer not null default 150 check (included_km_per_day >= 0),
  extra_km_rate_fcfa integer not null default 0 check (extra_km_rate_fcfa >= 0),
  rental_mode text not null default 'with_driver'
    check (rental_mode in ('with_driver', 'without_driver', 'both')),
  minimum_days integer not null default 1 check (minimum_days between 1 and 90),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rental_listings_public_search
  on public.rental_listings(status, city, daily_rate_fcfa);

create table if not exists public.rental_bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  listing_id uuid not null references public.rental_listings(id) on delete restrict,
  client_id uuid not null references public.profiles(id) on delete restrict,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  partner_organization_id uuid references public.partner_organizations(id) on delete set null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'confirmed', 'active', 'completed', 'cancelled', 'expired')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'initiated', 'paid', 'failed', 'refunded')),
  payment_provider text,
  payment_provider_ref text,
  start_date date not null,
  end_date date not null,
  total_days integer not null check (total_days > 0),
  daily_rate_fcfa integer not null check (daily_rate_fcfa > 0),
  subtotal_fcfa integer not null check (subtotal_fcfa >= 0),
  deposit_fcfa integer not null default 0 check (deposit_fcfa >= 0),
  platform_commission_fcfa integer not null default 0 check (platform_commission_fcfa >= 0),
  owner_net_fcfa integer not null default 0 check (owner_net_fcfa >= 0),
  total_fcfa integer not null check (total_fcfa >= 0),
  pickup_location_label text not null,
  return_location_label text not null,
  customer_phone text,
  notes text,
  cancellation_reason text,
  paid_at timestamptz,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_bookings_dates_check check (end_date >= start_date),
  constraint rental_bookings_no_overlap exclude using gist (
    listing_id with =,
    daterange(start_date, end_date, '[]') with &&
  ) where (status in ('pending_payment', 'confirmed', 'active'))
);

create index if not exists idx_rental_bookings_client_created
  on public.rental_bookings(client_id, created_at desc);
create index if not exists idx_rental_bookings_listing_dates
  on public.rental_bookings(listing_id, start_date, end_date);

create or replace function public.prepare_rental_booking()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  listing public.rental_listings%rowtype;
begin
  select * into listing
  from public.rental_listings
  where id = new.listing_id
  for update;

  if not found or listing.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'rental_listing_unavailable';
  end if;
  if new.start_date < current_date or new.end_date < new.start_date then
    raise exception using errcode = '22007', message = 'rental_dates_invalid';
  end if;

  new.client_id := coalesce(new.client_id, auth.uid());
  if new.client_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  new.reference := coalesce(
    nullif(new.reference, ''),
    'SJ-LOC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  );
  new.owner_profile_id := listing.owner_profile_id;
  new.partner_organization_id := listing.partner_organization_id;
  new.total_days := (new.end_date - new.start_date) + 1;
  if new.total_days < listing.minimum_days then
    raise exception using errcode = '22023', message = 'rental_minimum_days_not_met';
  end if;
  new.daily_rate_fcfa := listing.daily_rate_fcfa;
  new.subtotal_fcfa := listing.daily_rate_fcfa * new.total_days;
  new.deposit_fcfa := listing.deposit_fcfa;
  new.platform_commission_fcfa := round(new.subtotal_fcfa * 0.15);
  new.owner_net_fcfa := new.subtotal_fcfa - new.platform_commission_fcfa;
  new.total_fcfa := new.subtotal_fcfa + new.deposit_fcfa;
  new.status := 'pending_payment';
  new.payment_status := 'pending';
  new.expires_at := now() + interval '15 minutes';
  return new;
end;
$$;

drop trigger if exists trg_prepare_rental_booking on public.rental_bookings;
create trigger trg_prepare_rental_booking
before insert on public.rental_bookings
for each row execute function public.prepare_rental_booking();

create or replace function public.touch_rental_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_rental_listing on public.rental_listings;
create trigger trg_touch_rental_listing
before update on public.rental_listings
for each row execute function public.touch_rental_updated_at();

drop trigger if exists trg_touch_rental_booking on public.rental_bookings;
create trigger trg_touch_rental_booking
before update on public.rental_bookings
for each row execute function public.touch_rental_updated_at();

alter table public.rental_listings enable row level security;
alter table public.rental_bookings enable row level security;

drop policy if exists rental_listings_public_read on public.rental_listings;
create policy rental_listings_public_read
on public.rental_listings for select
to anon, authenticated
using (
  status = 'active'
  or owner_profile_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists rental_listings_staff_manage on public.rental_listings;
create policy rental_listings_staff_manage
on public.rental_listings for all
to authenticated
using (
  owner_profile_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
)
with check (
  owner_profile_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists rental_bookings_parties_read on public.rental_bookings;
create policy rental_bookings_parties_read
on public.rental_bookings for select
to authenticated
using (
  client_id = auth.uid()
  or owner_profile_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

revoke all on function public.prepare_rental_booking() from public, anon, authenticated;
revoke all on function public.touch_rental_updated_at() from public, anon, authenticated;

-- Rend louables les véhicules actuellement exploitables. Les tarifs peuvent ensuite être
-- ajustés par Ops dans `rental_listings`, sans modifier la tarification des courses.
insert into public.rental_listings (
  vehicle_id,
  status,
  city,
  pickup_location_label,
  daily_rate_fcfa,
  deposit_fcfa,
  included_km_per_day,
  extra_km_rate_fcfa,
  rental_mode,
  published_at
)
select
  v.id,
  'active',
  'Dakar',
  'Agence SentraJet Dakar',
  case
    when lower(coalesce(v.category, '')) = 'vip' then 85000
    when lower(coalesce(v.category, '')) like '%van%' or coalesce(v.seats, 0) >= 8 then 70000
    else 60000
  end,
  case when lower(coalesce(v.category, '')) = 'vip' then 150000 else 100000 end,
  150,
  300,
  case
    when lower(coalesce(v.chauffeur_mode, '')) like '%sans%' then 'both'
    else 'with_driver'
  end,
  now()
from public.vehicles v
where lower(coalesce(v.status::text, '')) not in
  ('maintenance', 'inactive', 'retired', 'out_of_service', 'hors_service')
on conflict (vehicle_id) do nothing;
