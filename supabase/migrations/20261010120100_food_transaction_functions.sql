-- Transaction-safe Food order, merchant and courier operations.

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
