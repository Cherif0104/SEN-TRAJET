-- Renommage du module « Intercité » en « SentraJet Allo Dakar », conformément à la décision de
-- séparer clairement cette offre du modèle Premium (flotte propre). Renommage des tables et
-- fonctions ; les policies RLS et index restent attachés (Postgres les conserve au renommage
-- d'une table), seuls leurs noms internes gardent une trace historique "intercity" — sans impact
-- fonctionnel ni visible pour les utilisateurs.

alter table public.intercity_corridors rename to allo_dakar_corridors;
alter table public.intercity_drivers rename to allo_dakar_drivers;
alter table public.intercity_vehicles rename to allo_dakar_vehicles;
alter table public.intercity_driver_subscriptions rename to allo_dakar_driver_subscriptions;
alter table public.intercity_departures rename to allo_dakar_departures;
alter table public.intercity_bookings rename to allo_dakar_bookings;

alter function public.book_intercity_seats(uuid, text, text, integer) rename to book_allo_dakar_seats;
alter function public.cancel_intercity_booking(uuid) rename to cancel_allo_dakar_booking;

update public.business_rules set category = 'allo_dakar' where category = 'intercity';
