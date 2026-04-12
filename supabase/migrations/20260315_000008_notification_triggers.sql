-- SEN TRAJET - Triggers pour notifications automatiques
-- Notifie client/chauffeur sur demande, proposition, acceptation, solde faible

-- 1. Nouvelle demande : confirmation au client
create or replace function public.notify_on_new_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_notification(
    new.client_id,
    'new_request'::public.notif_type,
    'Demande publiée',
    'Votre trajet ' || new.from_city || ' → ' || new.to_city || ' est en ligne.',
    jsonb_build_object('request_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_new_request on public.trip_requests;
create trigger trg_notify_new_request
after insert on public.trip_requests
for each row execute function public.notify_on_new_request();

-- 2. Nouvelle proposition : notifier le client
create or replace function public.notify_on_new_proposal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
begin
  select client_id into v_client_id from public.trip_requests where id = new.request_id;
  if v_client_id is not null then
    perform public.create_notification(
      v_client_id,
      'new_proposal'::public.notif_type,
      'Nouvelle proposition',
      'Un chauffeur a proposé un prix pour votre trajet.',
      jsonb_build_object('request_id', new.request_id, 'proposal_id', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_new_proposal on public.proposals;
create trigger trg_notify_new_proposal
after insert on public.proposals
for each row execute function public.notify_on_new_proposal();

-- 3. Proposition acceptée : notifier le chauffeur
create or replace function public.notify_on_proposal_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from 'accepted' and new.status = 'accepted' then
    perform public.create_notification(
      new.driver_id,
      'proposal_accepted'::public.notif_type,
      'Proposition acceptée',
      'Le client a choisi votre offre.',
      jsonb_build_object('proposal_id', new.id, 'request_id', new.request_id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_proposal_accepted on public.proposals;
create trigger trg_notify_proposal_accepted
after update on public.proposals
for each row execute function public.notify_on_proposal_accepted();

-- 4. Solde faible : alerte chauffeur
create or replace function public.notify_on_credit_low()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.balance_credits <= 5 and (old.balance_credits is null or old.balance_credits > 5) then
    perform public.create_notification(
      new.driver_id,
      'credit_low'::public.notif_type,
      'Solde de crédits faible',
      'Rechargez vos crédits pour continuer à recevoir des demandes.',
      '{}'::jsonb
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_credit_low on public.wallets;
create trigger trg_notify_credit_low
after insert or update on public.wallets
for each row execute function public.notify_on_credit_low();
