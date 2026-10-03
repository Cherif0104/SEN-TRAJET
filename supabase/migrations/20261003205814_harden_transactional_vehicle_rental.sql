alter extension btree_gist set schema extensions;

alter table public.rental_bookings
  add column if not exists expires_at timestamptz not null default (now() + interval '15 minutes');

create or replace function public.prepare_rental_booking()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  listing public.rental_listings%rowtype;
begin
  select * into listing
  from public.rental_listings
  where id = new.listing_id
  for update;

  if not found or listing.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'rental_listing_unavailable';
  end if;
  if new.start_date < current_date or new.end_date < new.start_date then
    raise exception using errcode = '22007', message = 'rental_dates_invalid';
  end if;

  new.client_id := coalesce(new.client_id, auth.uid());
  if new.client_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  new.reference := coalesce(
    nullif(new.reference, ''),
    'SJ-LOC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  );
  new.owner_profile_id := listing.owner_profile_id;
  new.partner_organization_id := listing.partner_organization_id;
  new.total_days := (new.end_date - new.start_date) + 1;
  if new.total_days < listing.minimum_days then
    raise exception using errcode = '22023', message = 'rental_minimum_days_not_met';
  end if;
  new.daily_rate_fcfa := listing.daily_rate_fcfa;
  new.subtotal_fcfa := listing.daily_rate_fcfa * new.total_days;
  new.deposit_fcfa := listing.deposit_fcfa;
  new.platform_commission_fcfa := round(new.subtotal_fcfa * 0.15);
  new.owner_net_fcfa := new.subtotal_fcfa - new.platform_commission_fcfa;
  new.total_fcfa := new.subtotal_fcfa + new.deposit_fcfa;
  new.status := 'pending_payment';
  new.payment_status := 'pending';
  new.expires_at := now() + interval '15 minutes';
  return new;
end;
$$;

revoke all on function public.prepare_rental_booking() from public, anon, authenticated;
