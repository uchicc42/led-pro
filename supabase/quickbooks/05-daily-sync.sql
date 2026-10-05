-- Optional: sync QuickBooks automatically once a day (10:00 UTC ≈ 6am Eastern).
-- Run after the qb-sync function is deployed and the CRON_SECRET secret is set.
-- Replace REPLACE_WITH_CRON_SECRET below with the same value you saved as CRON_SECRET.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove an earlier version of this schedule if there is one.
select cron.unschedule(jobid) from cron.job where jobname = 'quickbooks-daily-sync';

select cron.schedule(
  'quickbooks-daily-sync',
  '0 10 * * *',
  $$
  select net.http_post(
    url := 'https://soiuimhkenxacipsruzr.supabase.co/functions/v1/qb-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- The app's public key: lets the request through the gateway; the secret below is what authorises it.
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvaXVpbWhrZW54YWNpcHNydXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzQwNDIsImV4cCI6MjA5NzIxMDA0Mn0.mmMdPTOhZAv2fplExu7k1UfxThUEr-QOWp--xZg2tF4',
      'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);
