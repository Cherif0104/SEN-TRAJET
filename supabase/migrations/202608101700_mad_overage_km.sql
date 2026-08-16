insert into public.sentrajet_tariffs (segment, rule_key, label, amount_fcfa, unit) values
  ('client', 'mad_overage_km', 'MAD hors forfait / km', 700, 'per_km'),
  ('partner', 'mad_overage_km', 'MAD hors forfait / km', 700, 'per_km')
on conflict (segment, rule_key) do update
  set label = excluded.label,
      amount_fcfa = excluded.amount_fcfa,
      unit = excluded.unit,
      is_active = true;
