-- Partenaires : gestionnaires de flotte / chauffeurs, commissions sur crédits et trajets

-- Rôle partenaire (ajout à l'enum user_role si présent)
do $$
begin
  alter type public.user_role add value 'partner';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- Table partenaires (un partenaire = un compte user avec role partner)
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  company_name text not null,
  contact_name text,
  phone text,
  email text,
  invite_code text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_partners_user_id on public.partners(user_id);
create index if not exists idx_partners_invite_code on public.partners(invite_code);

-- Lien chauffeur -> partenaire (profiles peut avoir partner_id)
alter table public.profiles
  add column if not exists partner_id uuid references public.partners(id) on delete set null;

create index if not exists idx_profiles_partner_id on public.profiles(partner_id);

-- Type de commission
do $$
begin
  create type public.commission_type as enum ('credit_purchase', 'trip_completed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.commission_status as enum ('pending', 'paid');
exception
  when duplicate_object then null;
end $$;

-- Commissions attribuées aux partenaires
create table if not exists public.partner_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  type public.commission_type not null,
  amount_fcfa integer not null check (amount_fcfa >= 0),
  reference text,
  status public.commission_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_partner_commissions_partner on public.partner_commissions(partner_id);
create index if not exists idx_partner_commissions_driver on public.partner_commissions(driver_id);
create index if not exists idx_partner_commissions_created on public.partner_commissions(created_at desc);

alter table public.partner_commissions enable row level security;
alter table public.partners enable row level security;

-- RLS partners : lecture/écriture par le propriétaire (user_id = auth.uid())
drop policy if exists "partners_select_own" on public.partners;
create policy "partners_select_own" on public.partners for select using (user_id = auth.uid());

drop policy if exists "partners_insert_own" on public.partners;
create policy "partners_insert_own" on public.partners for insert with check (user_id = auth.uid());

drop policy if exists "partners_update_own" on public.partners;
create policy "partners_update_own" on public.partners for update using (user_id = auth.uid());

-- RLS partner_commissions : lecture par le partenaire concerné
drop policy if exists "partner_commissions_select_own" on public.partner_commissions;
create policy "partner_commissions_select_own"
  on public.partner_commissions for select
  using (
    exists (select 1 from public.partners p where p.id = partner_commissions.partner_id and p.user_id = auth.uid())
  );

comment on table public.partners is 'Partenaires (gestionnaires de flotte) qui recrutent des chauffeurs et perçoivent des commissions';
comment on table public.partner_commissions is 'Commissions attribuées aux partenaires (sur achat de crédits ou trajet réalisé)';
