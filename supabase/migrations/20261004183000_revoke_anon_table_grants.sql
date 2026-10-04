-- Lot 1 : défense en profondeur après drop des policies anon.
-- Les GRANTs table-level laissaient encore INSERT/UPDATE/DELETE à anon
-- même sans policy RLS (défense fragile si une policy trop large revient).

revoke all on table public.service_orders from anon;
revoke all on table public.booking_status_history from anon;
revoke all on table public.payments from anon;

-- Authenticated n'écrit pas l'historique de statut directement.
revoke insert, update, delete, truncate on table public.booking_status_history from authenticated;
grant select on table public.booking_status_history to authenticated;

-- Fonctions staff-only : plus d'exposition large via l'API PostgREST.
revoke all on function public.list_crm_staff() from public, anon;
-- crmOps l'appelle côté client authentifié ; on conserve authenticated
-- (la fonction filtre déjà côté SQL) mais on retire public/anon.
grant execute on function public.list_crm_staff() to authenticated, service_role;

revoke all on function public.write_audit_log(text, text, text, jsonb)
  from public, anon;
grant execute on function public.write_audit_log(text, text, text, jsonb)
  to authenticated, service_role;

revoke all on function public.verify_allo_dakar_vehicle(uuid, boolean, text)
  from public, anon;
grant execute on function public.verify_allo_dakar_vehicle(uuid, boolean, text)
  to authenticated, service_role;
