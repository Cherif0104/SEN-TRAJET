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

create or replace function private.can_access_restaurant(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select private.is_admin()
    or exists (
      select 1
      from public.restaurants r
      where r.id = p_restaurant_id
        and (
          r.owner_id = auth.uid()
          or (
            r.organization_id is not null
            and exists (
              select 1
              from public.organization_members om
              where om.organization_id = r.organization_id
                and om.user_id = auth.uid()
            )
          )
        )
    );
$$;

create or replace function private.can_access_food_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select private.is_admin()
    or exists (
      select 1
      from public.food_orders o
      left join public.driver_profiles d on d.id = o.courier_driver_id
      where o.id = p_order_id
        and (
          o.client_id = auth.uid()
          or d.user_id = auth.uid()
          or private.can_access_restaurant(o.restaurant_id)
        )
    );
$$;

create or replace function private.create_food_order(
  p_restaurant_id uuid,
  p_delivery_mode text,
  p_payment_method text,
  p_delivery_address text,
  p_delivery_lat double precision,
  p_delivery_lng double precision,
  p_recipient_name text,
  p_recipient_phone text,
  p_customer_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_restaurant public.restaurants%rowtype;
  v_order_id uuid;
  v_subtotal integer;
  v_item_count integer;
  v_requested_count integer;
  v_delivery_fee integer;
  v_mode public.food_delivery_mode;
  v_payment public.food_payment_method;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.profiles where id = v_user_id and role in ('client', 'admin')
  ) then
    raise exception 'client_account_required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid_cart';
  end if;
  if length(trim(coalesce(p_delivery_address, ''))) < 5
     or length(trim(coalesce(p_recipient_name, ''))) < 2
     or length(trim(coalesce(p_recipient_phone, ''))) < 7 then
    raise exception 'invalid_delivery_details';
  end if;

  v_mode := p_delivery_mode::public.food_delivery_mode;
  v_payment := p_payment_method::public.food_payment_method;

  select * into v_restaurant
  from public.restaurants
  where id = p_restaurant_id and is_active and is_open
  for share;
  if not found then raise exception 'restaurant_unavailable'; end if;

  insert into public.food_orders (
    client_id, restaurant_id, delivery_mode, payment_method,
    subtotal, delivery_fee, service_fee, total,
    delivery_address, delivery_lat, delivery_lng,
    recipient_name, recipient_phone, customer_notes
  )
  values (
    v_user_id, v_restaurant.id, v_mode, v_payment,
    0, 0, v_restaurant.service_fee, v_restaurant.service_fee,
    left(trim(p_delivery_address), 500), p_delivery_lat, p_delivery_lng,
    left(trim(p_recipient_name), 150), left(trim(p_recipient_phone), 40),
    left(trim(p_customer_notes), 1000)
  )
  returning id into v_order_id;

  with requested as (
    select
      menu_item_id,
      sum(quantity)::integer as quantity,
      left(max(notes), 500) as notes
    from jsonb_to_recordset(p_items) as x(
      menu_item_id uuid,
      quantity integer,
      notes text
    )
    where quantity between 1 and 50
    group by menu_item_id
  )
  insert into public.food_order_items (
    order_id, menu_item_id, name_snapshot, unit_price, quantity, line_total, notes
  )
  select
    v_order_id, mi.id, mi.name, mi.price, r.quantity,
    mi.price * r.quantity, r.notes
  from requested r
  join public.menu_items mi on mi.id = r.menu_item_id
  where mi.restaurant_id = v_restaurant.id and mi.is_available;

  select count(*) into v_item_count
  from public.food_order_items where order_id = v_order_id;
  select count(distinct x.menu_item_id) into v_requested_count
  from jsonb_to_recordset(p_items) as x(menu_item_id uuid, quantity integer, notes text);

  if v_item_count = 0 or v_item_count <> v_requested_count then
    raise exception 'cart_contains_unavailable_items';
  end if;

  select sum(line_total)::integer into v_subtotal
  from public.food_order_items where order_id = v_order_id;
  if v_subtotal < v_restaurant.minimum_order then
    raise exception 'minimum_order_not_reached';
  end if;

  v_delivery_fee := case when v_mode = 'delivery' then v_restaurant.delivery_fee else 0 end;
  update public.food_orders
  set subtotal = v_subtotal,
      delivery_fee = v_delivery_fee,
      total = v_subtotal + v_delivery_fee + v_restaurant.service_fee,
      updated_at = now()
  where id = v_order_id;

  insert into public.food_order_events (order_id, status, actor_id, message)
  values (v_order_id, 'pending', v_user_id, 'Commande transmise au restaurant');

  insert into public.notifications (user_id, type, title, body, data)
  select recipient_id, 'food_order_new', 'Nouvelle commande',
         'Une nouvelle commande attend votre confirmation.',
         jsonb_build_object('order_id', v_order_id, 'restaurant_id', v_restaurant.id)
  from (
    select v_restaurant.owner_id as recipient_id
    union
    select om.user_id
    from public.organization_members om
    where om.organization_id = v_restaurant.organization_id
      and om.role in ('owner', 'admin', 'agent')
  ) recipients
  where recipient_id is not null
  on conflict do nothing;

  return v_order_id;
end;
$$;

create or replace function public.create_food_order(
  p_restaurant_id uuid,
  p_delivery_mode text,
  p_payment_method text,
  p_delivery_address text,
  p_delivery_lat double precision,
  p_delivery_lng double precision,
  p_recipient_name text,
  p_recipient_phone text,
  p_customer_notes text,
  p_items jsonb
)
returns uuid
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.create_food_order(
    p_restaurant_id, p_delivery_mode, p_payment_method,
    p_delivery_address, p_delivery_lat, p_delivery_lng,
    p_recipient_name, p_recipient_phone, p_customer_notes, p_items
  );
$$;

create or replace function private.partner_update_food_order(
  p_order_id uuid,
  p_action text,
  p_prep_minutes integer,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_order public.food_orders%rowtype;
  v_restaurant public.restaurants%rowtype;
  v_next public.food_order_status;
begin
  select * into v_order from public.food_orders where id = p_order_id for update;
  if not found or not private.can_access_restaurant(v_order.restaurant_id) then
    raise exception 'food_order_not_found' using errcode = '42501';
  end if;
  select * into v_restaurant from public.restaurants where id = v_order.restaurant_id;

  if p_action = 'accept' and v_order.status = 'pending' then
    v_next := 'accepted';
    update public.food_orders
    set status = v_next,
        restaurant_status = 'accepted',
        accepted_at = now(),
        estimated_ready_at = now() + make_interval(mins => greatest(5, least(coalesce(p_prep_minutes, v_restaurant.estimated_prep_minutes), 240))),
        updated_at = now()
    where id = p_order_id;
  elsif p_action = 'prepare' and v_order.status in ('accepted', 'preparing') then
    v_next := 'preparing';
    update public.food_orders
    set status = v_next,
        restaurant_status = 'preparing',
        delivery_status = case when delivery_mode = 'delivery' then 'searching' else delivery_status end,
        updated_at = now()
    where id = p_order_id;

    if v_order.delivery_mode = 'delivery' then
      insert into public.food_delivery_offers (order_id, driver_id)
      select p_order_id, d.id
      from public.driver_profiles d
      join public.driver_locations l on l.driver_id = d.id
      where d.status = 'approved'
        and d.is_online
        and 'delivery'::public.service_type = any(d.accepted_services)
        and l.updated_at > now() - interval '2 minutes'
      order by private.distance_km(v_restaurant.lat, v_restaurant.lng, l.lat, l.lng)
      limit 5
      on conflict (order_id, driver_id) do nothing;
    end if;
  elsif p_action = 'ready' and v_order.status in ('accepted', 'preparing') then
    v_next := 'ready';
    update public.food_orders
    set status = v_next, restaurant_status = 'ready', ready_at = now(), updated_at = now()
    where id = p_order_id;
  elsif p_action = 'reject' and v_order.status = 'pending'
        and length(trim(coalesce(p_reason, ''))) >= 5 then
    v_next := 'rejected';
    update public.food_orders
    set status = v_next,
        restaurant_status = 'rejected',
        payment_status = case when payment_status in ('authorized', 'paid') then 'refund_pending' else payment_status end,
        cancelled_at = now(),
        cancellation_reason = left(trim(p_reason), 500),
        updated_at = now()
    where id = p_order_id;
  else
    raise exception 'invalid_food_order_transition';
  end if;

  insert into public.food_order_events (order_id, status, actor_id, message)
  values (p_order_id, v_next, auth.uid(), left(trim(p_reason), 500));

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_order.client_id,
    'food_order_status',
    case v_next
      when 'accepted' then 'Commande acceptée'
      when 'preparing' then 'Préparation en cours'
      when 'ready' then 'Commande prête'
      else 'Commande refusée'
    end,
    case v_next
      when 'accepted' then 'Le restaurant a confirmé votre commande.'
      when 'preparing' then 'Votre repas est en cours de préparation.'
      when 'ready' then 'Votre commande est prête pour le retrait.'
      else left(trim(p_reason), 500)
    end,
    jsonb_build_object('order_id', p_order_id, 'status', v_next)
  );
end;
$$;

create or replace function public.partner_update_food_order(
  p_order_id uuid,
  p_action text,
  p_prep_minutes integer default null,
  p_reason text default null
)
returns void
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.partner_update_food_order(p_order_id, p_action, p_prep_minutes, p_reason);
$$;

create or replace function private.respond_food_delivery_offer(
  p_offer_id uuid,
  p_accept boolean
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_driver_id uuid;
  v_offer public.food_delivery_offers%rowtype;
begin
  select id into v_driver_id
  from public.driver_profiles
  where user_id = auth.uid() and status = 'approved';
  if v_driver_id is null then
    raise exception 'approved_driver_required' using errcode = '42501';
  end if;

  select * into v_offer
  from public.food_delivery_offers where id = p_offer_id for update;
  if not found or v_offer.driver_id <> v_driver_id then
    raise exception 'offer_not_found' using errcode = '42501';
  end if;
  if v_offer.status <> 'pending' or v_offer.expires_at <= now() then
    raise exception 'offer_expired';
  end if;

  if not p_accept then
    update public.food_delivery_offers
    set status = 'declined', responded_at = now() where id = p_offer_id;
    return v_offer.order_id;
  end if;

  update public.food_orders
  set courier_driver_id = v_driver_id, delivery_status = 'assigned', updated_at = now()
  where id = v_offer.order_id and courier_driver_id is null
    and status not in ('delivered', 'rejected', 'cancelled');
  if not found then raise exception 'delivery_already_assigned'; end if;

  update public.food_delivery_offers
  set status = 'accepted', responded_at = now() where id = p_offer_id;
  update public.food_delivery_offers
  set status = 'expired', responded_at = now()
  where order_id = v_offer.order_id and id <> p_offer_id and status = 'pending';
  update public.driver_profiles set is_online = false, updated_at = now() where id = v_driver_id;

  insert into public.notifications (user_id, type, title, body, data)
  select client_id, 'food_courier_assigned', 'Livreur affecté',
         'Un livreur SentraJet prend en charge votre commande.',
         jsonb_build_object('order_id', id)
  from public.food_orders where id = v_offer.order_id;
  return v_offer.order_id;
end;
$$;

create or replace function public.respond_food_delivery_offer(
  p_offer_id uuid,
  p_accept boolean
)
returns uuid
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.respond_food_delivery_offer(p_offer_id, p_accept);
$$;

create or replace function private.update_food_delivery_status(
  p_order_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_driver_id uuid;
  v_order public.food_orders%rowtype;
  v_new public.food_delivery_status := p_status::public.food_delivery_status;
  v_main public.food_order_status;
begin
  select id into v_driver_id from public.driver_profiles where user_id = auth.uid();
  select * into v_order from public.food_orders
  where id = p_order_id and courier_driver_id = v_driver_id for update;
  if not found then raise exception 'assigned_delivery_required' using errcode = '42501'; end if;

  if not (
    (v_order.delivery_status = 'assigned' and v_new = 'at_restaurant') or
    (v_order.delivery_status in ('assigned', 'at_restaurant') and v_new = 'picked_up' and v_order.restaurant_status = 'ready') or
    (v_order.delivery_status = 'picked_up' and v_new = 'delivered')
  ) then raise exception 'invalid_delivery_transition'; end if;

  v_main := case
    when v_new = 'picked_up' then 'picked_up'::public.food_order_status
    when v_new = 'delivered' then 'delivered'::public.food_order_status
    else v_order.status
  end;
  update public.food_orders
  set delivery_status = v_new,
      status = v_main,
      picked_up_at = case when v_new = 'picked_up' then now() else picked_up_at end,
      delivered_at = case when v_new = 'delivered' then now() else delivered_at end,
      payment_status = case
        when v_new = 'delivered' and payment_method = 'cash' then 'paid'
        else payment_status
      end,
      updated_at = now()
  where id = p_order_id;

  insert into public.food_order_events (order_id, status, actor_id, message)
  values (
    p_order_id, v_main, auth.uid(),
    case v_new
      when 'at_restaurant' then 'Le livreur est arrivé au restaurant'
      when 'picked_up' then 'La commande est en route'
      else 'Commande livrée'
    end
  );
  if v_new = 'delivered' then
    update public.driver_profiles set is_online = true, updated_at = now() where id = v_driver_id;
  end if;
end;
$$;

create or replace function public.update_food_delivery_status(
  p_order_id uuid,
  p_status text
)
returns void
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.update_food_delivery_status(p_order_id, p_status);
$$;

alter table public.restaurant_hours enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_item_option_groups enable row level security;
alter table public.menu_item_options enable row level security;
alter table public.food_orders enable row level security;
alter table public.food_order_items enable row level security;
alter table public.food_order_events enable row level security;
alter table public.food_delivery_offers enable row level security;

drop policy if exists restaurants_public_read on public.restaurants;
create policy restaurants_read on public.restaurants
for select to anon, authenticated using (
  is_active or private.can_access_restaurant(id)
);
create policy restaurants_partner_update on public.restaurants
for update to authenticated using (private.can_access_restaurant(id))
with check (private.can_access_restaurant(id));

drop policy if exists menu_public_read on public.menu_items;
create policy menu_items_read on public.menu_items
for select to anon, authenticated using (
  (
    is_available
    and exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.is_active
    )
  )
  or private.can_access_restaurant(restaurant_id)
);
create policy menu_items_partner_all on public.menu_items
for all to authenticated using (private.can_access_restaurant(restaurant_id))
with check (private.can_access_restaurant(restaurant_id));

create policy restaurant_hours_read on public.restaurant_hours
for select to anon, authenticated using (
  exists (
    select 1 from public.restaurants r where r.id = restaurant_id and r.is_active
  )
  or private.can_access_restaurant(restaurant_id)
);
create policy restaurant_hours_partner_all on public.restaurant_hours
for all to authenticated using (private.can_access_restaurant(restaurant_id))
with check (private.can_access_restaurant(restaurant_id));

create policy menu_categories_read on public.menu_categories
for select to anon, authenticated using (
  (
    is_active
    and exists (
      select 1 from public.restaurants r where r.id = restaurant_id and r.is_active
    )
  )
  or private.can_access_restaurant(restaurant_id)
);
create policy menu_categories_partner_all on public.menu_categories
for all to authenticated using (private.can_access_restaurant(restaurant_id))
with check (private.can_access_restaurant(restaurant_id));

create policy menu_option_groups_read on public.menu_item_option_groups
for select to anon, authenticated using (
  exists (
    select 1
    from public.menu_items mi
    join public.restaurants r on r.id = mi.restaurant_id
    where mi.id = menu_item_id and mi.is_available and r.is_active
  )
  or exists (
    select 1 from public.menu_items mi
    where mi.id = menu_item_id and private.can_access_restaurant(mi.restaurant_id)
  )
);
create policy menu_option_groups_partner_all on public.menu_item_option_groups
for all to authenticated using (
  exists (
    select 1 from public.menu_items mi
    where mi.id = menu_item_id and private.can_access_restaurant(mi.restaurant_id)
  )
) with check (
  exists (
    select 1 from public.menu_items mi
    where mi.id = menu_item_id and private.can_access_restaurant(mi.restaurant_id)
  )
);

create policy menu_options_read on public.menu_item_options
for select to anon, authenticated using (
  (
    is_available and exists (
      select 1
      from public.menu_item_option_groups g
      join public.menu_items mi on mi.id = g.menu_item_id
      join public.restaurants r on r.id = mi.restaurant_id
      where g.id = option_group_id and mi.is_available and r.is_active
    )
  )
  or exists (
    select 1
    from public.menu_item_option_groups g
    join public.menu_items mi on mi.id = g.menu_item_id
    where g.id = option_group_id and private.can_access_restaurant(mi.restaurant_id)
  )
);
create policy menu_options_partner_all on public.menu_item_options
for all to authenticated using (
  exists (
    select 1
    from public.menu_item_option_groups g
    join public.menu_items mi on mi.id = g.menu_item_id
    where g.id = option_group_id and private.can_access_restaurant(mi.restaurant_id)
  )
) with check (
  exists (
    select 1
    from public.menu_item_option_groups g
    join public.menu_items mi on mi.id = g.menu_item_id
    where g.id = option_group_id and private.can_access_restaurant(mi.restaurant_id)
  )
);

create policy food_orders_relevant_read on public.food_orders
for select to authenticated using (private.can_access_food_order(id));
create policy food_order_items_relevant_read on public.food_order_items
for select to authenticated using (private.can_access_food_order(order_id));
create policy food_order_events_relevant_read on public.food_order_events
for select to authenticated using (private.can_access_food_order(order_id));
create policy food_delivery_offers_driver_read on public.food_delivery_offers
for select to authenticated using (
  private.is_driver_owner(driver_id) or private.is_admin()
);

grant select on public.restaurant_hours, public.menu_categories,
  public.menu_item_option_groups, public.menu_item_options to anon, authenticated;
grant select, insert, update, delete on public.restaurant_hours, public.menu_categories,
  public.menu_items, public.menu_item_option_groups, public.menu_item_options to authenticated;
grant update on public.restaurants to authenticated;
grant select on public.food_orders, public.food_order_items,
  public.food_order_events, public.food_delivery_offers to authenticated;

revoke all on function private.can_access_restaurant(uuid) from public, anon;
revoke all on function private.can_access_food_order(uuid) from public, anon;
revoke all on function private.create_food_order(uuid, text, text, text, double precision, double precision, text, text, text, jsonb) from public, anon;
revoke all on function private.partner_update_food_order(uuid, text, integer, text) from public, anon;
revoke all on function private.respond_food_delivery_offer(uuid, boolean) from public, anon;
revoke all on function private.update_food_delivery_status(uuid, text) from public, anon;
grant execute on function private.can_access_restaurant(uuid) to authenticated;
grant execute on function private.can_access_food_order(uuid) to authenticated;
grant execute on function private.create_food_order(uuid, text, text, text, double precision, double precision, text, text, text, jsonb) to authenticated;
grant execute on function private.partner_update_food_order(uuid, text, integer, text) to authenticated;
grant execute on function private.respond_food_delivery_offer(uuid, boolean) to authenticated;
grant execute on function private.update_food_delivery_status(uuid, text) to authenticated;

revoke all on function public.create_food_order(uuid, text, text, text, double precision, double precision, text, text, text, jsonb) from public, anon;
revoke all on function public.partner_update_food_order(uuid, text, integer, text) from public, anon;
revoke all on function public.respond_food_delivery_offer(uuid, boolean) from public, anon;
revoke all on function public.update_food_delivery_status(uuid, text) from public, anon;
grant execute on function public.create_food_order(uuid, text, text, text, double precision, double precision, text, text, text, jsonb) to authenticated;
grant execute on function public.partner_update_food_order(uuid, text, integer, text) to authenticated;
grant execute on function public.respond_food_delivery_offer(uuid, boolean) to authenticated;
grant execute on function public.update_food_delivery_status(uuid, text) to authenticated;

alter publication supabase_realtime add table public.food_orders;
alter publication supabase_realtime add table public.food_order_events;
alter publication supabase_realtime add table public.food_delivery_offers;
