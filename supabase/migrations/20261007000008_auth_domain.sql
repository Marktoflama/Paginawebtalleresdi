-- ─────────────────────────────────────────────────────────────────────────────
-- 0008 · Server-side email-domain enforcement for sign-up.
--
-- Two independent layers (the publishable key is public, so the browser can
-- call Supabase Auth directly; a client-only check would be worthless):
--
--   1. Auth Hook "Before User Created" → public.hook_before_user_created
--      Returns a clean 403 with a Spanish message. Must be ENABLED ONCE in the
--      dashboard: Authentication → Hooks → Before User Created → Postgres →
--      public.hook_before_user_created (see README).
--
--   2. Backstop trigger on auth.users (always on, installed by this migration):
--      even if the hook was never enabled, no non-allowed address can be
--      inserted into auth.users (Auth answers "Database error saving new user").
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := event -> 'user' ->> 'email';
begin
  if v_email is null or not private.is_allowed_email(v_email) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Solo se admiten cuentas @' || (select r.allowed_domain from private.booking_rules r where r.id) || '.'
      )
    );
  end if;
  return '{}'::jsonb;
end;
$$;

revoke all on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
grant usage on schema private to supabase_auth_admin;

create or replace function private.enforce_signup_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or not private.is_allowed_email(new.email) then
    raise exception 'signup blocked: email domain not allowed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_signup_domain on auth.users;
create trigger enforce_signup_domain
  before insert on auth.users
  for each row execute function private.enforce_signup_domain();
