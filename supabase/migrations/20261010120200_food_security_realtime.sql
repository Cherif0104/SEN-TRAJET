-- RLS, grants and Realtime publication for SentraJet Food.

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
