-- ─────────────────────────────────────────────────────────────────────────────
-- 0004 · Bookings.
--
--   public.bookings           immutable record of every booking (never deleted);
--                             one row per booking ID, status confirmed|cancelled.
--   public.slot_reservations  the LOCK. A row exists ⇔ the slot is closed.
--                             UNIQUE (slot_date, slot_start) = one student per slot.
--                             Cancelling deletes the lock row, reopening the slot.
--
-- Students never write these tables directly: writes go through book_slot() and
-- cancel_booking() (migration 0005).
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status' and typnamespace = 'public'::regnamespace) then
    create type public.booking_status as enum ('confirmed', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'cancel_actor' and typnamespace = 'public'::regnamespace) then
    create type public.cancel_actor as enum ('student', 'admin');
  end if;
end;
$$;

create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete restrict,
  slot_date    date not null,
  slot_start   time not null,
  slot_end     time generated always as (slot_start + interval '1 hour') stored,
  status       public.booking_status not null default 'confirmed',
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by public.cancel_actor,
  constraint bookings_weekday_chk check (extract(isodow from slot_date) between 1 and 5),
  constraint bookings_on_the_hour_chk check (date_part('minute', slot_start) = 0 and date_part('second', slot_start) = 0),
  constraint bookings_hours_chk check (slot_start between time '08:00' and time '18:00'),
  constraint bookings_cancel_consistency_chk check (
    (status = 'confirmed' and cancelled_at is null and cancelled_by is null)
    or (status = 'cancelled' and cancelled_at is not null and cancelled_by is not null)
  )
);

comment on table public.bookings is 'Every booking ever made (history). Slot occupancy lives in slot_reservations.';

create index if not exists bookings_user_date_idx on public.bookings (user_id, slot_date) where status = 'confirmed';
create index if not exists bookings_date_idx on public.bookings (slot_date, slot_start);

create table if not exists public.slot_reservations (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  slot_date  date not null,
  slot_start time not null,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint slot_reservations_slot_unique unique (slot_date, slot_start)
);

comment on table public.slot_reservations is 'Lock table: a row means the slot is closed. UNIQUE (slot_date, slot_start).';
comment on constraint slot_reservations_slot_unique on public.slot_reservations is 'One student per slot. Concurrent bookings: exactly one insert succeeds.';

alter table public.bookings enable row level security;
alter table public.slot_reservations enable row level security;

revoke all on table public.bookings from anon, authenticated;
revoke all on table public.slot_reservations from anon, authenticated;
grant select on table public.bookings to authenticated;
grant all on table public.bookings to service_role;
grant all on table public.slot_reservations to service_role;

-- Students read only their own bookings. No write policies: RPCs only.
drop policy if exists "bookings: read own" on public.bookings;
create policy "bookings: read own"
  on public.bookings for select
  to authenticated
  using (user_id = (select auth.uid()) and private.is_allowed_email((select auth.jwt() ->> 'email')));

-- slot_reservations: RLS on, no policies → no direct access for anon/authenticated.
-- Occupancy (without identities) is exposed by get_week_slots().
