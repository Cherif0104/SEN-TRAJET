create table if not exists public.wave_webhook_events (
  event_id text primary key,
  event_type text not null,
  client_reference text,
  payment_status text,
  transaction_id text,
  payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  attempts integer not null default 1 check (attempts > 0),
  result jsonb not null default '{}'::jsonb,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists wave_webhook_events_status_idx
  on public.wave_webhook_events(processing_status, received_at desc);

alter table public.wave_webhook_events enable row level security;
revoke all on table public.wave_webhook_events from public, anon, authenticated;
grant select, insert, update on table public.wave_webhook_events to service_role;
