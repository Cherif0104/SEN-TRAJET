-- Transactional restaurant marketplace: catalog, checkout, merchant operations,
-- courier dispatch and client tracking.

create type public.food_order_status as enum (
  'pending',
  'accepted',
  'preparing',
  'ready',
  'picked_up',
  'delivered',
  'rejected',
  'cancelled'
);

create type public.food_restaurant_status as enum (
  'pending',
  'accepted',
  'preparing',
  'ready',
  'rejected'
);

create type public.food_delivery_status as enum (
  'unassigned',
  'searching',
  'assigned',
  'at_restaurant',
  'picked_up',
  'delivered'
);

create type public.food_payment_method as enum (
  'cash',
  'wave',
  'orange_money',
  'card'
);

create type public.food_payment_status as enum (
  'pending',
  'authorized',
  'paid',
  'failed',
  'refund_pending',
  'refunded'
);

create type public.food_delivery_mode as enum ('delivery', 'pickup');

alter table public.restaurants
  add column if not exists organization_id uuid
    references public.organizations(id) on delete set null,
  add column if not exists slug text,
  add column if not exists phone text,
  add column if not exists cuisine_type text,
  add column if not exists logo_url text,
  add column if not exists delivery_fee integer not null default 1000
    check (delivery_fee between 0 and 100000),
  add column if not exists service_fee integer not null default 0
    check (service_fee between 0 and 100000),
  add column if not exists minimum_order integer not null default 0
    check (minimum_order between 0 and 1000000),
  add column if not exists estimated_prep_minutes integer not null default 25
    check (estimated_prep_minutes between 5 and 240),
  add column if not exists rating numeric(2,1) not null default 5.0
    check (rating between 0 and 5),
  add column if not exists review_count integer not null default 0
    check (review_count >= 0),
  add column if not exists is_open boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

update public.restaurants
set slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'))
           || '-' || left(id::text, 6)
where slug is null;

alter table public.restaurants alter column slug set not null;
create unique index if not exists restaurants_slug_idx on public.restaurants(slug);
create index if not exists restaurants_active_location_idx
  on public.restaurants(is_active, is_open, cuisine_type);
create index if not exists restaurants_organization_idx
  on public.restaurants(organization_id) where organization_id is not null;

create table public.restaurant_hours (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (restaurant_id, weekday)
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_items
  add column if not exists category_id uuid references public.menu_categories(id) on delete set null,
  add column if not exists sort_order integer not null default 0,
  add column if not exists preparation_minutes integer
    check (preparation_minutes between 1 and 240),
  add column if not exists updated_at timestamptz not null default now();

create table public.menu_item_option_groups (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  minimum_selections integer not null default 0 check (minimum_selections >= 0),
  maximum_selections integer not null default 1 check (maximum_selections between 1 and 20),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (minimum_selections <= maximum_selections)
);

create table public.menu_item_options (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references public.menu_item_option_groups(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  price_delta integer not null default 0 check (price_delta between 0 and 1000000),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.food_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'FOOD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  client_id uuid not null references auth.users(id) on delete restrict,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  courier_driver_id uuid references public.driver_profiles(id) on delete set null,
  status public.food_order_status not null default 'pending',
  restaurant_status public.food_restaurant_status not null default 'pending',
  delivery_status public.food_delivery_status not null default 'unassigned',
  delivery_mode public.food_delivery_mode not null default 'delivery',
  payment_method public.food_payment_method not null,
  payment_status public.food_payment_status not null default 'pending',
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null check (delivery_fee >= 0),
  service_fee integer not null check (service_fee >= 0),
  total integer not null check (total >= 0),
  delivery_address text not null,
  delivery_lat double precision check (delivery_lat between -90 and 90),
  delivery_lng double precision check (delivery_lng between -180 and 180),
  recipient_name text not null,
  recipient_phone text not null,
  customer_notes text,
  estimated_ready_at timestamptz,
  accepted_at timestamptz,
  ready_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.food_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.food_orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name_snapshot text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 50),
  line_total integer not null check (line_total >= 0),
  selected_options jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table public.food_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.food_orders(id) on delete cascade,
  status public.food_order_status not null,
  actor_id uuid references auth.users(id) on delete set null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.food_delivery_offers (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.food_orders(id) on delete cascade,
  driver_id uuid not null references public.driver_profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'expired')),
  expires_at timestamptz not null default (now() + interval '45 seconds'),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id, driver_id)
);

create index menu_categories_restaurant_sort_idx
  on public.menu_categories(restaurant_id, sort_order) where is_active;
create index menu_items_category_sort_idx
  on public.menu_items(category_id, sort_order) where is_available;
create index menu_option_groups_item_idx
  on public.menu_item_option_groups(menu_item_id, sort_order);
create index menu_options_group_idx
  on public.menu_item_options(option_group_id, sort_order) where is_available;
create index food_orders_client_created_idx
  on public.food_orders(client_id, created_at desc);
create index food_orders_restaurant_live_idx
  on public.food_orders(restaurant_id, created_at)
  where status in ('pending', 'accepted', 'preparing', 'ready');
create index food_orders_courier_live_idx
  on public.food_orders(courier_driver_id, updated_at)
  where courier_driver_id is not null and status not in ('delivered', 'rejected', 'cancelled');
create index food_order_items_order_idx on public.food_order_items(order_id);
create index food_order_events_order_idx on public.food_order_events(order_id, created_at);
create index food_delivery_offers_driver_idx
  on public.food_delivery_offers(driver_id, status, expires_at);
