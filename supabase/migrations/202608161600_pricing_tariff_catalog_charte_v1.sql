-- SentraJet Premium — catalogue tarifaire versionné (charte v1.0 — 16 août 2026)
-- Couches : public | partner | supplier (jamais exposée au client final)

create table if not exists public.pricing_tariff_versions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  price_layer text not null check (price_layer in ('public', 'partner', 'supplier')),
  vehicle_type text not null default 'van',
  vehicle_model text not null default 'Hyundai Starex',
  capacity integer not null default 10,
  version_label text not null,
  is_active boolean not null default true,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.pricing_tariff_rules (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.pricing_tariff_versions(id) on delete cascade,
  service_family text not null,
  rule_key text not null,
  label text not null,
  pricing_mode text not null check (
    pricing_mode in ('per_km', 'forfait', 'forfait_plus_extra_km', 'hourly', 'manual')
  ),
  passengers_min integer,
  passengers_max integer,
  zone text not null default 'any' check (zone in ('any', 'dakar', 'hors_dakar')),
  base_price_fcfa numeric not null default 0,
  price_per_km_fcfa numeric,
  included_distance_km numeric,
  included_duration_hours numeric,
  extra_km_price_fcfa numeric,
  extra_hour_price_fcfa numeric,
  minimum_price_fcfa numeric,
  maximum_passengers integer,
  fuel_policy text not null default 'exclu' check (fuel_policy in ('inclus', 'exclu', 'estime', 'a_confirmer')),
  toll_policy text not null default 'exclu' check (toll_policy in ('inclus', 'exclu', 'estime', 'a_confirmer')),
  parking_policy text not null default 'exclu' check (parking_policy in ('inclus', 'exclu', 'estime', 'a_confirmer')),
  ferry_policy text not null default 'exclu' check (ferry_policy in ('inclus', 'exclu', 'estime', 'a_confirmer')),
  driver_policy text not null default 'inclus' check (driver_policy in ('inclus', 'exclu', 'estime', 'a_confirmer')),
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  unique (version_id, rule_key)
);

create index if not exists pricing_tariff_versions_layer_active_idx
  on public.pricing_tariff_versions (price_layer, is_active);

create index if not exists pricing_tariff_rules_version_idx
  on public.pricing_tariff_rules (version_id, service_family);

alter table public.pricing_tariff_versions enable row level security;
alter table public.pricing_tariff_rules enable row level security;

-- Public : uniquement couche public
drop policy if exists pricing_versions_select_public on public.pricing_tariff_versions;
create policy pricing_versions_select_public on public.pricing_tariff_versions
  for select to anon, authenticated
  using (is_active = true and price_layer = 'public');

drop policy if exists pricing_versions_select_partner on public.pricing_tariff_versions;
create policy pricing_versions_select_partner on public.pricing_tariff_versions
  for select to authenticated
  using (
    is_active = true
    and price_layer = 'partner'
    and public.has_any_role(array['partner', 'super_admin', 'manager', 'commercial', 'ops', 'finance']::public.app_role[])
  );

drop policy if exists pricing_versions_select_staff_all on public.pricing_tariff_versions;
create policy pricing_versions_select_staff_all on public.pricing_tariff_versions
  for select to authenticated
  using (
    public.has_any_role(array['super_admin', 'manager', 'commercial', 'ops', 'finance']::public.app_role[])
  );

drop policy if exists pricing_versions_write_staff on public.pricing_tariff_versions;
create policy pricing_versions_write_staff on public.pricing_tariff_versions
  for all to authenticated
  using (public.has_any_role(array['super_admin', 'manager', 'ops', 'finance']::public.app_role[]))
  with check (public.has_any_role(array['super_admin', 'manager', 'ops', 'finance']::public.app_role[]));

drop policy if exists pricing_rules_select_public on public.pricing_tariff_rules;
create policy pricing_rules_select_public on public.pricing_tariff_rules
  for select to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1 from public.pricing_tariff_versions v
      where v.id = version_id and v.is_active and v.price_layer = 'public'
    )
  );

drop policy if exists pricing_rules_select_partner on public.pricing_tariff_rules;
create policy pricing_rules_select_partner on public.pricing_tariff_rules
  for select to authenticated
  using (
    is_active = true
    and exists (
      select 1 from public.pricing_tariff_versions v
      where v.id = version_id and v.is_active and v.price_layer = 'partner'
    )
    and public.has_any_role(array['partner', 'super_admin', 'manager', 'commercial', 'ops', 'finance']::public.app_role[])
  );

