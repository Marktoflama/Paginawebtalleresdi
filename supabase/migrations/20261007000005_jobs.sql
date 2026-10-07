-- ─────────────────────────────────────────────────────────────────────────────
-- 0005 · Transactional outbox for side effects (Excel sync, emails),
-- a single-writer lease, and the encrypted Microsoft Graph connection.
--
-- Jobs are inserted in the SAME transaction as the booking/cancellation, so a
-- booking can never commit without its job and a failing side effect can never
-- roll back a booking. Jobs carry only a reference: the worker re-reads the
-- current database state, which makes them idempotent and order-independent.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists private.jobs (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('excel.booking', 'excel.student', 'excel.rebuild', 'email.booking_confirmed', 'email.booking_cancelled')),
  ref_id      text not null,
  status      text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempts    integer not null default 0,
  run_after   timestamptz not null default now(),
  locked_at   timestamptz,
  last_error  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Coalesce duplicate *pending* signals for the same object. A job that is
-- already processing does not block a new pending one (it may have read stale state).
create unique index if not exists jobs_pending_unique on private.jobs (kind, ref_id) where status = 'pending';
create index if not exists jobs_claim_idx on private.jobs (status, run_after, id);

drop trigger if exists jobs_touch_updated_at on private.jobs;
create trigger jobs_touch_updated_at
  before update on private.jobs
  for each row execute function private.touch_updated_at();

