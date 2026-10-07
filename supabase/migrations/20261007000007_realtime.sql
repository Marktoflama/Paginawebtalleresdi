-- ─────────────────────────────────────────────────────────────────────────────
-- 0007 · Realtime: broadcast slot open/close to every signed-in student.
--
-- Uses Supabase "Broadcast from Database" (realtime.send) on a PRIVATE topic
-- `slots`. The payload carries only date, start and action: no user id,
-- no name, no email. Clients refetch get_week_slots() to learn "is it mine".
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function private.broadcast_slot_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date  date;
  v_start time;
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_date := new.slot_date; v_start := new.slot_start; v_action := 'booked';
  else
    v_date := old.slot_date; v_start := old.slot_start; v_action := 'released';
  end if;

  perform realtime.send(
    jsonb_build_object('date', v_date, 'start', to_char(v_start, 'HH24:MI'), 'action', v_action),
    'slot',   -- event
    'slots',  -- topic
    true      -- private: only authorised subscribers
  );
  return null;
end;
$$;

drop trigger if exists slot_reservations_broadcast on public.slot_reservations;
create trigger slot_reservations_broadcast
  after insert or delete on public.slot_reservations
  for each row execute function private.broadcast_slot_change();

-- Authorise signed-in, allowed students to receive the `slots` topic.
drop policy if exists "slots topic: allowed students receive" on realtime.messages;
create policy "slots topic: allowed students receive"
  on realtime.messages for select
  to authenticated
  using (
    (select realtime.topic()) = 'slots'
    and realtime.messages.extension = 'broadcast'
    and private.is_allowed_email((select auth.jwt() ->> 'email'))
  );
