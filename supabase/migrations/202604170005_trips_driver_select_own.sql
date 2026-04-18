-- Permettre au chauffeur de lister ses propres trajets (tous statuts) pour l’écran « Mes trajets ».
-- Sans cette politique, seuls les trajets `active` sont visibles via la politique publique.

drop policy if exists "Drivers can read own trips" on public.trips;
create policy "Drivers can read own trips"
on public.trips
for select
to authenticated
using (driver_id = auth.uid());