drop policy if exists pricing_rules_select_staff on public.pricing_tariff_rules;
create policy pricing_rules_select_staff on public.pricing_tariff_rules
  for select to authenticated
  using (public.has_any_role(array['super_admin', 'manager', 'commercial', 'ops', 'finance']::public.app_role[]));

drop policy if exists pricing_rules_write_staff on public.pricing_tariff_rules;
create policy pricing_rules_write_staff on public.pricing_tariff_rules
  for all to authenticated
  using (public.has_any_role(array['super_admin', 'manager', 'ops', 'finance']::public.app_role[]))
  with check (public.has_any_role(array['super_admin', 'manager', 'ops', 'finance']::public.app_role[]));

-- Ne plus exposer les tarifs partenaire via l’ancienne table aux anonymes
drop policy if exists sentrajet_tariffs_select_all on public.sentrajet_tariffs;
create policy sentrajet_tariffs_select_public on public.sentrajet_tariffs
  for select to anon, authenticated
  using (is_active = true and segment = 'client');

drop policy if exists sentrajet_tariffs_select_partner on public.sentrajet_tariffs;
create policy sentrajet_tariffs_select_partner on public.sentrajet_tariffs
  for select to authenticated
  using (
    is_active = true
    and segment = 'partner'
    and public.has_any_role(array['partner', 'super_admin', 'manager', 'commercial', 'ops', 'finance']::public.app_role[])
  );

-- Seed charte v1
insert into public.pricing_tariff_versions (code, price_layer, vehicle_type, vehicle_model, capacity, version_label, notes)
values
  ('HYUNDAI_STAREX_PUBLIC_V1', 'public', 'van', 'Hyundai Starex', 10, 'Charte publique v1.0', 'Tarifs commerciaux SentraJet Premium'),
  ('HYUNDAI_STAREX_PARTNER_V1', 'partner', 'van', 'Hyundai Starex', 10, 'Charte partenaire v1.0', 'Tarifs partenaires certifiés — hors interface publique'),
  ('HYUNDAI_STAREX_SUPPLIER_V1', 'supplier', 'van', 'Hyundai Starex', 10, 'Coût fournisseur v1.0', 'Interne — jamais exposé client')
on conflict (code) do update set
  version_label = excluded.version_label,
  notes = excluded.notes,
  is_active = true;

-- Public km bands
insert into public.pricing_tariff_rules (
  version_id, service_family, rule_key, label, pricing_mode,
  passengers_min, passengers_max, zone, price_per_km_fcfa, minimum_price_fcfa,
  fuel_policy, toll_policy, parking_policy, ferry_policy, driver_policy, sort_order
)
select v.id, 'trajet', 'public_km_1_4', 'Public 1–4 passagers', 'per_km',
  1, 4, 'any', 800, 0, 'exclu', 'exclu', 'exclu', 'exclu', 'inclus', 10
from public.pricing_tariff_versions v where v.code = 'HYUNDAI_STAREX_PUBLIC_V1'
on conflict (version_id, rule_key) do update set price_per_km_fcfa = excluded.price_per_km_fcfa, label = excluded.label;

insert into public.pricing_tariff_rules (
  version_id, service_family, rule_key, label, pricing_mode,
  passengers_min, passengers_max, zone, price_per_km_fcfa, minimum_price_fcfa,
  fuel_policy, toll_policy, parking_policy, ferry_policy, driver_policy, sort_order
)
select v.id, 'trajet', 'public_km_5_7', 'Public 5–7 passagers', 'per_km',
  5, 7, 'any', 900, 0, 'exclu', 'exclu', 'exclu', 'exclu', 'inclus', 20
from public.pricing_tariff_versions v where v.code = 'HYUNDAI_STAREX_PUBLIC_V1'
on conflict (version_id, rule_key) do update set price_per_km_fcfa = excluded.price_per_km_fcfa;

insert into public.pricing_tariff_rules (
  version_id, service_family, rule_key, label, pricing_mode,
  passengers_min, passengers_max, zone, price_per_km_fcfa, minimum_price_fcfa,
  fuel_policy, toll_policy, parking_policy, ferry_policy, driver_policy, sort_order
)
select v.id, 'trajet', 'public_km_8_10', 'Public 8–10 passagers', 'per_km',
  8, 10, 'any', 1200, 0, 'exclu', 'exclu', 'exclu', 'exclu', 'inclus', 30
