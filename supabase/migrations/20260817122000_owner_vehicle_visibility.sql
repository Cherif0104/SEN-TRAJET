-- Espace Partenaire / Financeur — Phase 4 du blueprint UX multi-rôles.
-- Le propriétaire de véhicule (asset_partner) ne pouvait rien voir au-delà de son propre
-- dossier et de son contrat : ni entretien, ni documents, ni écritures financières, ni
-- utilisation réelle de son véhicule. Ces lectures restent strictement scoped à sa propre
-- ressource (jamais à la flotte globale ni aux autres propriétaires).

-- Fonction utilitaire : la réservation a-t-elle été exécutée par un véhicule que je possède ?
-- SECURITY DEFINER nécessaire car le propriétaire n'a pas de droit de lecture direct sur
-- service_orders / dispatch_assignments (réservés au staff et au chauffeur assigné).
create or replace function public.owns_vehicle_for_booking(_booking_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.service_orders so
    join public.dispatch_assignments da on da.service_order_id = so.id
    join public.vehicle_exploitation_contracts vec on vec.vehicle_id = da.vehicle_id
    join public.vehicle_owners vo on vo.id = vec.owner_id
    where so.booking_id = _booking_id and vo.user_id = auth.uid()
  );
$$;

revoke all on function public.owns_vehicle_for_booking(uuid) from public, anon;
grant execute on function public.owns_vehicle_for_booking(uuid) to authenticated;

create policy "bookings_read_owner_vehicle" on public.bookings
for select to authenticated
using (public.owns_vehicle_for_booking(bookings.id));

create policy "vehicle_maintenance_read_owner" on public.vehicle_maintenance_records
for select to authenticated
using (
  exists (
    select 1 from public.vehicle_exploitation_contracts vec
    join public.vehicle_owners vo on vo.id = vec.owner_id
    where vec.vehicle_id = vehicle_maintenance_records.vehicle_id
      and vo.user_id = auth.uid()
  )
);

create policy "entity_financial_records_read_owner" on public.entity_financial_records
for select to authenticated
using (
  (entity_type = 'asset_partner' and exists (
    select 1 from public.vehicle_owners vo
    where vo.id = entity_financial_records.entity_id and vo.user_id = auth.uid()
  ))
  or (entity_type = 'vehicle' and exists (
    select 1 from public.vehicle_exploitation_contracts vec
    join public.vehicle_owners vo on vo.id = vec.owner_id
    where vec.vehicle_id = entity_financial_records.entity_id and vo.user_id = auth.uid()
  ))
);

create policy "entity_documents_read_owner" on public.entity_documents
for select to authenticated
using (
  (entity_type = 'asset_partner' and exists (
    select 1 from public.vehicle_owners vo
    where vo.id = entity_documents.entity_id and vo.user_id = auth.uid()
  ))
  or (entity_type = 'vehicle' and exists (
    select 1 from public.vehicle_exploitation_contracts vec
    join public.vehicle_owners vo on vo.id = vec.owner_id
    where vec.vehicle_id = entity_documents.entity_id and vo.user_id = auth.uid()
  ))
);

-- Téléchargement des documents (URL signée) : n'autorise que les objets référencés par une
-- ligne entity_documents que le propriétaire peut déjà lire via la policy ci-dessus.
create policy "entity_documents_owner_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'entity-documents'
  and exists (
    select 1 from public.entity_documents ed where ed.storage_path = storage.objects.name
  )
);
