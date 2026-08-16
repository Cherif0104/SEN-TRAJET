insert into public.sentrajet_tariffs (segment, rule_key, label, amount_fcfa, unit) values
  ('client', 'mad_morning', 'Mise à disposition matinée (≤100 km)', 50000, 'forfait'),
  ('client', 'mad_included_km', 'Km inclus MAD matinée', 100, 'forfait'),
  ('partner', 'mad_morning', 'Mise à disposition matinée (≤100 km)', 50000, 'forfait'),
  ('partner', 'mad_included_km', 'Km inclus MAD matinée', 100, 'forfait')
on conflict (segment, rule_key) do update
  set label = excluded.label,
      amount_fcfa = excluded.amount_fcfa,
      unit = excluded.unit,
      is_active = true;

insert into public.business_rules (category, rule_key, label, value_json, unit, notes) values
  ('pricing', 'account_discount_percent', 'Remise création de compte', '10', 'percent', 'Appliquée uniquement sur tarifs client'),
  ('pricing', 'mad_morning_fcfa', 'MAD matinée', '50000', 'fcfa', null),
  ('pricing', 'mad_included_km', 'Km inclus MAD', '100', 'km', null),
  ('dispatch', 'conflict_buffer_minutes', 'Buffer conflit véhicules', '90', 'minutes', 'Fenêtre anti double-assignation'),
  ('contact', 'whatsapp_booking_message', 'Message WhatsApp réservation', '"Bonjour SentraJet, je souhaite suivre ma réservation."', 'text', null)
on conflict (category, rule_key) do update
  set label = excluded.label,
      value_json = excluded.value_json,
      unit = excluded.unit,
      notes = excluded.notes,
      updated_at = now();

alter table public.bookings
  add column if not exists account_discount_percent numeric default 0,
  add column if not exists source text default 'web',
  add column if not exists abandoned_at timestamptz;
