-- Table des messages par réservation (booking)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_booking_created
  on public.messages (booking_id, created_at);

alter table public.messages enable row level security;

-- Lecture : client ou chauffeur du booking
create policy "messages_select_booking_participant"
on public.messages for select
using (
  exists (
    select 1 from public.bookings b
    where b.id = messages.booking_id
    and (b.client_id = auth.uid() or b.driver_id = auth.uid())
  )
);

-- Insertion : client ou chauffeur du booking
create policy "messages_insert_booking_participant"
on public.messages for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.bookings b
    where b.id = messages.booking_id
    and (b.client_id = auth.uid() or b.driver_id = auth.uid())
  )
);

-- Realtime : ajout à la publication Supabase (équivalent Dashboard > Database > Replication)
alter publication supabase_realtime add table public.messages;
