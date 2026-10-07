-- ─────────────────────────────────────────────────────────────────────────────
-- 0002 · Booking rules and the email allowlist.
-- Mirrors src/config/booking.ts (tests/integration/booking.test.ts checks
-- that both stay identical).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists private.booking_rules (
  id                 boolean primary key default true check (id),
  timezone           text    not null,
  allowed_domain     text    not null,
  first_slot_hour    integer not null check (first_slot_hour between 0 and 23),
  last_slot_end_hour integer not null check (last_slot_end_hour between 1 and 24),
  slot_minutes       integer not null check (slot_minutes > 0 and (60 % slot_minutes = 0 or slot_minutes % 60 = 0)),
  max_per_day        integer not null check (max_per_day > 0),
  max_per_week       integer not null check (max_per_week > 0),
  weeks_ahead        integer not null check (weeks_ahead > 0),
  check (last_slot_end_hour > first_slot_hour)
);

insert into private.booking_rules
  (id, timezone, allowed_domain, first_slot_hour, last_slot_end_hour, slot_minutes, max_per_day, max_per_week, weeks_ahead)
values
  (true, 'Europe/Madrid', 'esdi.edu.es', 8, 19, 60, 1, 2, 4)
on conflict (id) do update set
  timezone           = excluded.timezone,
  allowed_domain     = excluded.allowed_domain,
  first_slot_hour    = excluded.first_slot_hour,
  last_slot_end_hour = excluded.last_slot_end_hour,
  slot_minutes       = excluded.slot_minutes,
  max_per_day        = excluded.max_per_day,
  max_per_week       = excluded.max_per_week,
  weeks_ahead        = excluded.weeks_ahead;

-- Extra sign-in allowlist (admins whose address isn't @esdi.edu.es).
-- Filled by `npm run admins:sync` from ADMIN_EMAILS.
create table if not exists private.allowed_emails (
  email      extensions.citext primary key,
  reason     text not null default 'admin',
  created_at timestamptz not null default now()
);

-- True only for <local>@<allowed_domain> exactly, or an allowlisted address.
-- Same rule as src/lib/auth/domain.ts (rejects x@esdi.edu.es.evil.com, x@sub.esdi.edu.es, a@b@esdi.edu.es).
create or replace function private.is_allowed_email(p_email text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email  text := lower(btrim(coalesce(p_email, '')));
  v_domain text;
begin
  if v_email = '' then
    return false;
  end if;
  select r.allowed_domain into v_domain from private.booking_rules r where r.id;
  if v_email ~ ('^[a-z0-9!#$%&''*+/=?^_`{|}~.-]+@' || replace(v_domain, '.', '\.') || '$')
     and v_email !~ '^\.' and v_email !~ '\.@' and v_email !~ '\.\.' then
    return true;
  end if;
  return exists (select 1 from private.allowed_emails a where a.email = v_email::extensions.citext);
end;
$$;

revoke all on function private.is_allowed_email(text) from public;
grant execute on function private.is_allowed_email(text) to authenticated, service_role;

-- Current wall-clock time in the workshop time zone.
create or replace function private.local_now()
returns timestamp
language sql
stable
security definer
set search_path = ''
as $$
  select now() at time zone (select r.timezone from private.booking_rules r where r.id);
$$;

revoke all on function private.local_now() from public;
grant execute on function private.local_now() to authenticated, service_role;

-- Read-only snapshot of the rules for the parity test (service role only).
create or replace function public.booking_rules_snapshot()
returns table (
  timezone text,
  allowed_domain text,
  first_slot_hour integer,
  last_slot_end_hour integer,
  slot_minutes integer,
  max_per_day integer,
  max_per_week integer,
  weeks_ahead integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.timezone, r.allowed_domain, r.first_slot_hour, r.last_slot_end_hour, r.slot_minutes,
         r.max_per_day, r.max_per_week, r.weeks_ahead
  from private.booking_rules r
  where r.id;
$$;

revoke all on function public.booking_rules_snapshot() from public, anon, authenticated;
grant execute on function public.booking_rules_snapshot() to service_role;
