-- Cover remaining foreign keys and avoid duplicate permissive SELECT policies.

create index if not exists food_order_events_actor_idx
  on public.food_order_events(actor_id);
create index if not exists food_order_items_menu_item_idx
  on public.food_order_items(menu_item_id);

drop policy if exists menu_items_partner_all on public.menu_items;
create policy menu_items_partner_insert on public.menu_items
for insert to authenticated
with check (private.can_access_restaurant(restaurant_id));
create policy menu_items_partner_update on public.menu_items
for update to authenticated
using (private.can_access_restaurant(restaurant_id))
with check (private.can_access_restaurant(restaurant_id));
create policy menu_items_partner_delete on public.menu_items
for delete to authenticated
using (private.can_access_restaurant(restaurant_id));

drop policy if exists restaurant_hours_partner_all on public.restaurant_hours;
create policy restaurant_hours_partner_insert on public.restaurant_hours
for insert to authenticated
with check (private.can_access_restaurant(restaurant_id));
create policy restaurant_hours_partner_update on public.restaurant_hours
for update to authenticated
using (private.can_access_restaurant(restaurant_id))
with check (private.can_access_restaurant(restaurant_id));
create policy restaurant_hours_partner_delete on public.restaurant_hours
for delete to authenticated
using (private.can_access_restaurant(restaurant_id));

drop policy if exists menu_categories_partner_all on public.menu_categories;
create policy menu_categories_partner_insert on public.menu_categories
for insert to authenticated
with check (private.can_access_restaurant(restaurant_id));
create policy menu_categories_partner_update on public.menu_categories
for update to authenticated
using (private.can_access_restaurant(restaurant_id))
with check (private.can_access_restaurant(restaurant_id));
create policy menu_categories_partner_delete on public.menu_categories
for delete to authenticated
using (private.can_access_restaurant(restaurant_id));

drop policy if exists menu_option_groups_partner_all on public.menu_item_option_groups;
create policy menu_option_groups_partner_insert on public.menu_item_option_groups
for insert to authenticated
with check (
  exists (
    select 1 from public.menu_items mi
    where mi.id = menu_item_id and private.can_access_restaurant(mi.restaurant_id)
  )
);
create policy menu_option_groups_partner_update on public.menu_item_option_groups
for update to authenticated
using (
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
create policy menu_option_groups_partner_delete on public.menu_item_option_groups
for delete to authenticated
using (
  exists (
    select 1 from public.menu_items mi
    where mi.id = menu_item_id and private.can_access_restaurant(mi.restaurant_id)
  )
);

drop policy if exists menu_options_partner_all on public.menu_item_options;
create policy menu_options_partner_insert on public.menu_item_options
for insert to authenticated
with check (
  exists (
    select 1
    from public.menu_item_option_groups g
    join public.menu_items mi on mi.id = g.menu_item_id
    where g.id = option_group_id and private.can_access_restaurant(mi.restaurant_id)
  )
);
create policy menu_options_partner_update on public.menu_item_options
for update to authenticated
using (
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
create policy menu_options_partner_delete on public.menu_item_options
for delete to authenticated
using (
  exists (
    select 1
    from public.menu_item_option_groups g
    join public.menu_items mi on mi.id = g.menu_item_id
    where g.id = option_group_id and private.can_access_restaurant(mi.restaurant_id)
  )
);
