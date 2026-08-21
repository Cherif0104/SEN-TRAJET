-- Tarifs personnalisés par partenaire : aujourd'hui tous les partenaires B2B partagent la même
-- grille "partner" (price_layer = 'partner'). Le staff doit pouvoir fixer un prix différent pour
-- UN partenaire précis et UN type de prestation précis (ex. "transfert aéroport à 7 000 FCFA pour
-- le Partenaire X"), qui prévaut alors sur la grille générique.
create table if not exists public.partner_tariff_overrides (
  id uuid primary key default gen_random_uuid(),
  partner_contract_id uuid not null references public.partner_contracts(id) on delete cascade,
  service_type text not null,
  pricing_mode text not null default 'forfait' check (pricing_mode in ('forfait', 'per_km')),
  base_price_fcfa integer,
  price_per_km_fcfa integer,
  minimum_price_fcfa integer,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_contract_id, service_type)
);

create index if not exists partner_tariff_overrides_contract_idx on public.partner_tariff_overrides (partner_contract_id);

alter table public.partner_tariff_overrides enable row level security;

create policy "partner_tariff_overrides_select_own_or_staff" on public.partner_tariff_overrides
for select to authenticated
using (
  has_any_role(array['super_admin', 'manager', 'commercial', 'finance']::app_role[])
  or exists (
    select 1 from public.partner_contracts pc
    where pc.id = partner_tariff_overrides.partner_contract_id and pc.partner_user_id = auth.uid()
  )
);

create policy "partner_tariff_overrides_write_staff" on public.partner_tariff_overrides
for all to authenticated
using (has_any_role(array['super_admin', 'manager', 'commercial', 'finance']::app_role[]))
with check (has_any_role(array['super_admin', 'manager', 'commercial', 'finance']::app_role[]));
