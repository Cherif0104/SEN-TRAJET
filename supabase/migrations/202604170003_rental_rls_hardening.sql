-- Durcissement RLS Location V1 (tables rental_*)

alter table if exists public.rental_listings enable row level security;
alter table if exists public.rental_vehicle_documents enable row level security;
alter table if exists public.rental_bookings enable row level security;
alter table if exists public.rental_handover_events enable row level security;

drop policy if exists "rental_listings_select" on public.rental_listings;
create policy "rental_listings_select"
on public.rental_listings
for select
to anon, authenticated
using (
  status = 'active'
  or owner_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'partner'
      and p.partner_id is not null
      and p.partner_id = public.rental_listings.partner_id
  )
);

drop policy if exists "rental_listings_insert" on public.rental_listings;
create policy "rental_listings_insert"
on public.rental_listings
for insert
to authenticated
with check (
  owner_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'partner'
      and p.partner_id is not null
      and p.partner_id = public.rental_listings.partner_id
  )
);

drop policy if exists "rental_listings_update" on public.rental_listings;
create policy "rental_listings_update"
on public.rental_listings
for update
to authenticated
using (
  owner_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'partner'
      and p.partner_id is not null
      and p.partner_id = public.rental_listings.partner_id
  )
)
with check (
  owner_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'partner'
      and p.partner_id is not null
      and p.partner_id = public.rental_listings.partner_id
  )
);

drop policy if exists "rental_vehicle_documents_select" on public.rental_vehicle_documents;
create policy "rental_vehicle_documents_select"
on public.rental_vehicle_documents
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.rental_listings rl
    where rl.id = public.rental_vehicle_documents.listing_id
      and (
        rl.status = 'active'
        or rl.owner_profile_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'partner'
            and p.partner_id is not null
            and p.partner_id = rl.partner_id
        )
      )
  )
);

drop policy if exists "rental_vehicle_documents_manage" on public.rental_vehicle_documents;
create policy "rental_vehicle_documents_manage"
on public.rental_vehicle_documents
for all
to authenticated
using (
  exists (
    select 1
    from public.rental_listings rl
    where rl.id = public.rental_vehicle_documents.listing_id
      and (
        rl.owner_profile_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'partner'
            and p.partner_id is not null
            and p.partner_id = rl.partner_id
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.rental_listings rl
    where rl.id = public.rental_vehicle_documents.listing_id
      and (
        rl.owner_profile_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'partner'
            and p.partner_id is not null
            and p.partner_id = rl.partner_id
        )
      )
  )
);

drop policy if exists "rental_bookings_select" on public.rental_bookings;
create policy "rental_bookings_select"
on public.rental_bookings
for select
to authenticated
using (
  client_id = auth.uid()
  or owner_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'partner'
      and p.partner_id is not null
      and p.partner_id = public.rental_bookings.partner_id
  )
);

drop policy if exists "rental_bookings_insert" on public.rental_bookings;
create policy "rental_bookings_insert"
on public.rental_bookings
for insert
to authenticated
with check (
  client_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'partner'
      and p.partner_id is not null
      and p.partner_id = public.rental_bookings.partner_id
  )
);

drop policy if exists "rental_bookings_update" on public.rental_bookings;
create policy "rental_bookings_update"
on public.rental_bookings
for update
to authenticated
using (
  client_id = auth.uid()
  or owner_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'partner'
      and p.partner_id is not null
      and p.partner_id = public.rental_bookings.partner_id
  )
)
with check (
  client_id = auth.uid()
  or owner_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'partner'
      and p.partner_id is not null
      and p.partner_id = public.rental_bookings.partner_id
  )
);

drop policy if exists "rental_handover_select" on public.rental_handover_events;
create policy "rental_handover_select"
on public.rental_handover_events
for select
to authenticated
using (
  exists (
    select 1
    from public.rental_bookings rb
    where rb.id = public.rental_handover_events.rental_booking_id
      and (
        rb.client_id = auth.uid()
        or rb.owner_profile_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'partner'
            and p.partner_id is not null
            and p.partner_id = rb.partner_id
        )
      )
  )
);

drop policy if exists "rental_handover_insert" on public.rental_handover_events;
create policy "rental_handover_insert"
on public.rental_handover_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.rental_bookings rb
    where rb.id = public.rental_handover_events.rental_booking_id
      and (
        rb.owner_profile_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'partner'
            and p.partner_id is not null
            and p.partner_id = rb.partner_id
        )
      )
  )
);
