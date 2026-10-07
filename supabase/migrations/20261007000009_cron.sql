-- ─────────────────────────────────────────────────────────────────────────────
-- 0009 · Retry driver: pg_cron + pg_net call the app's job runner every 5 min.
-- (Vercel Hobby cron runs at most once a day, so retries are driven from here.)
--
-- The URL and bearer secret live in Supabase Vault and are written by
-- `npm run cron:setup` once the app is deployed. Until then the job is a no-op.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create or replace function private.invoke_job_runner()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'taller_jobs_runner_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'taller_jobs_runner_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function private.invoke_job_runner() from public, anon, authenticated;

-- Idempotent: cron.schedule with an existing name updates the job.
select cron.schedule('taller-jobs-runner', '*/5 * * * *', $cron$select private.invoke_job_runner()$cron$);

-- Service-role helper used by scripts/cron-setup.ts to store the Vault secrets.
create or replace function public.cron_configure(p_url text, p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'taller_jobs_runner_url';
  if v_id is null then
    perform vault.create_secret(p_url, 'taller_jobs_runner_url', 'Job runner endpoint');
  else
    perform vault.update_secret(v_id, p_url);
  end if;

  select id into v_id from vault.secrets where name = 'taller_jobs_runner_secret';
  if v_id is null then
    perform vault.create_secret(p_secret, 'taller_jobs_runner_secret', 'Bearer secret for the job runner');
  else
    perform vault.update_secret(v_id, p_secret);
  end if;
end;
$$;

revoke all on function public.cron_configure(text, text) from public, anon, authenticated;
grant execute on function public.cron_configure(text, text) to service_role;
