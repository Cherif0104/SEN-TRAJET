-- Corrige la grille "mise à disposition" publique : 8h incluses (au lieu de 10h) et 60 000 FCFA
-- hors Dakar (au lieu de 70 000 FCFA) — le tarif Dakar (50 000 FCFA) était déjà correct.
update public.pricing_tariff_rules r
set label = 'MAD public Dakar 8 h',
    included_duration_hours = 8
from public.pricing_tariff_versions v
where r.version_id = v.id
  and v.price_layer = 'public'
  and r.rule_key = 'public_mad_dakar';

update public.pricing_tariff_rules r
set label = 'MAD public hors Dakar 8 h',
    base_price_fcfa = 60000,
    minimum_price_fcfa = 60000,
    included_duration_hours = 8
from public.pricing_tariff_versions v
where r.version_id = v.id
  and v.price_layer = 'public'
  and r.rule_key = 'public_mad_hors_dakar';

-- Tarifs "à partir de" par catégorie de véhicule pour les transferts aéroport (Berline/SUV/Van),
-- forfait couvrant jusqu'à 100 km (Dakar-Plateau ↔ AIBD ≈ 51 km réels), puis facturation au km
-- au-delà. Configurable sans code depuis /admin (catégorie business_rules "vehicle_pricing").
insert into public.business_rules (category, rule_key, label, value_json, unit, is_active, notes)
values
  ('vehicle_pricing', 'berline_base_fcfa', 'Berline — transfert aéroport, à partir de', '25000', 'fcfa', true, 'Forfait jusqu''à 100 km (Dakar-Plateau ↔ AIBD ≈ 51 km réels).'),
  ('vehicle_pricing', 'berline_extra_km_fcfa', 'Berline — FCFA/km au-delà de 100 km', '500', 'fcfa_per_km', true, null),
  ('vehicle_pricing', 'suv_base_fcfa', 'SUV — transfert aéroport, à partir de', '30000', 'fcfa', true, 'Fourchette usuelle 30 000 à 35 000 FCFA selon modèle — valeur de départ configurable ici.'),
  ('vehicle_pricing', 'suv_extra_km_fcfa', 'SUV — FCFA/km au-delà de 100 km', '600', 'fcfa_per_km', true, null),
  ('vehicle_pricing', 'van_base_fcfa', 'Van / Minibus — transfert aéroport, à partir de', '45000', 'fcfa', true, null),
  ('vehicle_pricing', 'van_extra_km_fcfa', 'Van / Minibus — FCFA/km au-delà de 100 km', '700', 'fcfa_per_km', true, null),
  ('vehicle_pricing', 'flat_rate_max_km', 'Distance incluse dans le forfait (km)', '100', 'km', true, 'Au-delà, facturation au km selon la catégorie choisie.')
on conflict (category, rule_key) do nothing;
