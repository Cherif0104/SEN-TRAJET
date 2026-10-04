-- Durcissement critique: retire les INSERT anonymes/ouverts et restreint
-- certaines fonctions SECURITY DEFINER aux rôles légitimes.

-- ---------------------------------------------------------------------------
-- 1. Historique et ordres de service: plus d'insertion libre
-- ---------------------------------------------------------------------------
drop policy if exists booking_status_history_insert_anon on public.booking_status_history;
drop policy if exists booking_status_history_insert_authenticated on public.booking_status_history;
drop policy if exists service_orders_insert_anon on public.service_orders;
drop policy if exists service_orders_insert_authenticated on public.service_orders;

-- Les écritures restent possibles via RPC SECURITY DEFINER (service_role/postgres)
-- et via les policies staff déjà présentes (service_orders_write_ops, etc.).

-- ---------------------------------------------------------------------------
-- 2. Paiements: plus d'insertion anonyme
-- ---------------------------------------------------------------------------
drop policy if exists payments_insert_anon on public.payments;
drop policy if exists payments_insert_pending on public.payments;

create policy payments_insert_staff
on public.payments
for insert
to authenticated
with check (
  public.has_any_role(
    array['super_admin', 'manager', 'ops', 'finance', 'commercial']::public.app_role[]
  )
);

-- ---------------------------------------------------------------------------
-- 3. submit_booking_demande: plus d'exécution anonyme
-- ---------------------------------------------------------------------------
revoke execute on function public.submit_booking_demande(
  text, text, timestamptz, text, integer, numeric, text, numeric, text, text,
  text, text, integer, integer, boolean, uuid, uuid
) from anon;

-- ---------------------------------------------------------------------------
-- 4. Dispatch et outils internes: service_role uniquement
-- ---------------------------------------------------------------------------
revoke all on function public.auto_dispatch_booking(uuid) from public, anon, authenticated;
grant execute on function public.auto_dispatch_booking(uuid) to service_role;

revoke all on function public.generate_driver_roster(date, integer) from public, anon, authenticated;
grant execute on function public.generate_driver_roster(date, integer) to service_role;

revoke all on function public.verify_allo_dakar_vehicle(uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.verify_allo_dakar_vehicle(uuid, boolean, text)
  to authenticated;
-- La fonction conserve son contrôle interne de rôle staff; on retire juste l'accès PUBLIC.

revoke all on function public.write_audit_log(text, text, text, jsonb)
  from public, anon;
grant execute on function public.write_audit_log(text, text, text, jsonb)
  to authenticated, service_role;
