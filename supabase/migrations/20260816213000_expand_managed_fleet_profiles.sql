-- Dossiers opérationnels modifiables par les rôles internes déjà autorisés par RLS.
alter table public.drivers
  add column if not exists email text,
  add column if not exists photo_url text,
  add column if not exists license_number text,
  add column if not exists license_photo_url text,
  add column if not exists license_expiry_date date,
  add column if not exists address text,
  add column if not exists emergency_contact text,
  add column if not exists notes text;

alter table public.vehicles
  add column if not exists driver_id uuid references public.drivers(id) on delete set null,
  add column if not exists year integer,
  add column if not exists color text,
  add column if not exists photo_url text,
  add column if not exists photo_urls jsonb not null default '[]'::jsonb,
  add column if not exists is_verified boolean not null default false,
  add column if not exists notes text;

alter table public.clients
  add column if not exists avatar_url text,
  add column if not exists notes text;

alter table public.partner_organizations
  add column if not exists logo_url text;

create index if not exists vehicles_driver_id_idx on public.vehicles(driver_id);
