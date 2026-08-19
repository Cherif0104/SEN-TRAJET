-- Complète le renommage de la migration précédente : ALTER TABLE ... RENAME TO ne renomme pas
-- les colonnes elles-mêmes. Les colonnes de clé étrangère gardaient encore leur ancien nom
-- "intercity_*".

alter table public.allo_dakar_departures rename column intercity_driver_id to allo_dakar_driver_id;
alter table public.allo_dakar_departures rename column intercity_vehicle_id to allo_dakar_vehicle_id;
alter table public.allo_dakar_driver_subscriptions rename column intercity_driver_id to allo_dakar_driver_id;
alter table public.allo_dakar_vehicles rename column intercity_driver_id to allo_dakar_driver_id;
