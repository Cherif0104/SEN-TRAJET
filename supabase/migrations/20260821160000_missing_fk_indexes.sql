-- Ajoute les index de couverture manquants sur les colonnes de clé étrangère (repéré via
-- l'audit de performance Supabase) — purement additif, aucun impact fonctionnel, améliore les
-- jointures/filtres déjà utilisés par le calendrier 360°, les tarifs partenaires et le CRM.
create index if not exists allo_dakar_ride_requests_confirmed_by_driver_id_idx on public.allo_dakar_ride_requests (confirmed_by_driver_id);
create index if not exists allo_dakar_ride_requests_matched_booking_id_idx on public.allo_dakar_ride_requests (matched_booking_id);
create index if not exists allo_dakar_ride_requests_matched_departure_id_idx on public.allo_dakar_ride_requests (matched_departure_id);
create index if not exists booking_status_history_changed_by_idx on public.booking_status_history (changed_by);
create index if not exists bookings_partner_contract_id_idx on public.bookings (partner_contract_id);
create index if not exists crm_activities_booking_id_idx on public.crm_activities (booking_id);
create index if not exists crm_activities_lead_id_idx on public.crm_activities (lead_id);
create index if not exists crm_activities_next_action_assignee_idx on public.crm_activities (next_action_assignee);
create index if not exists crm_activities_partner_org_id_idx on public.crm_activities (partner_org_id);
create index if not exists driver_shifts_vehicle_id_idx on public.driver_shifts (vehicle_id);
create index if not exists finance_accounts_partner_org_id_idx on public.finance_accounts (partner_org_id);
create index if not exists partner_organizations_created_by_idx on public.partner_organizations (created_by);
create index if not exists partner_organizations_partner_contract_id_idx on public.partner_organizations (partner_contract_id);
create index if not exists partner_organizations_user_id_idx on public.partner_organizations (user_id);
create index if not exists payments_booking_id_idx on public.payments (booking_id);
create index if not exists vehicle_exploitation_contracts_owner_id_idx on public.vehicle_exploitation_contracts (owner_id);
create index if not exists vehicle_exploitation_contracts_vehicle_id_idx on public.vehicle_exploitation_contracts (vehicle_id);
