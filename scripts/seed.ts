/**
 * Development seed: four test students (@esdi.edu.es) and a few bookings in
 * the coming days that respect the rules (1/day, 2/week per student).
 * Refuses to run against a non-local NEXT_PUBLIC_SITE_URL unless --force.
 *
 *   npm run db:seed
 */
import { createClient } from "@supabase/supabase-js";
import { BOOKING_RULES } from "../src/config/booking";
import { addDays, isBookableWeekday, mondayOf, slotStarts, wallClock } from "../src/lib/booking/time";
import type { Database } from "../src/lib/supabase/types";
import { isLocalUrl, loadEnv, requireEnv } from "./env";

loadEnv();
if (!isLocalUrl(process.env.NEXT_PUBLIC_SITE_URL) && !process.argv.includes("--force")) {
  console.error("✗ NEXT_PUBLIC_SITE_URL no es local. Para sembrar datos de prueba en producción usa --force.");
  process.exit(1);
}

const supabase = createClient<Database>(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const STUDENTS = [
  { email: `alumno1@${BOOKING_RULES.allowedDomain}`, name: "Laia Puig Ferrer" },
  { email: `alumno2@${BOOKING_RULES.allowedDomain}`, name: "Marc Soler Vidal" },
  { email: `alumno3@${BOOKING_RULES.allowedDomain}`, name: "Nerea Ortiz Campos" },
  { email: `alumno4@${BOOKING_RULES.allowedDomain}`, name: "Pau Ribas Font" },
];

async function ensureUser(email: string, name: string): Promise<string> {
  const created = await supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: name } });
  if (created.data.user) return created.data.user.id;
  // Already registered: find it.
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  throw new Error(`No se pudo crear ni encontrar ${email}: ${created.error?.message}`);
}

async function main() {
  const ids: string[] = [];
  for (const s of STUDENTS) {
    const id = await ensureUser(s.email, s.name);
    await supabase.from("profiles").update({ full_name: s.name }).eq("id", id).is("full_name", null);
    ids.push(id);
    console.log(`✓ ${s.email} (${s.name})`);
  }

  // Next 6 bookable weekdays starting tomorrow, spread across students.
  const today = wallClock().date;
  const days: string[] = [];
  for (let d = addDays(today, 1); days.length < 6; d = addDays(d, 1)) if (isBookableWeekday(d)) days.push(d);
  const starts = slotStarts();
  const perWeek = new Map<string, number>();
  let made = 0;

  for (const [i, date] of days.entries()) {
    const userId = ids[i % ids.length]!;
    const weekKey = `${userId}:${mondayOf(date)}`;
    if ((perWeek.get(weekKey) ?? 0) >= BOOKING_RULES.maxPerWeek) continue;
    const start = starts[(i * 3 + 2) % starts.length]!;
    const { data: existing } = await supabase.from("slot_reservations").select("booking_id").eq("slot_date", date).eq("slot_start", start).maybeSingle();
    if (existing) continue;
    const { data: mine } = await supabase.from("bookings").select("id").eq("user_id", userId).eq("slot_date", date).eq("status", "confirmed");
    if ((mine ?? []).length >= BOOKING_RULES.maxPerDay) continue;
    const { data: booking, error } = await supabase.from("bookings").insert({ user_id: userId, slot_date: date, slot_start: start }).select("id").single();
    if (error || !booking) {
      console.warn(`  · ${date} ${start}: ${error?.message}`);
      continue;
    }
    const lock = await supabase.from("slot_reservations").insert({ booking_id: booking.id, slot_date: date, slot_start: start, user_id: userId });
    if (lock.error) {
      await supabase.from("bookings").delete().eq("id", booking.id);
      continue;
    }
    perWeek.set(weekKey, (perWeek.get(weekKey) ?? 0) + 1);
    made++;
    console.log(`  + ${date} ${start}`);
  }
  console.log(`✓ ${made} reservas de ejemplo creadas.`);
}

main().catch((e) => {
  console.error("✗", (e as Error).message);
  process.exitCode = 1;
});