create or replace function private.enqueue_job(p_kind text, p_ref_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.jobs (kind, ref_id) values (p_kind, p_ref_id)
  on conflict (kind, ref_id) where status = 'pending' do nothing;
$$;

revoke all on function private.enqueue_job(text, text) from public, anon, authenticated;

-- "Registros" sheet: sync a student when their name is first set or changed.
create or replace function private.profile_changed_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.full_name is not null and (tg_op = 'INSERT' or new.full_name is distinct from old.full_name) then
    perform private.enqueue_job('excel.student', new.id::text);
  end if;
  return null;
end;
$$;

drop trigger if exists profiles_enqueue_excel on public.profiles;
create trigger profiles_enqueue_excel
  after insert or update of full_name on public.profiles
  for each row execute function private.profile_changed_job();

-- ── Single-writer lease (prevents two workers appending the same Excel row) ──
create table if not exists private.worker_leases (
  name         text primary key,
  holder       text,
  leased_until timestamptz not null default '-infinity'
);

-- ── Microsoft Graph delegated connection (refresh token AES-256-GCM encrypted by the app) ──
create table if not exists private.integrations (
  provider          text primary key,
  account_email     text,
  refresh_token_enc text,
  scopes            text,
  connected_at      timestamptz,
  last_ok_at        timestamptz,
  last_error        text,
  updated_at        timestamptz not null default now()
);

drop trigger if exists integrations_touch_updated_at on private.integrations;
create trigger integrations_touch_updated_at
  before update on private.integrations
  for each row execute function private.touch_updated_at();

-- ─────────────── Service-role API (callable only with the secret key) ───────────────

create or replace function public.jobs_claim(p_kinds text[], p_limit integer)
returns table (id bigint, kind text, ref_id text, attempts integer)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  -- Recover jobs left "processing" by a crashed worker.
  update private.jobs j
     set status = 'pending', locked_at = null
   where j.status = 'processing' and j.locked_at < now() - interval '10 minutes';

  return query
  with picked as (
    select j.id
      from private.jobs j
     where j.status = 'pending'
       and j.run_after <= now()
       and j.kind = any (p_kinds)
     order by j.id
     limit greatest(1, least(p_limit, 100))
     for update skip locked
  )
  update private.jobs j
     set status = 'processing', attempts = j.attempts + 1, locked_at = now()
    from picked
   where j.id = picked.id
  returning j.id, j.kind, j.ref_id, j.attempts;
end;
$$;

create or replace function public.jobs_complete(p_id bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.jobs set status = 'done', locked_at = null, last_error = null where id = p_id;
$$;

create or replace function public.jobs_fail(p_id bigint, p_error text, p_max_attempts integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts integer;
begin
  select attempts into v_attempts from private.jobs where id = p_id;
  update private.jobs
     set status     = case when v_attempts >= p_max_attempts then 'failed' else 'pending' end,
         -- Exponential backoff: 1, 2, 4 … minutes, capped at 60.
         run_after  = now() + make_interval(mins => least(60, power(2, greatest(v_attempts - 1, 0))::integer)),
         locked_at  = null,
         last_error = left(p_error, 2000)
   where id = p_id;
end;
$$;

create or replace function public.jobs_summary()
returns table (kind text, status text, total bigint, last_error text)
language sql
stable
security definer
set search_path = ''
as $$
  select j.kind, j.status, count(*)::bigint,
         (array_agg(j.last_error order by j.updated_at desc) filter (where j.last_error is not null))[1]
    from private.jobs j
   where j.status <> 'done' or j.updated_at > now() - interval '7 days'
   group by j.kind, j.status
   order by j.kind, j.status;
$$;

create or replace function public.jobs_retry_failed()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  -- Retry only the newest failed job per (kind, ref_id) that has no pending twin…
  with newest as (
    select distinct on (f.kind, f.ref_id) f.id
      from private.jobs f
     where f.status = 'failed'
       and not exists (
         select 1 from private.jobs p
          where p.status = 'pending' and p.kind = f.kind and p.ref_id = f.ref_id
       )
     order by f.kind, f.ref_id, f.id desc
  )
  update private.jobs j
     set status = 'pending', attempts = 0, run_after = now(), last_error = null
    from newest
   where j.id = newest.id;
  get diagnostics v_count = row_count;

  -- …and close the older duplicates (the retried job re-reads current state anyway).
  update private.jobs f
     set status = 'done', last_error = 'superseded by retry'
   where f.status = 'failed'
     and exists (
       select 1 from private.jobs p
        where p.status = 'pending' and p.kind = f.kind and p.ref_id = f.ref_id
     );
  return v_count;
end;
$$;

create or replace function public.jobs_enqueue(p_kind text, p_ref_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.enqueue_job(p_kind, p_ref_id);
$$;

create or replace function public.lease_acquire(p_name text, p_holder text, p_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ok boolean;
begin
  insert into private.worker_leases (name, holder, leased_until)
  values (p_name, p_holder, now() + make_interval(secs => p_seconds))
  on conflict (name) do update
     set holder = excluded.holder, leased_until = excluded.leased_until
   where private.worker_leases.leased_until < now() or private.worker_leases.holder = excluded.holder
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

create or replace function public.lease_release(p_name text, p_holder text)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.worker_leases set leased_until = '-infinity', holder = null
   where name = p_name and holder = p_holder;
$$;

create or replace function public.integration_get(p_provider text)
returns table (
  provider text,
  account_email text,
  refresh_token_enc text,
  scopes text,
  connected_at timestamptz,
  last_ok_at timestamptz,
  last_error text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.provider, i.account_email, i.refresh_token_enc, i.scopes, i.connected_at, i.last_ok_at, i.last_error
    from private.integrations i
   where i.provider = p_provider;
$$;

create or replace function public.integration_save(p_provider text, p_account_email text, p_refresh_token_enc text, p_scopes text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.integrations (provider, account_email, refresh_token_enc, scopes, connected_at, last_ok_at, last_error)
  values (p_provider, p_account_email, p_refresh_token_enc, p_scopes, now(), now(), null)
  on conflict (provider) do update
     set account_email     = coalesce(excluded.account_email, private.integrations.account_email),
         refresh_token_enc = excluded.refresh_token_enc,
         scopes            = coalesce(excluded.scopes, private.integrations.scopes),
         connected_at      = case when private.integrations.refresh_token_enc is null then now() else private.integrations.connected_at end,
         last_ok_at        = now(),
         last_error        = null;
$$;

create or replace function public.integration_mark(p_provider text, p_ok boolean, p_error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.integrations
     set last_ok_at = case when p_ok then now() else last_ok_at end,
         last_error = case when p_ok then null else left(p_error, 2000) end
   where provider = p_provider;
$$;

create or replace function public.integration_delete(p_provider text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.integrations where provider = p_provider;
$$;

-- Lock every service-role function down (Postgres grants EXECUTE to PUBLIC by default).
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.jobs_claim(text[], integer)',
    'public.jobs_complete(bigint)',
    'public.jobs_fail(bigint, text, integer)',
    'public.jobs_summary()',
    'public.jobs_retry_failed()',
    'public.jobs_enqueue(text, text)',
    'public.lease_acquire(text, text, integer)',
    'public.lease_release(text, text)',
    'public.integration_get(text)',
    'public.integration_save(text, text, text, text)',
    'public.integration_mark(text, boolean, text)',
    'public.integration_delete(text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;
