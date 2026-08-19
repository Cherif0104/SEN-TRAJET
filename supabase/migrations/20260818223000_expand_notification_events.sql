-- Étend les évènements de notification réels (diagnostic initial : seuls réservation et
-- incident chauffeur étaient branchés). Ajoute : nouveau prestataire, nouveau partenaire
-- capital/actif, entretien planifié, et échéances documentaires/permis (via pg_cron, car il
-- s'agit d'une condition temporelle et non d'un évènement d'écriture).

-- ============================================================
-- Nouveau prestataire commercial (partner_organizations)
-- ============================================================
create or replace function public.notify_partner_organization_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, channel, recipient, subject, body, status, entity_type, entity_id)
  select ur.user_id, 'in_app', ur.user_id::text, 'Nouveau prestataire',
         coalesce(new.legal_name, 'Prestataire') || ' · ' || coalesce(new.category, 'catégorie non renseignée'),
         'sent', 'partner_organization', new.id::text
  from public.user_roles ur
  where ur.role in ('super_admin', 'manager', 'commercial');
  return new;
end;
$$;

revoke all on function public.notify_partner_organization_event() from public, anon, authenticated;

drop trigger if exists trg_notify_partner_organization on public.partner_organizations;
create trigger trg_notify_partner_organization
after insert on public.partner_organizations
for each row execute function public.notify_partner_organization_event();

-- ============================================================
-- Nouveau partenaire capital / actif (vehicle_owners)
-- ============================================================
create or replace function public.notify_vehicle_owner_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, channel, recipient, subject, body, status, entity_type, entity_id)
  select ur.user_id, 'in_app', ur.user_id::text, 'Nouveau partenaire capital / actif',
         coalesce(new.full_name, new.company_name, 'Partenaire') || ' · ' || coalesce(new.partner_kind, 'type non renseigné'),
         'sent', 'vehicle_owner', new.id::text
  from public.user_roles ur
  where ur.role in ('super_admin', 'manager', 'finance', 'fleet_manager');
  return new;
end;
$$;

revoke all on function public.notify_vehicle_owner_event() from public, anon, authenticated;

drop trigger if exists trg_notify_vehicle_owner on public.vehicle_owners;
create trigger trg_notify_vehicle_owner
after insert on public.vehicle_owners
for each row execute function public.notify_vehicle_owner_event();

-- ============================================================
-- Entretien planifié (vehicle_maintenance_records)
-- ============================================================
create or replace function public.notify_maintenance_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicle_label text;
begin
  select coalesce(v.brand, '') || ' ' || coalesce(v.model, '') || ' · ' || coalesce(v.plate_number, '')
  into v_vehicle_label
  from public.vehicles v where v.id = new.vehicle_id;

  insert into public.notifications (user_id, channel, recipient, subject, body, status, entity_type, entity_id)
  select ur.user_id, 'in_app', ur.user_id::text, 'Entretien planifié',
         coalesce(new.title, new.maintenance_type) || ' — ' || coalesce(v_vehicle_label, 'Véhicule'),
         'sent', 'vehicle', new.vehicle_id::text
  from public.user_roles ur
  where ur.role in ('super_admin', 'manager', 'ops', 'fleet_manager');
  return new;
end;
$$;

revoke all on function public.notify_maintenance_event() from public, anon, authenticated;

drop trigger if exists trg_notify_maintenance on public.vehicle_maintenance_records;
create trigger trg_notify_maintenance
after insert on public.vehicle_maintenance_records
for each row execute function public.notify_maintenance_event();

-- ============================================================
-- Échéances documentaires (entity_documents) et permis (drivers.license_expiry_date) —
-- condition temporelle : un job planifié quotidien, pas un trigger d'écriture.
-- ============================================================
create extension if not exists pg_cron;

create or replace function public.notify_expiring_documents()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Documents véhicules expirant sous 7 jours (une seule notification par document et par jour).
  insert into public.notifications (user_id, channel, recipient, subject, body, status, entity_type, entity_id)
  select ur.user_id, 'in_app', ur.user_id::text, 'Document à renouveler',
         ed.name || ' expire le ' || to_char(ed.expires_at, 'DD/MM/YYYY'),
         'sent', ed.entity_type, ed.entity_id::text
  from public.entity_documents ed
  cross join public.user_roles ur
  where ed.expires_at is not null
    and ed.expires_at between now() and now() + interval '7 days'
    and ur.role in ('super_admin', 'manager', 'fleet_manager', 'rh')
    and not exists (
      select 1 from public.notifications n
      where n.entity_id = ed.entity_id::text
        and n.subject = 'Document à renouveler'
        and n.created_at::date = current_date
        and n.user_id = ur.user_id
    );

  -- Permis chauffeur expirant sous 7 jours.
  insert into public.notifications (user_id, channel, recipient, subject, body, status, entity_type, entity_id)
  select ur.user_id, 'in_app', ur.user_id::text, 'Permis à renouveler',
         d.full_name || ' — permis expirant le ' || to_char(d.license_expiry_date, 'DD/MM/YYYY'),
         'sent', 'driver', d.id::text
  from public.drivers d
  cross join public.user_roles ur
  where d.license_expiry_date is not null
    and d.license_expiry_date between current_date and current_date + interval '7 days'
    and ur.role in ('super_admin', 'manager', 'rh')
    and not exists (
      select 1 from public.notifications n
      where n.entity_id = d.id::text
        and n.subject = 'Permis à renouveler'
        and n.created_at::date = current_date
        and n.user_id = ur.user_id
    );
end;
$$;

revoke all on function public.notify_expiring_documents() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('notify-expiring-documents-daily');
exception when others then
  null;
end $$;

select cron.schedule(
  'notify-expiring-documents-daily',
  '0 7 * * *',
  $$select public.notify_expiring_documents();$$
);
