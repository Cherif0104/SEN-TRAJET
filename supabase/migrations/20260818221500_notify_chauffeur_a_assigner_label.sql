-- Le webhook Wave (confirmation automatique de paiement) fait avancer une réservation vers
-- le statut chauffeur_a_assigner. Ce statut n'avait pas de libellé dédié dans le trigger de
-- notification et retombait sur un message générique — on le rattache explicitement au message
-- "Paiement confirmé" qui correspond à l'évènement métier réel.

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
    when 'chauffeur_a_assigner' then 'Paiement confirmé'
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
