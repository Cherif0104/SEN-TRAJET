-- Archivage doux des clients CRM, sur le même modèle que les chauffeurs (status inactive) :
-- une suppression définitive casse l'historique (réservations, factures, avis) référencé par
-- clients.id, donc on privilégie l'archivage (masqué des listes actives, rien n'est perdu).
alter table public.clients
  add column if not exists is_active boolean not null default true;

comment on column public.clients.is_active is
  'Archivage doux : false = client archivé (masqué des listes actives, historique conservé).';

create index if not exists idx_clients_is_active on public.clients (is_active);
