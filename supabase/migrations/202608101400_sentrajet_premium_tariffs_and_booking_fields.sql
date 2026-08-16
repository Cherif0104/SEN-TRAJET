-- SentraJet Premium: tarifs + champs réservation + rôle profils
-- Appliqué sur projet SEN TRAJET (ootvzknyhkhxroadnclh)

alter table public.bookings
  add column if not exists reference text,
  add column if not exists passengers integer not null default 1,
  add column if not exists notes text,
  add column if not exists pricing_segment text not null default 'client',
  add column if not exists partner_contract_id uuid references public.partner_contracts(id),
  add column if not exists distance_km numeric;

create unique index if not exists bookings_reference_uidx
  on public.bookings (reference)
  where reference is not null;

alter table public.profiles
  add column if not exists role text;

create table if not exists public.sentrajet_tariffs (
  id uuid primary key default gen_random_uuid(),
  segment text not null check (segment in ('client', 'partner')),
  rule_key text not null,
  label text not null,
  amount_fcfa integer not null,
  unit text not null default 'forfait' check (unit in ('forfait', 'per_km')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (segment, rule_key)
);

insert into public.sentrajet_tariffs (segment, rule_key, label, amount_fcfa, unit) values
  ('client', 'aibd_1_2', 'AIBD 1–2 passagers', 25000, 'forfait'),
  ('client', 'aibd_3_5', 'AIBD 3–5 passagers', 30000, 'forfait'),
  ('client', 'aibd_6_8', 'AIBD 6–8 passagers', 40000, 'forfait'),
  ('client', 'aibd_9_11', 'AIBD 9–11 passagers', 50000, 'forfait'),
  ('client', 'interurbain_km', 'Interurbain > 50 km', 850, 'per_km'),
  ('partner', 'aibd_1_2', 'AIBD 1–2 passagers', 20000, 'forfait'),
  ('partner', 'aibd_3_5', 'AIBD 3–5 passagers', 25000, 'forfait'),
  ('partner', 'aibd_6_8', 'AIBD 6–8 passagers', 30000, 'forfait'),
  ('partner', 'aibd_9_11', 'AIBD 9–11 passagers', 40000, 'forfait'),
  ('partner', 'interurbain_km', 'Interurbain > 50 km', 700, 'per_km'),
  ('partner', 'mise_disposition_base', 'Mise à disposition (base)', 25000, 'forfait')
on conflict (segment, rule_key) do update
  set label = excluded.label,
      amount_fcfa = excluded.amount_fcfa,
      unit = excluded.unit,
      is_active = true;

alter table public.sentrajet_tariffs enable row level security;

drop policy if exists sentrajet_tariffs_select_all on public.sentrajet_tariffs;
create policy sentrajet_tariffs_select_all on public.sentrajet_tariffs
  for select to anon, authenticated using (is_active = true);

drop policy if exists sentrajet_tariffs_write_staff on public.sentrajet_tariffs;
create policy sentrajet_tariffs_write_staff on public.sentrajet_tariffs
  for all to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('super_admin', 'manager', 'ops', 'finance', 'fleet_manager')
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('super_admin', 'manager', 'ops', 'finance', 'fleet_manager')
    )
  );

drop policy if exists bookings_select_authenticated on public.bookings;
create policy bookings_select_authenticated on public.bookings
  for select to authenticated using (true);

drop policy if exists bookings_insert_authenticated on public.bookings;
create policy bookings_insert_authenticated on public.bookings
  for insert to authenticated with check (true);

drop policy if exists bookings_update_authenticated on public.bookings;
create policy bookings_update_authenticated on public.bookings
  for update to authenticated using (true) with check (true);

drop policy if exists drivers_select_authenticated on public.drivers;
create policy drivers_select_authenticated on public.drivers
  for select to authenticated using (true);

drop policy if exists vehicles_select_authenticated on public.vehicles;
create policy vehicles_select_authenticated on public.vehicles
  for select to authenticated using (true);

drop policy if exists clients_select_authenticated on public.clients;
create policy clients_select_authenticated on public.clients
  for select to authenticated using (true);

drop policy if exists partner_contracts_select_authenticated on public.partner_contracts;
create policy partner_contracts_select_authenticated on public.partner_contracts
  for select to authenticated using (true);

drop policy if exists service_orders_all_authenticated on public.service_orders;
create policy service_orders_all_authenticated on public.service_orders
  for all to authenticated using (true) with check (true);

drop policy if exists dispatch_assignments_all_authenticated on public.dispatch_assignments;
create policy dispatch_assignments_all_authenticated on public.dispatch_assignments
  for all to authenticated using (true) with check (true);
