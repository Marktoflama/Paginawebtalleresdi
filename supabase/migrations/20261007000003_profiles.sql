-- ─────────────────────────────────────────────────────────────────────────────
-- 0003 · Student profiles (one per auth user).
-- created_at is the "registration date" exported to the Excel "Registros" sheet.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      extensions.citext not null unique,
  full_name  text check (full_name is null or char_length(btrim(full_name)) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Student profile: full name, email, registration date.';

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

alter table public.profiles enable row level security;

-- Supabase grants ALL on new public tables by default: start from nothing.
revoke all on table public.profiles from anon, authenticated;
grant select, update (full_name) on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles: update own name" on public.profiles;
create policy "profiles: update own name"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) and private.is_allowed_email((select auth.jwt() ->> 'email')))
  with check (id = (select auth.uid()));

-- Create the profile when Supabase Auth creates the user.
-- The optional name comes from signInWithOtp({ options: { data: { full_name } } }).
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), case when char_length(v_name) between 2 and 120 then v_name end)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Keep the profile email in sync if it ever changes in Auth.
create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.profiles set email = lower(new.email) where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function private.handle_user_email_change();
