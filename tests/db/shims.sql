-- Minimal stand-ins for what a hosted Supabase project provides before any
-- user migration runs. Only what supabase/migrations/* touches.

-- Roles (PostgREST switches to these per request; GoTrue runs hooks as supabase_auth_admin).
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role supabase_auth_admin nologin noinherit;

-- Supabase's default grants on the public schema (the migrations must revoke them).
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create schema extensions;
grant usage on schema extensions to anon, authenticated, service_role, supabase_auth_admin;

-- auth: the users table (subset) and the JWT helpers, same definitions as Supabase.
create schema auth;
grant usage on schema auth to anon, authenticated, service_role, supabase_auth_admin;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255),
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role, supabase_auth_admin;

-- realtime: messages table with RLS and the Broadcast-from-Database helpers.
create schema realtime;
grant usage on schema realtime to anon, authenticated, service_role;
create table realtime.messages (
  id bigserial primary key,
  topic text not null,
  extension text not null,
  payload jsonb,
  event text,
  private boolean default false,
  inserted_at timestamptz default now()
);
alter table realtime.messages enable row level security;
grant select on realtime.messages to authenticated;
create function realtime.topic() returns text language sql stable as $$
  select nullif(current_setting('realtime.topic', true), '')
$$;
create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void
language plpgsql security definer as $$
begin
  insert into realtime.messages (topic, extension, payload, event, private)
  values (topic, 'broadcast', payload, event, private);
end;
$$;
grant execute on function realtime.topic() to authenticated, service_role;

-- vault (plaintext here; Supabase encrypts at rest).
create schema vault;
create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text not null, description text);
create view vault.decrypted_secrets as select id, name, secret as decrypted_secret, description from vault.secrets;
create function vault.create_secret(new_secret text, new_name text default null, new_description text default '') returns uuid
language sql as $$ insert into vault.secrets (name, secret, description) values (new_name, new_secret, new_description) returning id $$;
create function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null) returns void
language sql as $$
  update vault.secrets
     set secret = coalesce(new_secret, secret), name = coalesce(new_name, name), description = coalesce(new_description, description)
   where id = secret_id
$$;
