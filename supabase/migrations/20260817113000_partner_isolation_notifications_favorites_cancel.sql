-- Correctifs "non verts" issus du diagnostic SentraJet Premium — Phase Client + Phase Prestataire
-- 1. Isolation des données prestataire (bookings + factures)
-- 2. Notifications compatibles avec le schéma live + évènements réservation
-- 3. Carnet clients du prestataire (clients.referred_by_partner_contract_id)
-- 4. Adresses favorites client
-- 5. Annulation client sécurisée côté serveur (frais calculés depuis business_rules)

-- ============================================================
-- 1. Isolation des données prestataire
-- ============================================================

create policy "bookings_read_partner_own" on public.bookings
for select to authenticated
using (
  exists (
    select 1 from public.partner_contracts pc
    where pc.id = bookings.partner_contract_id
      and pc.partner_user_id = auth.uid()
  )
);

create policy "invoices_read_partner" on public.invoices
for select to authenticated
using (
  exists (
    select 1 from public.bookings b
    join public.partner_contracts pc on pc.id = b.partner_contract_id
    where b.id = invoices.booking_id
      and pc.partner_user_id = auth.uid()
  )
);

-- ============================================================
-- 2. Notifications — colonnes de lecture + évènements réservation
-- ============================================================

alter table public.notifications add column if not exists read_at timestamptz;

create policy "notifications_own_mark_read" on public.notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.notify_booking_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_user uuid;
  v_label text;
  v_body text;
begin
  select c.user_id into v_client_user
  from public.clients c
  where c.id = coalesce(new.client_id, old.client_id);

  v_label := case coalesce(new.status, '')
    when 'demande_recue' then 'Demande reçue'
    when 'devis_envoye' then 'Devis envoyé'
    when 'devis_accepte' then 'Devis accepté'
    when 'devis_refuse' then 'Devis refusé'
    when 'en_attente_de_paiement' then 'En attente de paiement'
    when 'payee' then 'Paiement confirmé'
    when 'confirmee' then 'Réservation confirmée'
    when 'chauffeur_assigne' then 'Chauffeur assigné'
    when 'chauffeur_en_route' then 'Chauffeur en route'
    when 'chauffeur_arrive' then 'Chauffeur arrivé'
    when 'client_pris_en_charge' then 'Prise en charge en cours'
    when 'en_cours' then 'Course en cours'
    when 'terminee' then 'Course terminée'
    when 'annulee_client' then 'Réservation annulée'
    when 'annulee_sentrajet' then 'Réservation annulée par SentraJet'
    when 'no_show' then 'Absence signalée'
    when 'incident' then 'Incident signalé'
    when 'remboursement_en_cours' then 'Remboursement en cours'
    when 'remboursee' then 'Remboursement effectué'
    else 'Mise à jour de votre réservation'
  end;

  v_body := coalesce(new.pickup, '') || ' → ' || coalesce(new.dropoff, '') || ' · ' ||
            to_char(new.pickup_time, 'DD/MM/YYYY HH24:MI');

  if v_client_user is not null then
    insert into public.notifications (user_id, channel, recipient, subject, body, status, entity_type, entity_id)
    values (v_client_user, 'in_app', v_client_user::text, v_label, v_body, 'sent', 'booking', new.id::text);
  end if;

  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, channel, recipient, subject, body, status, entity_type, entity_id)
    select ur.user_id, 'in_app', ur.user_id::text, 'Nouvelle demande reçue', v_body, 'sent', 'booking', new.id::text
    from public.user_roles ur
    where ur.role in ('super_admin', 'manager', 'commercial', 'ops');
  end if;

  return new;
end;
$$;

revoke all on function public.notify_booking_event() from public;

drop trigger if exists trg_notify_booking_event on public.bookings;
create trigger trg_notify_booking_event
after insert or update of status on public.bookings
for each row execute function public.notify_booking_event();

-- ============================================================
-- 3. Carnet clients du prestataire
-- ============================================================

alter table public.clients
  add column if not exists referred_by_partner_contract_id uuid references public.partner_contracts(id);

create index if not exists clients_referred_by_partner_contract_id_idx
  on public.clients (referred_by_partner_contract_id);

create policy "clients_partner_read" on public.clients
for select to authenticated
using (
  referred_by_partner_contract_id is not null
  and exists (
    select 1 from public.partner_contracts pc
    where pc.id = clients.referred_by_partner_contract_id
      and pc.partner_user_id = auth.uid()
  )
);

create policy "clients_partner_insert" on public.clients
for insert to authenticated
with check (
  referred_by_partner_contract_id is not null
  and exists (
    select 1 from public.partner_contracts pc
    where pc.id = clients.referred_by_partner_contract_id
      and pc.partner_user_id = auth.uid()
      and pc.status = 'active'
  )
);

