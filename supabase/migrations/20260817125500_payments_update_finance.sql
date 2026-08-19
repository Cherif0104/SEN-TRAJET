-- Espace Finance (Phase 7) : aucune policy UPDATE n'existait sur `payments`, ce qui rendait
-- la réconciliation d'un paiement (marquer "payé") impossible pour quiconque via le client,
-- y compris le staff. Restreint aux rôles qui gèrent réellement les paiements.

create policy "payments_update_finance" on public.payments
for update to authenticated
using (has_any_role(array['super_admin', 'manager', 'finance', 'ops']::app_role[]))
with check (has_any_role(array['super_admin', 'manager', 'finance', 'ops']::app_role[]));
