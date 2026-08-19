create index if not exists entity_timeline_actor_idx
  on public.entity_timeline(actor_id);
create index if not exists entity_cases_assigned_to_idx
  on public.entity_cases(assigned_to);
create index if not exists entity_cases_created_by_idx
  on public.entity_cases(created_by);
create index if not exists entity_contracts_supersedes_idx
  on public.entity_contracts(supersedes_id);
create index if not exists entity_contracts_created_by_idx
  on public.entity_contracts(created_by);
create index if not exists entity_documents_verified_by_idx
  on public.entity_documents(verified_by);
create index if not exists entity_documents_created_by_idx
  on public.entity_documents(created_by);
create index if not exists entity_financial_booking_idx
  on public.entity_financial_records(related_booking_id);
create index if not exists entity_financial_created_by_idx
  on public.entity_financial_records(created_by);
create index if not exists vehicle_maintenance_created_by_idx
  on public.vehicle_maintenance_records(created_by);
