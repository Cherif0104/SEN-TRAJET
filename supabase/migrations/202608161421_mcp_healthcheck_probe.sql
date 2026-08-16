-- Probe MCP apply_migration (SEN TRAJET / ootvzknyhkhxroadnclh)
create table if not exists public.mcp_healthcheck (
  id bigint generated always as identity primary key,
  checked_at timestamptz not null default now(),
  note text not null
);

alter table public.mcp_healthcheck enable row level security;

insert into public.mcp_healthcheck (note)
values ('MCP Supabase OK — project ootvzknyhkhxroadnclh — 2026-08-16');
