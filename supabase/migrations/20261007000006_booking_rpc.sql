-- ─────────────────────────────────────────────────────────────────────────────
-- 0006 · Booking RPCs: the only write path for students.
--
-- Errors are raised as SQLSTATE P0001 with a stable message key that the app
-- maps to Spanish copy (src/lib/booking/errors.ts):
--   NOT_AUTHENTICATED NOT_ALLOWED PROFILE_INCOMPLETE INVALID_SLOT SLOT_PAST
--   OUT_OF_WINDOW DAILY_LIMIT WEEKLY_LIMIT SLOT_TAKEN NOT_FOUND ALREADY_CANCELLED
--
-- Concurrency:
--   • Two students, same slot: both insert into slot_reservations; the second
--     waits on the unique index until the first commits, then gets 23505 →
--     SLOT_TAKEN and its whole transaction (booking row included) rolls back.
--   • One student, two tabs: a per-user transaction advisory lock serialises
--     the limit checks, and the second count (READ COMMITTED, fresh snapshot)
--     sees the first booking.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function private.raise_booking_error(p_key text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = p_key;
end;
$$;

create or replace function public.book_slot(p_date date, p_start time)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := auth.uid();
  v_email      text := auth.jwt() ->> 'email';
  r            private.booking_rules%rowtype;
  v_now        timestamp;
  v_today      date;
  v_last_start time;
  v_week_start date;
  v_count      integer;
  v_name       text;
  v_booking    public.bookings%rowtype;
begin
  if v_uid is null then
    perform private.raise_booking_error('NOT_AUTHENTICATED');
  end if;
  if not private.is_allowed_email(v_email) then
    perform private.raise_booking_error('NOT_ALLOWED');
  end if;

  select * into r from private.booking_rules where id;
  v_now   := now() at time zone r.timezone;
  v_today := v_now::date;

  select full_name into v_name from public.profiles where id = v_uid;
  if v_name is null then
    perform private.raise_booking_error('PROFILE_INCOMPLETE');
  end if;

  v_last_start := make_time(r.last_slot_end_hour, 0, 0) - make_interval(mins => r.slot_minutes);
  if p_date is null or p_start is null
     or extract(isodow from p_date) > 5
     or p_start < make_time(r.first_slot_hour, 0, 0)
     or p_start > v_last_start
     or (extract(hour from p_start)::integer * 60 + extract(minute from p_start)::integer - r.first_slot_hour * 60) % r.slot_minutes <> 0
     or extract(second from p_start) <> 0 then
    perform private.raise_booking_error('INVALID_SLOT');
  end if;

  if (p_date + p_start) <= v_now then
    perform private.raise_booking_error('SLOT_PAST');
  end if;
  if p_date > v_today + (r.weeks_ahead * 7) then
    perform private.raise_booking_error('OUT_OF_WINDOW');
  end if;

  -- Serialise this student's bookings so the limit checks below are race-free.
  perform pg_advisory_xact_lock(hashtextextended('book:' || v_uid::text, 0));

  select count(*) into v_count
    from public.bookings b
   where b.user_id = v_uid and b.status = 'confirmed' and b.slot_date = p_date;
  if v_count >= r.max_per_day then
    perform private.raise_booking_error('DAILY_LIMIT');
  end if;

  v_week_start := p_date - (extract(isodow from p_date)::integer - 1);
  select count(*) into v_count
    from public.bookings b
   where b.user_id = v_uid and b.status = 'confirmed'
     and b.slot_date between v_week_start and v_week_start + 6;
  if v_count >= r.max_per_week then
    perform private.raise_booking_error('WEEKLY_LIMIT');
  end if;

  insert into public.bookings (user_id, slot_date, slot_start)
  values (v_uid, p_date, p_start)
  returning * into v_booking;

  begin
    insert into public.slot_reservations (booking_id, slot_date, slot_start, user_id)
    values (v_booking.id, p_date, p_start, v_uid);
  exception when unique_violation then
    perform private.raise_booking_error('SLOT_TAKEN');
  end;

  perform private.enqueue_job('excel.booking', v_booking.id::text);
  perform private.enqueue_job('email.booking_confirmed', v_booking.id::text);
  return v_booking;
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_now     timestamp;
  v_booking public.bookings%rowtype;
begin
  if v_uid is null then
    perform private.raise_booking_error('NOT_AUTHENTICATED');
  end if;
  if not private.is_allowed_email(auth.jwt() ->> 'email') then
    perform private.raise_booking_error('NOT_ALLOWED');
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_booking.user_id <> v_uid then
    perform private.raise_booking_error('NOT_FOUND');
  end if;
  if v_booking.status = 'cancelled' then
    perform private.raise_booking_error('ALREADY_CANCELLED');
  end if;

  v_now := private.local_now();
  if (v_booking.slot_date + v_booking.slot_start) <= v_now then
    perform private.raise_booking_error('SLOT_PAST');
  end if;

  update public.bookings
     set status = 'cancelled', cancelled_at = now(), cancelled_by = 'student'
   where id = p_booking_id
  returning * into v_booking;

  delete from public.slot_reservations where booking_id = p_booking_id;

  perform private.enqueue_job('excel.booking', v_booking.id::text);
  perform private.enqueue_job('email.booking_cancelled', v_booking.id::text);
  return v_booking;
end;
$$;

-- Occupied slots in a date range for the signed-in student: times only, plus
-- "is it mine". Never exposes who booked a slot.
create or replace function public.get_week_slots(p_from date, p_to date)
returns table (slot_date date, slot_start time, mine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.slot_date, s.slot_start, s.user_id = auth.uid()
    from public.slot_reservations s
   where auth.uid() is not null
     and private.is_allowed_email(auth.jwt() ->> 'email')
     and p_to >= p_from
     and p_to - p_from <= 42
     and s.slot_date between p_from and p_to
   order by s.slot_date, s.slot_start;
$$;

-- Anonymous availability for the home page (service role only, times only).
create or replace function public.occupied_slots(p_from date, p_to date)
returns table (slot_date date, slot_start time)
language sql
stable
security definer
set search_path = ''
as $$
  select s.slot_date, s.slot_start
    from public.slot_reservations s
   where p_to >= p_from and p_to - p_from <= 62
     and s.slot_date between p_from and p_to
   order by s.slot_date, s.slot_start;
$$;

-- Admin cancellation (service role only; the app checks ADMIN_EMAILS first).
create or replace function public.admin_cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    perform private.raise_booking_error('NOT_FOUND');
  end if;
  if v_booking.status = 'cancelled' then
    perform private.raise_booking_error('ALREADY_CANCELLED');
  end if;

  update public.bookings
     set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin'
   where id = p_booking_id
  returning * into v_booking;

  delete from public.slot_reservations where booking_id = p_booking_id;

  perform private.enqueue_job('excel.booking', v_booking.id::text);
  perform private.enqueue_job('email.booking_cancelled', v_booking.id::text);
  return v_booking;
end;
$$;

revoke all on function private.raise_booking_error(text) from public, anon, authenticated;

revoke all on function public.book_slot(date, time) from public, anon;
revoke all on function public.cancel_booking(uuid) from public, anon;
revoke all on function public.get_week_slots(date, date) from public, anon;
grant execute on function public.book_slot(date, time) to authenticated, service_role;
grant execute on function public.cancel_booking(uuid) to authenticated, service_role;
grant execute on function public.get_week_slots(date, date) to authenticated, service_role;

revoke all on function public.occupied_slots(date, date) from public, anon, authenticated;
revoke all on function public.admin_cancel_booking(uuid) from public, anon, authenticated;
grant execute on function public.occupied_slots(date, date) to service_role;
grant execute on function public.admin_cancel_booking(uuid) to service_role;
