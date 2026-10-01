-- Aligne la durée incluse de la MAD partenaire sur la MAD publique (8h, cf. migration
-- 20260930120000) : c'est une politique métier générale, pas spécifique au segment public.
update public.pricing_tariff_rules ptr
set label = 'MAD partenaire Dakar 8 h', included_duration_hours = 8
from public.pricing_tariff_versions ptv
where ptv.id = ptr.version_id
  and ptv.price_layer = 'partner'
  and ptr.rule_key = 'partner_mad_dakar';

update public.pricing_tariff_rules ptr
set included_duration_hours = 8
from public.pricing_tariff_versions ptv
where ptv.id = ptr.version_id
  and ptv.price_layer = 'partner'
  and ptr.rule_key = 'partner_mad_hors_dakar';
