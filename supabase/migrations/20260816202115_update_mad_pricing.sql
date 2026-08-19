-- Mise à disposition — barème validé le 16 août 2026.
-- Public Dakar : 50 000 FCFA / 10 h.
-- Public hors Dakar : 70 000 FCFA jusqu'à 100 km, puis 530 FCFA/km.
-- Partenaire Dakar : 40 000 FCFA / 10 h.
-- Partenaire hors Dakar : devis contrôlé (aucun prix inventé).

insert into public.pricing_tariff_rules (
  version_id,
  service_family,
  rule_key,
  label,
  pricing_mode,
  passengers_max,
  zone,
  base_price_fcfa,
  included_distance_km,
  included_duration_hours,
  extra_km_price_fcfa,
  minimum_price_fcfa,
  fuel_policy,
  toll_policy,
  parking_policy,
  ferry_policy,
  driver_policy,
  sort_order
)
select
  v.id,
  'mad',
  'public_mad_hors_dakar',
  'MAD public hors Dakar 10 h',
  'forfait_plus_extra_km',
  10,
  'hors_dakar',
  70000,
  100,
  10,
  530,
  70000,
  'exclu',
  'exclu',
  'exclu',
  'exclu',
  'inclus',
  50
from public.pricing_tariff_versions v
where v.code = 'HYUNDAI_STAREX_PUBLIC_V1'
on conflict (version_id, rule_key) do update
set
  label = excluded.label,
  pricing_mode = excluded.pricing_mode,
  passengers_max = excluded.passengers_max,
  zone = excluded.zone,
  base_price_fcfa = excluded.base_price_fcfa,
  included_distance_km = excluded.included_distance_km,
  included_duration_hours = excluded.included_duration_hours,
  extra_km_price_fcfa = excluded.extra_km_price_fcfa,
  minimum_price_fcfa = excluded.minimum_price_fcfa,
  fuel_policy = excluded.fuel_policy,
  toll_policy = excluded.toll_policy,
  parking_policy = excluded.parking_policy,
  ferry_policy = excluded.ferry_policy,
  driver_policy = excluded.driver_policy,
  is_active = true,
  sort_order = excluded.sort_order;

update public.pricing_tariff_rules r
set
  label = 'MAD public Dakar 10 h',
  pricing_mode = 'forfait',
  base_price_fcfa = 50000,
  included_distance_km = null,
  included_duration_hours = 10,
  extra_km_price_fcfa = null,
  minimum_price_fcfa = 50000,
  fuel_policy = 'exclu',
  toll_policy = 'exclu',
  parking_policy = 'exclu',
  ferry_policy = 'exclu',
  driver_policy = 'inclus',
  is_active = true
from public.pricing_tariff_versions v
where r.version_id = v.id
  and v.code = 'HYUNDAI_STAREX_PUBLIC_V1'
  and r.rule_key = 'public_mad_dakar';

update public.pricing_tariff_rules r
set
  label = 'MAD partenaire Dakar 10 h',
  pricing_mode = 'forfait',
  base_price_fcfa = 40000,
  included_distance_km = null,
  included_duration_hours = 10,
  extra_km_price_fcfa = null,
  minimum_price_fcfa = 40000,
  fuel_policy = 'exclu',
  toll_policy = 'exclu',
  parking_policy = 'exclu',
  ferry_policy = 'exclu',
  driver_policy = 'inclus',
  is_active = true
from public.pricing_tariff_versions v
where r.version_id = v.id
  and v.code = 'HYUNDAI_STAREX_PARTNER_V1'
  and r.rule_key = 'partner_mad_dakar';

update public.pricing_tariff_rules r
set
  label = 'MAD partenaire hors Dakar — sur devis',
  pricing_mode = 'manual',
  base_price_fcfa = 0,
  included_distance_km = null,
  included_duration_hours = 10,
  extra_km_price_fcfa = null,
  minimum_price_fcfa = null,
  fuel_policy = 'exclu',
  toll_policy = 'exclu',
  parking_policy = 'exclu',
  ferry_policy = 'exclu',
  driver_policy = 'inclus',
  is_active = true
from public.pricing_tariff_versions v
where r.version_id = v.id
  and v.code = 'HYUNDAI_STAREX_PARTNER_V1'
  and r.rule_key = 'partner_mad_hors_dakar';
