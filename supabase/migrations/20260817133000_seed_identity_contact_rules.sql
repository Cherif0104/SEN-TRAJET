-- Espace Super Admin (Phase 11) — l'écran "Configuration" affichait des valeurs figées dans le
-- code (identité, contact) sans aucune ligne réelle en base pour les rendre éditables. Ce seed
-- reprend exactement les valeurs par défaut déjà utilisées en fallback (aucun changement de
-- comportement) et les rend persistables/éditables via business_rules.

insert into public.business_rules (category, rule_key, label, value_json, unit, is_active, notes)
values
  ('identity', 'company_name', 'Nom de la plateforme', '"SentraJet Premium"', 'text', true, null),
  ('identity', 'primary_zone', 'Zone principale', '"Dakar & Sénégal"', 'text', true, null),
  ('contact', 'whatsapp_phone', 'WhatsApp', '"221788324069"', 'phone', true, null)
on conflict (category, rule_key) do nothing;
