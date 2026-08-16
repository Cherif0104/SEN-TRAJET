-- SentraJet Premium: règles paramétrables, historique statuts, propriétaires, paiements
-- Voir docs/operations/

create table if not exists public.business_rules (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  rule_key text not null,
  label text not null,
  value_json jsonb not null default '{}'::jsonb,
  unit text,
  is_active boolean not null default true,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (category, rule_key)
);

insert into public.business_rules (category, rule_key, label, value_json, unit, notes) values
  ('cancellation', 'fee_over_6h_percent', 'Annulation > 6h', '0', 'percent', null),
  ('cancellation', 'fee_4h_to_6h_percent', 'Annulation 4h–6h', '30', 'percent', null),
  ('cancellation', 'fee_under_2h_percent', 'Annulation < 2h', '50', 'percent', null),
  ('cancellation', 'fee_2h_to_4h_percent', 'Annulation 2h–4h (à décider)', 'null', 'percent', 'OPEN D-01 — ne pas inventer'),
  ('waiting', 'free_minutes', 'Attente gratuite', '30', 'minutes', null),
  ('waiting', 'fee_per_block_fcfa', 'Frais par tranche', '2500', 'fcfa', null),
  ('waiting', 'block_minutes', 'Durée d''une tranche', '30', 'minutes', null),
  ('pricing', 'interurbain_min_fcfa', 'Minimum interurbain', '30000', 'fcfa', null),
  ('pricing', 'interurbain_min_distance_km', 'Seuil interurbain', '50', 'km', null),
  ('vehicle_partner', 'min_monthly_fcfa', 'Contrat exploitation à partir de', '500000', 'fcfa', 'Pas un rendement garanti'),
  ('payment', 'wave_checkout_url', 'Lien Wave Impulcia Afrique', '"https://pay.wave.com/m/M_sn_Sc0CT6Qo7LkY/c/sn/"', 'url', null),
  ('contact', 'whatsapp_phone', 'WhatsApp SentraJet', '"221788324069"', 'phone', null),
  ('complaint', 'deadline_hours', 'Délai réclamation (à décider)', 'null', 'hours', 'OPEN D-03')
on conflict (category, rule_key) do update
  set label = excluded.label,
      value_json = excluded.value_json,
      unit = excluded.unit,
      notes = excluded.notes,
      updated_at = now();

insert into public.sentrajet_tariffs (segment, rule_key, label, amount_fcfa, unit) values
  ('client', 'aibd_retour_1_3', 'AIBD + retour 1–3 passagers', 35000, 'forfait'),
  ('client', 'aibd_retour_4_5', 'AIBD + retour 4–5 passagers', 40000, 'forfait'),
  ('client', 'aibd_retour_6_8', 'AIBD + retour 6–8 passagers', 50000, 'forfait'),
  ('client', 'aibd_retour_9_11', 'AIBD + retour 9–11 passagers', 60000, 'forfait'),
  ('client', 'interurbain_min', 'Minimum interurbain client', 30000, 'forfait'),
  ('partner', 'interurbain_min', 'Minimum interurbain partenaire', 30000, 'forfait')
on conflict (segment, rule_key) do update
  set label = excluded.label,
      amount_fcfa = excluded.amount_fcfa,
      unit = excluded.unit,
      is_active = true;

alter table public.bookings
  add column if not exists flight_number text,
  add column if not exists passenger_name text,
  add column if not exists luggage_count integer,
  add column if not exists phone text,
  add column if not exists waiting_minutes integer default 0,
  add column if not exists waiting_fee_fcfa integer default 0,
  add column if not exists cancellation_fee_fcfa integer default 0,
  add column if not exists final_amount_fcfa numeric,
  add column if not exists vehicles_needed integer default 1,
  add column if not exists is_round_trip boolean default false;

create table if not exists public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists booking_status_history_booking_idx
  on public.booking_status_history (booking_id, created_at desc);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  amount_fcfa numeric not null,
  currency text not null default 'XOF',
  provider text not null default 'wave',
  provider_ref text,
  booking_ref text,
  status text not null default 'pending',
  paid_at timestamptz,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_owners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id),
  full_name text not null,
  phone text,
  email text,
  company_name text,
  status text not null default 'prospect',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_exploitation_contracts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.vehicle_owners(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  vehicle_label text not null,
  monthly_amount_fcfa numeric not null default 500000,
  start_date date,
  end_date date,
  status text not null default 'draft',
  terms_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_rules enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.vehicle_owners enable row level security;
alter table public.vehicle_exploitation_contracts enable row level security;

drop policy if exists business_rules_select on public.business_rules;
create policy business_rules_select on public.business_rules
  for select to anon, authenticated using (is_active = true);

drop policy if exists business_rules_write_staff on public.business_rules;
create policy business_rules_write_staff on public.business_rules
  for all to authenticated using (true) with check (true);

drop policy if exists booking_status_history_all on public.booking_status_history;
create policy booking_status_history_all on public.booking_status_history
  for all to authenticated using (true) with check (true);

drop policy if exists payments_all_auth on public.payments;
create policy payments_all_auth on public.payments
  for all to authenticated using (true) with check (true);

drop policy if exists vehicle_owners_all_auth on public.vehicle_owners;
create policy vehicle_owners_all_auth on public.vehicle_owners
  for all to authenticated using (true) with check (true);

drop policy if exists vehicle_contracts_all_auth on public.vehicle_exploitation_contracts;
create policy vehicle_contracts_all_auth on public.vehicle_exploitation_contracts
  for all to authenticated using (true) with check (true);
