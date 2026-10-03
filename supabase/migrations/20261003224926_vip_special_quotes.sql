create table if not exists public.vip_quote_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'SJ-DEVIS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  requester_profile_id uuid not null references public.profiles(id) on delete restrict,
  client_id uuid references public.clients(id) on delete set null,
  requester_type text not null default 'particulier'
    check (requester_type in ('particulier', 'conciergerie', 'hotel', 'entreprise', 'evenement')),
  organization_name text,
  contact_phone text not null,
  pickup_location text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  passengers integer not null check (passengers between 1 and 5000),
  vehicle_preference text not null default 'optimal'
    check (vehicle_preference in ('optimal', 'minivans', 'bus', 'mixte')),
  event_type text,
  fleet_recommendation jsonb not null default '{}'::jsonb,
  notes text,
  status text not null default 'nouvelle'
    check (status in ('nouvelle', 'en_etude', 'devis_envoye', 'acceptee', 'refusee', 'expiree')),
  quoted_amount_fcfa integer check (quoted_amount_fcfa is null or quoted_amount_fcfa >= 0),
  quoted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vip_quote_dates_check check (ends_at > starts_at)
);

create index if not exists idx_vip_quote_requests_requester_created
  on public.vip_quote_requests(requester_profile_id, created_at desc);
create index if not exists idx_vip_quote_requests_status_created
  on public.vip_quote_requests(status, created_at desc);
create index if not exists idx_vip_quote_requests_client
  on public.vip_quote_requests(client_id)
  where client_id is not null;

drop trigger if exists trg_touch_vip_quote_request on public.vip_quote_requests;
create trigger trg_touch_vip_quote_request
before update on public.vip_quote_requests
for each row execute function public.touch_rental_updated_at();

alter table public.vip_quote_requests enable row level security;

drop policy if exists vip_quote_requester_read on public.vip_quote_requests;
create policy vip_quote_requester_read
on public.vip_quote_requests for select
to authenticated
using (
  requester_profile_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('super_admin', 'manager', 'ops', 'commercial', 'finance')
  )
);

drop policy if exists vip_quote_staff_manage on public.vip_quote_requests;
create policy vip_quote_staff_manage
on public.vip_quote_requests for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('super_admin', 'manager', 'ops', 'commercial', 'finance')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('super_admin', 'manager', 'ops', 'commercial', 'finance')
  )
);
