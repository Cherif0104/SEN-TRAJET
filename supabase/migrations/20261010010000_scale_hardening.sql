-- Remove avoidable per-row auth calls and cover operational foreign keys.

create index if not exists driver_documents_reviewed_by_idx
  on public.driver_documents(reviewed_by);
create index if not exists driver_profiles_reviewed_by_idx
  on public.driver_profiles(reviewed_by);
create index if not exists organizations_created_by_idx
  on public.organizations(created_by);
create index if not exists vehicles_driver_id_idx
  on public.vehicles(driver_id);
create index if not exists ride_events_actor_id_idx
  on public.ride_events(actor_id);
create index if not exists ride_events_ride_request_id_idx
  on public.ride_events(ride_request_id);

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated using (
  id = (select auth.uid()) or private.is_admin()
);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated using (
  id = (select auth.uid()) or private.is_admin()
) with check (
  id = (select auth.uid()) or private.is_admin()
);

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
for select to authenticated using (
  user_id = (select auth.uid()) or private.is_admin()
);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
for update to authenticated using (
  user_id = (select auth.uid())
) with check (
  user_id = (select auth.uid())
);

drop policy if exists service_catalog_public_read on public.service_catalog;
drop policy if exists service_catalog_admin_read on public.service_catalog;
drop policy if exists service_catalog_admin_all on public.service_catalog;
create policy service_catalog_read on public.service_catalog
for select to anon, authenticated using (
  is_active or private.is_admin()
);
create policy service_catalog_admin_insert on public.service_catalog
for insert to authenticated with check (private.is_admin());
create policy service_catalog_admin_update on public.service_catalog
for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy service_catalog_admin_delete on public.service_catalog
for delete to authenticated using (private.is_admin());

drop policy if exists organizations_member_read on public.organizations;
drop policy if exists organizations_admin_all on public.organizations;
create policy organizations_read on public.organizations
for select to authenticated using (
  private.is_organization_member(id)
);
create policy organizations_admin_insert on public.organizations
for insert to authenticated with check (private.is_admin());
create policy organizations_admin_update on public.organizations
for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy organizations_admin_delete on public.organizations
for delete to authenticated using (private.is_admin());

drop policy if exists organization_members_read on public.organization_members;
drop policy if exists organization_members_admin_all on public.organization_members;
create policy organization_members_read on public.organization_members
for select to authenticated using (
  user_id = (select auth.uid())
  or private.is_organization_member(organization_id)
);
create policy organization_members_admin_insert on public.organization_members
for insert to authenticated with check (private.is_admin());
create policy organization_members_admin_update on public.organization_members
for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy organization_members_admin_delete on public.organization_members
for delete to authenticated using (private.is_admin());
