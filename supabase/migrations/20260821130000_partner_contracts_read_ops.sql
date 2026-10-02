-- La vue calendrier 360° des réservations (Ops) affiche le nom du partenaire quand une réservation
-- est rattachée à un contrat B2B. Le rôle "ops" n'avait pas accès en lecture à partner_contracts
-- (seuls super_admin/manager/commercial/finance l'avaient), ce qui aurait fait disparaître
-- silencieusement cette information pour l'équipe Ops.
drop policy if exists "partner_contracts_read_own_or_internal" on public.partner_contracts;

create policy "partner_contracts_read_own_or_internal" on public.partner_contracts
for select to authenticated
using (
  partner_user_id = auth.uid()
  or has_any_role(array['super_admin', 'manager', 'commercial', 'finance', 'ops']::app_role[])
);
