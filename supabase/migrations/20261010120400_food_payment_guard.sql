-- Payment methods are visible in the product roadmap but cannot be selected
-- until their production gateway has explicitly been activated.

create table public.food_payment_methods (
  method public.food_payment_method primary key,
  label text not null,
  is_active boolean not null default false,
  configuration jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.food_payment_methods (method, label, is_active)
values
  ('cash', 'Espèces', true),
  ('wave', 'Wave', false),
  ('orange_money', 'Orange Money', false),
  ('card', 'Carte bancaire', false)
on conflict (method) do update
set label = excluded.label;

create or replace function public.enforce_food_payment_activation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
    from public.food_payment_methods
    where method = new.payment_method and is_active
  ) then
    raise exception 'payment_method_unavailable';
  end if;
  return new;
end;
$$;

create trigger enforce_food_payment_activation_trigger
before insert or update of payment_method on public.food_orders
for each row execute function public.enforce_food_payment_activation();

alter table public.food_payment_methods enable row level security;
create policy food_payment_methods_read on public.food_payment_methods
for select to authenticated using (true);
create policy food_payment_methods_admin_insert on public.food_payment_methods
for insert to authenticated with check (private.is_admin());
create policy food_payment_methods_admin_update on public.food_payment_methods
for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy food_payment_methods_admin_delete on public.food_payment_methods
for delete to authenticated using (private.is_admin());

grant select on public.food_payment_methods to authenticated;
grant insert, update, delete on public.food_payment_methods to authenticated;
revoke all on function public.enforce_food_payment_activation() from public, anon, authenticated;
