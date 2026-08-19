-- Nouveau module « SentraJet Intercité » (façon Allo Dakar) : transport interurbain en véhicules
-- partenaires indépendants, entièrement séparé du modèle Premium (flotte propre, transferts
-- aéroport, mise à disposition). Tables dédiées pour ne jamais mélanger ces chauffeurs
-- indépendants avec le pool de dispatch Premium (drivers/vehicles).

-- ============================================================
-- Corridors (axes desservis, ex. Dakar -> Saint-Louis)
-- ============================================================
create table if not exists public.intercity_corridors (
  id uuid primary key default gen_random_uuid(),
  origin_city text not null,
  destination_city text not null,
  reference_price_fcfa integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists intercity_corridors_unique_pair
  on public.intercity_corridors (lower(origin_city), lower(destination_city));

-- ============================================================
-- Chauffeurs indépendants intercité (distincts des chauffeurs Premium)
-- ============================================================
create table if not exists public.intercity_drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  phone text not null,
  id_card_number text,
  photo_url text,
  garage_name text,
  wave_payout_mobile text,
  wave_payout_name text,
  status text not null default 'en_attente' check (status in ('en_attente', 'actif', 'suspendu', 'rejete')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intercity_vehicles (
  id uuid primary key default gen_random_uuid(),
  intercity_driver_id uuid not null references public.intercity_drivers(id) on delete cascade,
  plate_number text not null,
  brand text,
  model text,
  seats_total integer not null check (seats_total between 2 and 30),
  grey_card_number text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Abonnements = droit de publication sur un corridor donné (encaissé d'avance,
-- jamais remboursé au prorata d'une réservation individuelle annulée).
-- ============================================================
create table if not exists public.intercity_driver_subscriptions (
  id uuid primary key default gen_random_uuid(),
  intercity_driver_id uuid not null references public.intercity_drivers(id) on delete cascade,
  corridor_id uuid not null references public.intercity_corridors(id) on delete cascade,
  plan text not null default 'essai_gratuit' check (plan in ('essai_gratuit', 'hebdomadaire', 'mensuel')),
  price_fcfa_paid integer not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'actif' check (status in ('actif', 'expire', 'suspendu')),
  created_at timestamptz not null default now()
);

create index if not exists intercity_subscriptions_driver_idx on public.intercity_driver_subscriptions (intercity_driver_id);
create index if not exists intercity_subscriptions_corridor_idx on public.intercity_driver_subscriptions (corridor_id);

-- ============================================================
-- Départs publiés par un chauffeur sur un corridor
-- ============================================================
create table if not exists public.intercity_departures (
  id uuid primary key default gen_random_uuid(),
  intercity_driver_id uuid not null references public.intercity_drivers(id) on delete cascade,
  intercity_vehicle_id uuid not null references public.intercity_vehicles(id) on delete cascade,
  corridor_id uuid not null references public.intercity_corridors(id) on delete cascade,
  departure_at timestamptz not null,
  price_per_seat_fcfa integer not null,
  seats_total integer not null,
  seats_available integer not null,
  status text not null default 'publie' check (status in ('publie', 'complet', 'en_cours', 'termine', 'annule')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intercity_departures_corridor_idx on public.intercity_departures (corridor_id, departure_at);
create index if not exists intercity_departures_driver_idx on public.intercity_departures (intercity_driver_id);

-- ============================================================
-- Réservations de places (clients SentraJet ou passagers occasionnels)
-- ============================================================
create table if not exists public.intercity_bookings (
  id uuid primary key default gen_random_uuid(),
  departure_id uuid not null references public.intercity_departures(id) on delete cascade,
  client_user_id uuid references auth.users(id) on delete set null,
  client_full_name text not null,
  client_phone text not null,
  seats_booked integer not null default 1 check (seats_booked between 1 and 10),
  amount_fcfa integer not null,
  commission_fcfa integer not null default 0,
  driver_payout_fcfa integer not null default 0,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  payment_provider_ref text,
  status text not null default 'confirmee' check (status in ('confirmee', 'annulee', 'terminee', 'no_show')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intercity_bookings_departure_idx on public.intercity_bookings (departure_id);
create index if not exists intercity_bookings_client_idx on public.intercity_bookings (client_user_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.intercity_corridors enable row level security;
alter table public.intercity_drivers enable row level security;
alter table public.intercity_vehicles enable row level security;
alter table public.intercity_driver_subscriptions enable row level security;
alter table public.intercity_departures enable row level security;
alter table public.intercity_bookings enable row level security;

-- Corridors : lecture publique (nécessaire pour la recherche client anonyme), écriture staff.
create policy "intercity_corridors_select_all" on public.intercity_corridors
for select to anon, authenticated using (true);

create policy "intercity_corridors_write_staff" on public.intercity_corridors
for all to authenticated
using (has_any_role(array['super_admin', 'manager', 'ops']::app_role[]))
with check (has_any_role(array['super_admin', 'manager', 'ops']::app_role[]));

-- Chauffeurs intercité : le chauffeur voit/gère sa propre fiche, le staff voit/gère tout.
create policy "intercity_drivers_select_self_or_staff" on public.intercity_drivers
for select to authenticated
using (user_id = auth.uid() or has_any_role(array['super_admin', 'manager', 'ops']::app_role[]));

create policy "intercity_drivers_insert_self_or_staff" on public.intercity_drivers
for insert to authenticated
with check (user_id = auth.uid() or has_any_role(array['super_admin', 'manager', 'ops']::app_role[]));

create policy "intercity_drivers_update_self_or_staff" on public.intercity_drivers
for update to authenticated
using (user_id = auth.uid() or has_any_role(array['super_admin', 'manager', 'ops']::app_role[]))
with check (user_id = auth.uid() or has_any_role(array['super_admin', 'manager', 'ops']::app_role[]));

-- Véhicules intercité : accès via le chauffeur propriétaire, ou staff.
create policy "intercity_vehicles_select_owner_or_staff" on public.intercity_vehicles
for select to authenticated
using (
  has_any_role(array['super_admin', 'manager', 'ops']::app_role[])
  or exists (select 1 from public.intercity_drivers d where d.id = intercity_vehicles.intercity_driver_id and d.user_id = auth.uid())
);

create policy "intercity_vehicles_write_owner_or_staff" on public.intercity_vehicles
for all to authenticated
using (
  has_any_role(array['super_admin', 'manager', 'ops']::app_role[])
  or exists (select 1 from public.intercity_drivers d where d.id = intercity_vehicles.intercity_driver_id and d.user_id = auth.uid())
)
with check (
  has_any_role(array['super_admin', 'manager', 'ops']::app_role[])
  or exists (select 1 from public.intercity_drivers d where d.id = intercity_vehicles.intercity_driver_id and d.user_id = auth.uid())
);

-- Abonnements : lecture par le chauffeur concerné ou staff ; écriture réservée au staff (contrôle
-- total sur l'activation/désactivation, conformément au modèle validé).
create policy "intercity_subscriptions_select_owner_or_staff" on public.intercity_driver_subscriptions
for select to authenticated
using (
  has_any_role(array['super_admin', 'manager', 'ops']::app_role[])
  or exists (select 1 from public.intercity_drivers d where d.id = intercity_driver_subscriptions.intercity_driver_id and d.user_id = auth.uid())
);

create policy "intercity_subscriptions_write_staff" on public.intercity_driver_subscriptions
for all to authenticated
using (has_any_role(array['super_admin', 'manager', 'ops']::app_role[]))
with check (has_any_role(array['super_admin', 'manager', 'ops']::app_role[]));

-- Départs : lecture publique (recherche client), écriture par le chauffeur propriétaire (si
-- abonnement actif sur le corridor, vérifié côté application/RPC) ou le staff.
create policy "intercity_departures_select_all" on public.intercity_departures
for select to anon, authenticated using (true);

create policy "intercity_departures_write_owner_or_staff" on public.intercity_departures
for all to authenticated
using (
  has_any_role(array['super_admin', 'manager', 'ops']::app_role[])
  or exists (select 1 from public.intercity_drivers d where d.id = intercity_departures.intercity_driver_id and d.user_id = auth.uid())
)
with check (
  has_any_role(array['super_admin', 'manager', 'ops']::app_role[])
  or exists (select 1 from public.intercity_drivers d where d.id = intercity_departures.intercity_driver_id and d.user_id = auth.uid())
);

-- Réservations : le client voit les siennes, le chauffeur du départ concerné les voit, le staff
-- voit tout. Création ouverte à anon/authenticated (réservation possible sans compte, comme la
-- demande de réservation Premium).
create policy "intercity_bookings_select_participant_or_staff" on public.intercity_bookings
for select to authenticated
using (
  has_any_role(array['super_admin', 'manager', 'ops']::app_role[])
  or client_user_id = auth.uid()
  or exists (
    select 1 from public.intercity_departures dep
    join public.intercity_drivers d on d.id = dep.intercity_driver_id
    where dep.id = intercity_bookings.departure_id and d.user_id = auth.uid()
  )
);

create policy "intercity_bookings_insert_anon" on public.intercity_bookings
for insert to anon with check (true);

create policy "intercity_bookings_insert_authenticated" on public.intercity_bookings
for insert to authenticated with check (true);

create policy "intercity_bookings_update_staff" on public.intercity_bookings
for update to authenticated
using (has_any_role(array['super_admin', 'manager', 'ops']::app_role[]))
with check (has_any_role(array['super_admin', 'manager', 'ops']::app_role[]));

-- ============================================================
-- Paramètres par défaut (modifiables ensuite depuis l'admin, sans redéploiement de code)
-- ============================================================
insert into public.business_rules (category, rule_key, label, value_json, unit, is_active, notes)
values
  ('intercity', 'subscription_price_hebdomadaire_fcfa', 'Prix abonnement hebdomadaire', '5000', 'FCFA', true, 'Accès publication sur un corridor, 7 jours'),
  ('intercity', 'subscription_price_mensuel_fcfa', 'Prix abonnement mensuel', '15000', 'FCFA', true, 'Accès publication sur un corridor, 30 jours'),
  ('intercity', 'essai_gratuit_jours', 'Durée essai gratuit', '15', 'jours', true, 'Durée de l''essai gratuit à la première inscription d''un chauffeur'),
  ('intercity', 'commission_percent', 'Commission SentraJet', '10', '%', true, 'Prélevée à la source sur chaque réservation payée, avant reversement au chauffeur')
on conflict (category, rule_key) do nothing;
