-- Cover lifecycle foreign keys used by account deletion and audit queries.

create index if not exists ride_ratings_client_idx
  on public.ride_ratings(client_id);

create index if not exists ride_requests_cancelled_by_idx
  on public.ride_requests(cancelled_by)
  where cancelled_by is not null;
