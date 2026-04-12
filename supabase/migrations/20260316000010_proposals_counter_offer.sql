-- Contre-offre client : négociation sur 3 tours max
alter table public.proposals
  add column if not exists negotiation_round integer not null default 1,
  add column if not exists counter_price_fcfa integer,
  add column if not exists counter_message text;

do $$
begin
  alter table public.proposals
    add constraint proposals_negotiation_round_check
    check (negotiation_round >= 1 and negotiation_round <= 3);
exception
  when duplicate_object then null;
end $$;

comment on column public.proposals.negotiation_round is '1=proposition chauffeur, 2=client a contre-offert, 3=chauffeur a répondu';
comment on column public.proposals.counter_price_fcfa is 'Prix proposé par le client (contre-offre)';
comment on column public.proposals.counter_message is 'Message optionnel du client avec la contre-offre';
