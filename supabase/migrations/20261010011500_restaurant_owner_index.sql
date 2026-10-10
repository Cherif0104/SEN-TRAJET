-- Cover the remaining catalog ownership foreign key for partner lookups.
create index if not exists restaurants_owner_id_idx
  on public.restaurants(owner_id);