create policy "clients_partner_update" on public.clients
for update to authenticated
using (
  referred_by_partner_contract_id is not null
  and exists (
    select 1 from public.partner_contracts pc
    where pc.id = clients.referred_by_partner_contract_id
      and pc.partner_user_id = auth.uid()
  )
)
with check (
  referred_by_partner_contract_id is not null
  and exists (
    select 1 from public.partner_contracts pc
    where pc.id = clients.referred_by_partner_contract_id
      and pc.partner_user_id = auth.uid()
  )
);

-- Les demandes créées pour un client du carnet doivent pouvoir être lues par le prestataire
create policy "bookings_read_partner_client" on public.bookings
for select to authenticated
using (
  exists (
    select 1 from public.clients c
    join public.partner_contracts pc on pc.id = c.referred_by_partner_contract_id
    where c.id = bookings.client_id
      and pc.partner_user_id = auth.uid()
  )
);

-- ============================================================
-- 4. Adresses favorites client
-- ============================================================

create table if not exists public.client_favorite_addresses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  label text not null,
  address text not null,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

alter table public.client_favorite_addresses enable row level security;

create index if not exists client_favorite_addresses_client_id_idx
  on public.client_favorite_addresses (client_id);

create policy "favorite_addresses_owner_all" on public.client_favorite_addresses
for all to authenticated
using (
  exists (select 1 from public.clients c where c.id = client_favorite_addresses.client_id and c.user_id = auth.uid())
)
with check (
  exists (select 1 from public.clients c where c.id = client_favorite_addresses.client_id and c.user_id = auth.uid())
);

create policy "favorite_addresses_staff_read" on public.client_favorite_addresses
for select to authenticated
using (has_any_role(array['super_admin', 'manager', 'commercial', 'ops']::app_role[]));

-- ============================================================
-- 5. Annulation client sécurisée (frais calculés côté serveur)
-- ============================================================

create or replace function public.cancel_own_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_owner uuid;
  v_old_status text;
  v_hours numeric;
  v_percent numeric;
  v_fee numeric;
  v_final numeric;
  v_over6 numeric;
  v_4to6 numeric;
  v_under2 numeric;
  v_2to4 numeric;
begin
  select b.* into v_booking from public.bookings b where b.id = p_booking_id;

  if v_booking.id is null then
    raise exception 'booking_not_found';
  end if;

  select c.user_id into v_owner from public.clients c where c.id = v_booking.client_id;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'not_authorized';
  end if;

  if v_booking.status in ('annulee_client', 'annulee_sentrajet', 'terminee', 'remboursee', 'remboursement_en_cours', 'no_show') then
    raise exception 'booking_not_cancellable';
  end if;

  v_old_status := v_booking.status;
  v_hours := extract(epoch from (v_booking.pickup_time - now())) / 3600.0;

  select
    coalesce(max(case when rule_key = 'fee_over_6h_percent' then (value_json::text)::numeric end), 0),
    coalesce(max(case when rule_key = 'fee_4h_to_6h_percent' then (value_json::text)::numeric end), 30),
    coalesce(max(case when rule_key = 'fee_under_2h_percent' then (value_json::text)::numeric end), 50),
    max(case when rule_key = 'fee_2h_to_4h_percent' then (value_json::text)::numeric end)
  into v_over6, v_4to6, v_under2, v_2to4
  from public.business_rules
  where category = 'cancellation' and is_active = true;

  if v_hours > 6 then
    v_percent := v_over6;
  elsif v_hours >= 4 then
    v_percent := v_4to6;
  elsif v_hours >= 2 then
    -- Tranche 2h-4h : décision métier ouverte (D-01) -> aucun frais inventé si non paramétrée.
    v_percent := coalesce(v_2to4, 0);
  else
    v_percent := v_under2;
  end if;

  v_fee := round(coalesce(v_booking.estimated_price, 0) * v_percent / 100.0);
  v_final := greatest(0, coalesce(v_booking.estimated_price, 0) - v_fee);

  update public.bookings
  set status = 'annulee_client',
      cancellation_fee_fcfa = v_fee,
      final_amount_fcfa = v_final,
      updated_at = now()
  where id = p_booking_id
  returning * into v_booking;

  insert into public.booking_status_history (booking_id, from_status, to_status, note)
  values (p_booking_id, v_old_status, 'annulee_client', 'Annulation client · frais ' || v_fee || ' FCFA');

  return v_booking;
end;
$$;

revoke all on function public.cancel_own_booking(uuid) from public;
grant execute on function public.cancel_own_booking(uuid) to authenticated;
