-- The former assignment expiry function was removed with the BTC dispatch
-- rebuild, but its pg_cron job still ran every minute and polluted logs.
do $$
declare
  obsolete_job record;
begin
  for obsolete_job in
    select jobid
    from cron.job
    where command = 'select public.expire_my_driver_assignments()'
  loop
    perform cron.unschedule(obsolete_job.jobid);
  end loop;
end;
$$;
