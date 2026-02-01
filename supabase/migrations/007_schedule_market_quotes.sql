-- Schedule update-market-quotes every 30 minutes
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $do$
declare
  job_id integer;
begin
  select jobid into job_id
  from cron.job
  where jobname = 'update-market-quotes-30min';

  if job_id is not null then
    perform cron.unschedule(job_id);
  end if;

  perform cron.schedule(
    'update-market-quotes-30min',
    '*/30 * * * *',
    $cron$
    select net.http_post(
      url := 'https://jrrdcqrmbafzdhsmlfjb.supabase.co/functions/v1/update-market-quotes',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpycmRjcXJtYmFmemRoc21sZmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjU4NzcsImV4cCI6MjA4NTMwMTg3N30.KIeA9mYGj1qtKZEIILPb_KckUG2T5mLotbB_8-sliWQ'
      ),
      body := '{}'::jsonb
    );
    $cron$
  );
end $do$;
