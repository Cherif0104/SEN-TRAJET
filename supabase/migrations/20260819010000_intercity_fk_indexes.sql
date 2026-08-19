-- Index de couverture pour les clés étrangères signalées par l'advisor performance (vérification
-- finale avant fusion) — évite les scans complets à mesure que le module Intercité grandit.

create index if not exists intercity_departures_vehicle_idx on public.intercity_departures (intercity_vehicle_id);
create index if not exists intercity_drivers_user_idx on public.intercity_drivers (user_id);
create index if not exists intercity_vehicles_driver_idx on public.intercity_vehicles (intercity_driver_id);
