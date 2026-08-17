-- Espace Chauffeur — Phase 3 du blueprint UX multi-rôles.
-- Le chauffeur ne pouvait ni se déclarer disponible (aucune policy self-update sur `drivers`)
-- ni exécuter sa mission (aucune policy UPDATE sur `bookings` pour le rôle driver).
-- Ces deux RPC restent volontairement restreintes aux transitions valides d'une mission
-- affectée par le dispatch — le chauffeur ne peut ni choisir ni inventer un statut.

create policy "drivers_update_self" on public.drivers
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.update_own_mission_status(p_booking_id uuid, p_new_status text)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid;
  v_vehicle_id uuid;
  v_current text;
  v_booking public.bookings;
  v_allowed boolean := false;
begin
  select d.id, da.vehicle_id, b.status
  into v_driver_id, v_vehicle_id, v_current
  from public.bookings b
  join public.service_orders so on so.booking_id = b.id
  join public.dispatch_assignments da on da.service_order_id = so.id
  join public.drivers d on d.id = da.driver_id
  where b.id = p_booking_id and d.user_id = auth.uid()
  order by da.assigned_at desc
  limit 1;

  if v_driver_id is null then
    raise exception 'not_authorized';
  end if;

  v_allowed :=
    (v_current = 'chauffeur_assigne' and p_new_status = 'chauffeur_en_route')
    or (v_current = 'chauffeur_en_route' and p_new_status = 'chauffeur_arrive')
    or (v_current = 'chauffeur_arrive' and p_new_status = 'client_pris_en_charge')
    or (v_current = 'client_pris_en_charge' and p_new_status = 'en_cours')
    or (v_current = 'en_cours' and p_new_status = 'terminee');

  if not v_allowed then
    raise exception 'invalid_transition';
  end if;

  update public.bookings
  set status = p_new_status, updated_at = now()
  where id = p_booking_id
  returning * into v_booking;

  insert into public.booking_status_history (booking_id, from_status, to_status, note)
  values (p_booking_id, v_current, p_new_status, 'Mise à jour par le chauffeur');

  if p_new_status = 'terminee' then
    update public.drivers set status = 'available' where id = v_driver_id;
    if v_vehicle_id is not null then
      update public.vehicles set status = 'available' where id = v_vehicle_id;
    end if;
  end if;

  return v_booking;
end;
$$;

revoke all on function public.update_own_mission_status(uuid, text) from public, anon, authenticated;
grant execute on function public.update_own_mission_status(uuid, text) to authenticated;

create or replace function public.report_mission_issue(p_booking_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid;
  v_current text;
  v_pickup text;
  v_dropoff text;
begin
  select d.id, b.status, b.pickup, b.dropoff
  into v_driver_id, v_current, v_pickup, v_dropoff
  from public.bookings b
  join public.service_orders so on so.booking_id = b.id
  join public.dispatch_assignments da on da.service_order_id = so.id
  join public.drivers d on d.id = da.driver_id
  where b.id = p_booking_id and d.user_id = auth.uid()
  order by da.assigned_at desc
  limit 1;

  if v_driver_id is null then
    raise exception 'not_authorized';
  end if;

  insert into public.booking_status_history (booking_id, from_status, to_status, note)
  values (p_booking_id, v_current, v_current, 'Signalement chauffeur : ' || p_message);

  insert into public.notifications (user_id, channel, recipient, subject, body, status, entity_type, entity_id)
  select ur.user_id, 'in_app', ur.user_id::text, 'Incident signalé par un chauffeur',
         coalesce(v_pickup, '') || ' → ' || coalesce(v_dropoff, '') || ' · ' || p_message,
         'sent', 'booking', p_booking_id::text
  from public.user_roles ur
  where ur.role in ('super_admin', 'manager', 'ops');
end;
$$;

revoke all on function public.report_mission_issue(uuid, text) from public, anon, authenticated;
grant execute on function public.report_mission_issue(uuid, text) to authenticated;