from public.pricing_tariff_versions v where v.code = 'HYUNDAI_STAREX_PUBLIC_V1'
on conflict (version_id, rule_key) do update set price_per_km_fcfa = excluded.price_per_km_fcfa;

insert into public.pricing_tariff_rules (
  version_id, service_family, rule_key, label, pricing_mode,
  zone, base_price_fcfa, included_duration_hours, minimum_price_fcfa,
  fuel_policy, toll_policy, parking_policy, ferry_policy, driver_policy, sort_order
)
select v.id, 'mad', 'public_mad_dakar', 'MAD public Dakar 10 h', 'forfait',
  'dakar', 50000, 10, 50000, 'exclu', 'exclu', 'exclu', 'exclu', 'inclus', 40
from public.pricing_tariff_versions v where v.code = 'HYUNDAI_STAREX_PUBLIC_V1'
on conflict (version_id, rule_key) do update set base_price_fcfa = excluded.base_price_fcfa;

-- Partner MAD
insert into public.pricing_tariff_rules (
  version_id, service_family, rule_key, label, pricing_mode,
  zone, base_price_fcfa, included_duration_hours, minimum_price_fcfa,
  fuel_policy, toll_policy, parking_policy, ferry_policy, driver_policy, sort_order
)
select v.id, 'mad', 'partner_mad_dakar', 'MAD partenaire Dakar 10 h', 'forfait',
  'dakar', 40000, 10, 40000, 'exclu', 'exclu', 'exclu', 'exclu', 'inclus', 10
from public.pricing_tariff_versions v where v.code = 'HYUNDAI_STAREX_PARTNER_V1'
on conflict (version_id, rule_key) do update set base_price_fcfa = excluded.base_price_fcfa;

insert into public.pricing_tariff_rules (
  version_id, service_family, rule_key, label, pricing_mode,
  zone, base_price_fcfa, included_distance_km, extra_km_price_fcfa, minimum_price_fcfa,
  fuel_policy, toll_policy, parking_policy, ferry_policy, driver_policy, sort_order
)
select v.id, 'mad', 'partner_mad_hors_dakar', 'MAD partenaire hors Dakar', 'forfait_plus_extra_km',
  'hors_dakar', 60000, 100, 600, 60000, 'exclu', 'exclu', 'exclu', 'exclu', 'inclus', 20
from public.pricing_tariff_versions v where v.code = 'HYUNDAI_STAREX_PARTNER_V1'
on conflict (version_id, rule_key) do update
  set base_price_fcfa = excluded.base_price_fcfa,
      included_distance_km = excluded.included_distance_km,
      extra_km_price_fcfa = excluded.extra_km_price_fcfa;

insert into public.pricing_tariff_rules (
  version_id, service_family, rule_key, label, pricing_mode,
  zone, price_per_km_fcfa, minimum_price_fcfa,
  fuel_policy, toll_policy, parking_policy, ferry_policy, driver_policy, sort_order
)
select v.id, 'trajet', 'partner_interurbain_km', 'Partenaire interurbain', 'per_km',
  'any', 700, 30000, 'exclu', 'exclu', 'exclu', 'exclu', 'inclus', 30
from public.pricing_tariff_versions v where v.code = 'HYUNDAI_STAREX_PARTNER_V1'
on conflict (version_id, rule_key) do update set price_per_km_fcfa = excluded.price_per_km_fcfa;

-- Supplier (interne) — coût d’achat indicatif
insert into public.pricing_tariff_rules (
  version_id, service_family, rule_key, label, pricing_mode,
  zone, base_price_fcfa, included_duration_hours,
  fuel_policy, toll_policy, parking_policy, ferry_policy, driver_policy, sort_order
)
select v.id, 'mad', 'supplier_mad_dakar', 'Coût fournisseur MAD Dakar (indicatif)', 'forfait',
  'dakar', 40000, 10, 'exclu', 'exclu', 'exclu', 'exclu', 'inclus', 10
from public.pricing_tariff_versions v where v.code = 'HYUNDAI_STAREX_SUPPLIER_V1'
on conflict (version_id, rule_key) do update set base_price_fcfa = excluded.base_price_fcfa;

GRANT SELECT ON public.pricing_tariff_versions TO anon, authenticated;
GRANT SELECT ON public.pricing_tariff_rules TO anon, authenticated;
