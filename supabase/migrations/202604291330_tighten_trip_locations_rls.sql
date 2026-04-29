-- Tighten RLS for live trip locations: restrict read/write to trip participants.

begin;

-- 1) Read: only authenticated trip participants (client/driver) with an active booking.
drop policy if exists "Read trip_locations for trip participants" on public.trip_locations;
create policy "Read trip_locations for trip participants"
  on public.trip_locations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.trip_id = trip_locations.trip_id
        and (b.client_id = auth.uid() or b.driver_id = auth.uid())
        and b.status in ('pending','confirmed','in_progress')
    )
  );

-- 2) Client insert: only authenticated client who has a booking on the trip.
drop policy if exists "Insert trip_locations for clients" on public.trip_locations;
create policy "Insert trip_locations for clients"
  on public.trip_locations
  for insert
  to authenticated
  with check (
    role = 'client'
    and exists (
      select 1
      from public.bookings b
      where b.trip_id = trip_locations.trip_id
        and b.client_id = auth.uid()
        and b.status in ('pending','confirmed','in_progress')
    )
  );

commit;

notify pgrst, 'reload schema';
