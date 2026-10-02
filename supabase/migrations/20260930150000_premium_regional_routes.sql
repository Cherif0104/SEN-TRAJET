-- Catalogue des lignes régionales SentraJet Premium (vitrine + tarif indicatif réutilisant le
-- moteur de tarification existant). Volontairement distinct des tables allo_dakar_* (marketplace
-- de covoiturage informel) : ici, chaque trajet reste une réservation classique "transport avec
-- chauffeur" passant par /reserver, cette table ne fait qu'alimenter une page de découverte.
create table if not exists public.premium_regional_routes (
  id uuid primary key default gen_random_uuid(),
  destination_city text not null unique,
  region text,
  distance_km integer not null check (distance_km > 0),
  duration_minutes integer,
  suggested_schedule text,
  description text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.premium_regional_routes is
  'Catalogue vitrine des destinations régionales SentraJet Premium (page /destinations). '
  'Le prix affiché est recalculé en direct par le moteur de tarification interurbain à partir '
  'de distance_km — cette table ne stocke jamais de prix figé.';

alter table public.premium_regional_routes enable row level security;

drop policy if exists premium_regional_routes_public_read on public.premium_regional_routes;
create policy premium_regional_routes_public_read
  on public.premium_regional_routes
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists premium_regional_routes_staff_read on public.premium_regional_routes;
create policy premium_regional_routes_staff_read
  on public.premium_regional_routes
  for select
  to authenticated
  using (has_any_role(array['super_admin'::app_role, 'manager'::app_role, 'commercial'::app_role, 'ops'::app_role]));

drop policy if exists premium_regional_routes_staff_write on public.premium_regional_routes;
create policy premium_regional_routes_staff_write
  on public.premium_regional_routes
  for all
  to authenticated
  using (has_any_role(array['super_admin'::app_role, 'manager'::app_role, 'commercial'::app_role, 'ops'::app_role]))
  with check (has_any_role(array['super_admin'::app_role, 'manager'::app_role, 'commercial'::app_role, 'ops'::app_role]));

create index if not exists idx_premium_regional_routes_active_order
  on public.premium_regional_routes (is_active, display_order);

-- Seed : régions principales du Sénégal, distances alignées sur routeDistances.ts
-- (DAKAR_ROUTE_SEED_KM) pour rester cohérent avec le moteur de secours déjà utilisé en réservation.
insert into public.premium_regional_routes
  (destination_city, region, distance_km, duration_minutes, suggested_schedule, description, display_order)
values
  ('Thiès', 'Thiès', 67, 70, 'Départs à la demande, 7j/7', 'Porte d''entrée vers le centre et le nord du pays.', 10),
  ('Mbour / Saly', 'Petite Côte', 90, 90, 'Départs à la demande, 7j/7', 'Zone touristique et balnéaire — idéal séjours et transferts hôtel.', 20),
  ('Touba', 'Centre', 190, 150, 'Départs à la demande, forte affluence les jours de Magal', 'Ville religieuse — anticiper les pics de demande lors des grands événements.', 30),
  ('Diourbel', 'Centre', 147, 120, 'Départs à la demande, 7j/7', 'Carrefour central vers le Baol.', 40),
  ('Kaolack', 'Centre', 195, 150, 'Départs à la demande, 7j/7', 'Carrefour commercial du Sine-Saloum.', 50),
  ('Louga', 'Nord', 192, 150, 'Départs à la demande, 7j/7', 'Étape vers le nord et la vallée du fleuve.', 60),
  ('Saint-Louis', 'Nord', 240, 180, 'Départs à la demande, 7j/7', 'Ville historique classée UNESCO, au nord du pays.', 70),
  ('Ziguinchor', 'Sud (Casamance)', 448, 360, 'Sur réservation avec délai de prévenance', 'Casamance — trajet longue distance, prévoir une réservation à l''avance.', 80),
  ('Tambacounda', 'Est', 463, 360, 'Sur réservation avec délai de prévenance', 'Est du pays — porte d''entrée vers le Sénégal oriental.', 90)
on conflict (destination_city) do nothing;
