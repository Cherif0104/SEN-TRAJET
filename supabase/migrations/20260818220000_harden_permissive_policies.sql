-- Durcissement des policies RLS historiquement permissives, identifiées dans le diagnostic
-- initial : elles ciblaient `authenticated` avec `USING (true)` — c'est-à-dire que N'IMPORTE
-- QUEL utilisateur connecté (y compris un simple client) pouvait lire/modifier/supprimer des
-- lignes de dispatch, d'ordres de service, de règles tarifaires et d'historique de statut.
--
-- Le chemin principal de création de réservation (RPC `submit_booking_demande`, SECURITY
-- DEFINER) n'est pas affecté : il contourne déjà la RLS. Seul le chemin de secours (dernier
-- recours si l'API et la RPC échouent toutes les deux) insère directement dans
-- `service_orders` / `booking_status_history` en tant qu'utilisateur courant — un remplacement
-- INSERT-only, aussi permissif que l'existant pour `anon`, est donc conservé pour ce cas.

-- ============================================================
-- service_orders — INSERT conservé (secours création réservation), tout le reste retiré
-- ============================================================
drop policy if exists "service_orders_all_authenticated" on public.service_orders;

create policy "service_orders_insert_authenticated" on public.service_orders
for insert to authenticated
with check (true);

-- ============================================================
-- dispatch_assignments — aucun utilisateur non-staff n'a de besoin légitime d'écrire ici ;
-- dispatch_write_ops (super_admin/manager/ops) couvre déjà tous les usages réels.
-- ============================================================
drop policy if exists "dispatch_assignments_all_authenticated" on public.dispatch_assignments;

-- ============================================================
-- business_rules — écriture réservée au staff qui pilote réellement tarifs/règles/config.
-- La lecture publique des règles actives (business_rules_select) n'est pas touchée.
-- ============================================================
drop policy if exists "business_rules_write_staff" on public.business_rules;

create policy "business_rules_write_staff_scoped" on public.business_rules
for all to authenticated
using (has_any_role(array['super_admin', 'manager', 'finance', 'ops']::app_role[]))
with check (has_any_role(array['super_admin', 'manager', 'finance', 'ops']::app_role[]));

-- ============================================================
-- booking_status_history — historique en lecture scoped (staff, client propriétaire, chauffeur
-- affecté) ; écriture INSERT conservée pour authenticated (miroir du comportement anon déjà en
-- place), mais plus aucun UPDATE/DELETE via le client : l'historique redevient immuable.
-- ============================================================
drop policy if exists "booking_status_history_all" on public.booking_status_history;

create policy "booking_status_history_insert_authenticated" on public.booking_status_history
for insert to authenticated
with check (true);

create policy "booking_status_history_read" on public.booking_status_history
for select to authenticated
using (
  has_any_role(array['super_admin', 'manager', 'commercial', 'ops', 'finance']::app_role[])
  or exists (
    select 1 from public.bookings b
    join public.clients c on c.id = b.client_id
    where b.id = booking_status_history.booking_id and c.user_id = auth.uid()
  )
  or exists (
    select 1 from public.bookings b
    join public.service_orders so on so.booking_id = b.id
    join public.dispatch_assignments da on da.service_order_id = so.id
    join public.drivers d on d.id = da.driver_id
    where b.id = booking_status_history.booking_id and d.user_id = auth.uid()
  )
);
