-- ─────────────────────────────────────────────────────────────────────────────
-- 0001 · Foundation: extensions and the private schema.
-- `private` is NOT exposed through the Data API: tables there are reachable
-- only through the SECURITY DEFINER functions defined in later migrations.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists citext with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;
-- Row-level-security policies run as the caller and call private.is_allowed_email(),
-- so signed-in users need USAGE on the schema (they still have no table grants).
grant usage on schema private to authenticated, service_role;

-- Generic updated_at trigger.
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
