-- Wave payout fields for partners (Sénégal)

alter table public.partners
  add column if not exists wave_aggregated_merchant_id text,
  add column if not exists wave_payout_mobile text,
  add column if not exists wave_payout_name text,
  add column if not exists wave_payout_enabled boolean not null default false,
  add column if not exists wave_redirect_url text;

-- Basic validation helpers (best-effort; Wave checks are enforced in the app too)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'partners_wave_payout_mobile_format_chk'
  ) then
    alter table public.partners
      add constraint partners_wave_payout_mobile_format_chk
      check (wave_payout_mobile is null or wave_payout_mobile ~ '^\\+[1-9]\\d{6,14}$');
  end if;
end $$;

notify pgrst, 'reload schema';

