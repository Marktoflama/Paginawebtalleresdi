// Database-level QA (Phase 4): applies supabase/migrations with the project's own
// runner (npm run db:migrate) to a throwaway PostgreSQL 17 with Supabase shims,
// then checks the booking guarantees the way PostgREST calls them
// (SET LOCAL ROLE + request.jwt.claims per transaction).
//
//   cd tests/db && npm install && npm test        # all checks
//   npm run test:mutation                          # negative control: guards removed, races must fail
//
// No Docker and no Supabase project needed. pg_cron and pg_net are replaced by
// stubs (ext/) that record calls instead of running them.
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, "..", "..");
const OUT = path.join(HERE, ".out");
const MUTATE = process.argv.includes("--mutate") || Boolean(process.env.MUTATE);
const PORT = Number(process.env.PGTEST_PORT ?? 54329);
const URL = `postgres://postgres:postgres@127.0.0.1:${PORT}/postgres`;
const TSX = path.join(PROJECT, "node_modules", "tsx", "dist", "cli.mjs");
const DATA = path.join(os.tmpdir(), `taller-reservas-pgtest-${process.pid}`);

// Install the pg_cron / pg_net stubs next to the embedded server's own extensions.
const platformPkg = `@embedded-postgres/${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`;
const extDir = path.join(HERE, "node_modules", ...platformPkg.split("/"), "native", "share", "extension");
for (const f of readdirSync(path.join(HERE, "ext"))) copyFileSync(path.join(HERE, "ext", f), path.join(extDir, f));

mkdirSync(OUT, { recursive: true });
rmSync(DATA, { recursive: true, force: true });
const pg = new EmbeddedPostgres({
  databaseDir: DATA,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: false,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-c", "timezone=UTC", "-c", "max_connections=120"],
  onLog: () => {},
});

const results = [];
const log = (...a) => console.log(...a);
async function t(name, fn) {
  try {
    await fn();
    results.push(["PASS", name]);
    log(`  ✓ ${name}`);
  } catch (e) {
    results.push(["FAIL", name, e.message]);
    log(`  ✗ ${name}\n      ${e.message}`);
  }
}
/** JSON with object keys sorted, so jsonb key order doesn't matter. */
const canon = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));
function eq(actual, expected, msg = "") {
  const a = canon(actual);
  const b = canon(expected);
  if (a !== b) throw new Error(`${msg} expected ${b}, got ${a}`);
}
function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}
async function rejects(promise, expected, msg = "") {
  try {
    await promise;
  } catch (e) {
    const got = `${e.code ?? ""} ${e.message}`;
    if (!got.includes(expected)) throw new Error(`${msg} expected error ~ "${expected}", got "${got}"`);
    return e;
  }
  throw new Error(`${msg} expected error ~ "${expected}", but it succeeded`);
}

// ── dates (Madrid wall clock, ISO arithmetic in UTC) ───────────────────────────
const madridToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const addDays = (d, n) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const isoDow = (d) => ((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
const mondayOf = (d) => addDays(d, 1 - isoDow(d));
const W1 = addDays(mondayOf(madridToday), 7); // next week
const W2 = addDays(W1, 7); // the week after
const day = (monday, i) => addDays(monday, i); // 0 = Mon … 4 = Fri

async function main() {
  await pg.initialise();
  await pg.start();
  const su = postgres(URL, { max: 5, onnotice: () => {} });
  try {
    log(`PostgreSQL ${(await su`show server_version`)[0].server_version} on :${PORT} · Madrid today ${madridToday} · W1 ${W1} · W2 ${W2}`);
    await su.unsafe(readFileSync(path.join(HERE, "shims.sql"), "utf8"));

    // ── migrations through the project's own runner ───────────────────────────
    log("\nMigrations (npm run db:migrate):");
    const env = { ...process.env, DATABASE_URL: URL };
    for (const args of [[], ["--status"], []]) {
      const r = spawnSync(process.execPath, [TSX, "scripts/db-migrate.ts", ...args], { cwd: PROJECT, env, encoding: "utf8" });
      log((r.stdout + r.stderr).trim().replace(/^/gm, "  | "));
      if (r.status !== 0) throw new Error("db:migrate failed");
    }
    await t("all 9 migrations recorded in supabase_migrations.schema_migrations", async () => {
      eq((await su`select count(*)::int as n from supabase_migrations.schema_migrations`)[0].n, 9);
    });
    await t("every migration file can be re-applied (idempotent SQL)", async () => {
      const dir = path.join(PROJECT, "supabase", "migrations");
      for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
        await su.begin((tx) => tx.unsafe(readFileSync(path.join(dir, f), "utf8"))).catch((e) => {
          throw new Error(`${f}: ${e.message}`);
        });
      }
    });

    if (MUTATE) {
      // Negative control: break the two race guards and expect check 4 to fail.
      const rpcFile = path.join(PROJECT, "supabase", "migrations", "20261007000006_booking_rpc.sql");
      const mutated = readFileSync(rpcFile, "utf8").replace(/perform pg_advisory_xact_lock\([^;]+;/, "");
      ok(!mutated.includes("pg_advisory_xact_lock("), "mutation did not apply");
      await su.unsafe(mutated);
      await su`alter table public.slot_reservations drop constraint slot_reservations_slot_unique`;
      log("!! MUTATED: advisory lock removed, UNIQUE (slot_date, slot_start) dropped");
    }

    // ── helpers ────────────────────────────────────────────────────────────────
    const conns = [];
    const conn = () => {
      const c = postgres(URL, { max: 1, onnotice: () => {} });
      conns.push(c);
      return c;
    };
    const main = conn();
    /** One PostgREST-style request: role + JWT claims for the duration of a transaction. */
    const as = (c, who, fn) =>
      c.begin(async (tx) => {
        await tx.unsafe(`set local role ${who.role ?? "authenticated"}`);
        if (who.claims !== null) {
          const claims = who.claims ?? { sub: who.id, email: who.email, role: "authenticated" };
          await tx`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
        }
        if (who.topic) await tx`select set_config('realtime.topic', ${who.topic}, true)`;
        return fn(tx);
      });
    const service = { role: "service_role", claims: { role: "service_role" } };
    const anon = { role: "anon", claims: { role: "anon" } };
    /** GoTrue inserting a user (admin createUser / OTP sign-up). */
    const signUp = async (email, name) => {
      const [u] = await su`insert into auth.users (email, raw_user_meta_data) values (${email}, ${su.json(name ? { full_name: name } : {})}) returning id, email`;
      return { id: u.id, email: u.email.toLowerCase(), name };
    };
    const book = (c, who, date, start) => as(c, who, (tx) => tx`select id, slot_date::text as date, to_char(slot_start, 'HH24:MI') as start, status from public.book_slot(${date}, ${start})`).then((r) => r[0]);
    const cancel = (c, who, id) => as(c, who, (tx) => tx`select id, status, cancelled_at, cancelled_by from public.cancel_booking(${id})`).then((r) => r[0]);
    const weekFor = (c, who, from) => as(c, who, (tx) => tx`select slot_date::text as date, to_char(slot_start, 'HH24:MI') as start, mine from public.get_week_slots(${from}, ${addDays(from, 4)})`);
    const messagesFor = (date, start) =>
      su`select event, topic, private, payload from realtime.messages where payload->>'date' = ${date} and payload->>'start' = ${start} order by id`;
    /** Fires `n` calls at the same instant from separate connections. */
    async function simultaneously(calls) {
      let arrived = 0;
      let release;
      const gate = new Promise((r) => (release = r));
      const runs = calls.map(({ c, who, date, start }) =>
        as(c, who, async (tx) => {
          arrived++;
          if (arrived === calls.length) release();
          await gate;
          return tx`select id from public.book_slot(${date}, ${start})`;
        }).then(
          () => ({ ok: true }),
          (e) => ({ ok: false, code: e.message }),
        ),
      );
      return Promise.all(runs);
    }

    // ── check 1 · domain enforced by the database ─────────────────────────────
    log("\nCheck 1 · @esdi.edu.es only (database layer):");
    await t("auth.users rejects alumno@gmail.com (backstop trigger, 42501)", () => rejects(signUp("alumno@gmail.com", "Gmail Prueba"), "signup blocked"));
    for (const bad of ["x@esdi.edu.es.evil.com", "x@sub.esdi.edu.es", "a@b@esdi.edu.es", ".alumno@esdi.edu.es", "alu..mno@esdi.edu.es", "alumno@esdi.es"]) {
      await t(`auth.users rejects look-alike ${bad}`, () => rejects(signUp(bad, null), "signup blocked"));
    }
    let A, B;
    await t("alumno@esdi.edu.es accepted; profile created with name and lower-case email", async () => {
      const u = await signUp("Alumno@ESDI.edu.es", "Laia Puig Ferrer");
      const [p] = await su`select email::text, full_name from public.profiles where id = ${u.id}`;
      eq(p, { email: "alumno@esdi.edu.es", full_name: "Laia Puig Ferrer" });
    });
    await t("Auth hook (as supabase_auth_admin): gmail → 403 in Spanish, esdi → {}", async () => {
      const [r1] = await as(main, { role: "supabase_auth_admin", claims: null }, (tx) => tx`select public.hook_before_user_created(${su.json({ user: { email: "alumno@gmail.com" } })}) as r`);
      eq(r1.r, { error: { message: "Solo se admiten cuentas @esdi.edu.es.", http_code: 403 } });
      const [r2] = await as(main, { role: "supabase_auth_admin", claims: null }, (tx) => tx`select public.hook_before_user_created(${su.json({ user: { email: "alumno@esdi.edu.es" } })}) as r`);
      eq(r2.r, {});
    });
    await t("Auth hook is not callable by students", () =>
      rejects(as(main, { role: "authenticated", claims: {} }, (tx) => tx`select public.hook_before_user_created('{}'::jsonb)`), "42501"),
    );
    await t("admin allowlist (D7): an allowlisted non-student address can sign up", async () => {
      await su`insert into private.allowed_emails (email) values ('tecnica.taller@esdi.es')`;
      await signUp("tecnica.taller@esdi.es", "Clara Taller Admin");
    });

    // ── fixtures ──────────────────────────────────────────────────────────────
    A = await signUp("qa.alumna.a@esdi.edu.es", "Alba Prueba Serra");
    B = await signUp("qa.alumno.b@esdi.edu.es", "Bruno Prueba Mas");
    const C = await signUp("qa.alumna.c@esdi.edu.es", "Carla Prueba Vidal");
    const N = await signUp("qa.sin.nombre@esdi.edu.es", null);
    const cA = conn();
    const cB = conn();

    // ── check 2 · weekdays and 08–19 only ─────────────────────────────────────
    log("\nCheck 2 · Monday–Friday, 08:00–19:00, window:");
    await t("book_slot rejects Saturday, Sunday, 07:00, 19:00, 10:30 (INVALID_SLOT)", async () => {
      for (const [d, h] of [[day(W2, 5), "10:00"], [day(W2, 6), "10:00"], [day(W2, 1), "07:00"], [day(W2, 1), "19:00"], [day(W2, 1), "10:30"]]) {
        await rejects(book(main, C, d, h), "INVALID_SLOT", `${d} ${h}:`);
      }
    });
    await t("book_slot rejects past slots (SLOT_PAST) and beyond 4 weeks (OUT_OF_WINDOW)", async () => {
      await rejects(book(main, C, addDays(mondayOf(madridToday), -7), "10:00"), "SLOT_PAST");
      let far = addDays(madridToday, 29);
      while (isoDow(far) > 5) far = addDays(far, 1);
      await rejects(book(main, C, far, "10:00"), "OUT_OF_WINDOW");
    });
    await t("first (08:00) and last (18:00) slots and the last bookable day are accepted", async () => {
      const last = addDays(madridToday, 28);
      const target = isoDow(last) <= 5 ? last : day(W2, 4);
      const b1 = await book(main, C, target, "18:00");
      eq(b1.start, "18:00");
      await cancel(main, C, b1.id);
      const b2 = await book(main, C, day(W2, 4), "08:00");
      eq(b2.start, "08:00");
      await cancel(main, C, b2.id);
    });
    await t("table CHECK constraints hold even for direct (service) inserts", async () => {
      await rejects(su`insert into public.bookings (user_id, slot_date, slot_start) values (${C.id}, ${day(W2, 5)}, '10:00')`, "bookings_weekday_chk");
      await rejects(su`insert into public.bookings (user_id, slot_date, slot_start) values (${C.id}, ${day(W2, 1)}, '19:00')`, "bookings_hours_chk");
      await rejects(su`insert into public.bookings (user_id, slot_date, slot_start) values (${C.id}, ${day(W2, 1)}, '07:00')`, "bookings_hours_chk");
      await rejects(su`insert into public.bookings (user_id, slot_date, slot_start) values (${C.id}, ${day(W2, 1)}, '10:30')`, "bookings_on_the_hour_chk");
    });
    await t("auth/profile errors: NOT_AUTHENTICATED, NOT_ALLOWED, PROFILE_INCOMPLETE", async () => {
      await rejects(as(main, { claims: {} }, (tx) => tx`select public.book_slot(${day(W2, 1)}, '10:00')`), "NOT_AUTHENTICATED");
      await rejects(book(main, { id: A.id, email: "alumno@gmail.com" }, day(W2, 1), "10:00"), "NOT_ALLOWED");
      await rejects(book(main, N, day(W2, 1), "10:00"), "PROFILE_INCOMPLETE");
    });

    // ── check 3 · A books Tue 10:00, B sees it closed (data + broadcast) ──────
    log("\nCheck 3 · A books Tuesday 10:00, B sees it closed:");
    const tue = day(W2, 1);
    let aTue;
    await t("A books Tuesday 10:00", async () => {
      aTue = await book(cA, A, tue, "10:00");
      eq([aTue.date, aTue.start, aTue.status], [tue, "10:00", "confirmed"]);
    });
    await t("get_week_slots: closed for B (mine=false), mine for A; no identities exposed", async () => {
      eq((await weekFor(cB, B, W2)).find((s) => s.date === tue && s.start === "10:00"), { date: tue, start: "10:00", mine: false });
      eq((await weekFor(cA, A, W2)).find((s) => s.date === tue && s.start === "10:00"), { date: tue, start: "10:00", mine: true });
      const [fn] = await su`select proargnames from pg_proc where proname = 'get_week_slots'`;
      eq(fn.proargnames, ["p_from", "p_to", "slot_date", "slot_start", "mine"], "get_week_slots columns:");
    });
    await t("realtime broadcast on private topic 'slots' with only {date, start, action}", async () => {
      const [m] = await messagesFor(tue, "10:00");
      eq([m.event, m.topic, m.private, Object.keys(m.payload).sort()], ["slot", "slots", true, ["action", "date", "start"]]);
      eq(m.payload.action, "booked");
    });
    await t("realtime.messages RLS: allowed student on 'slots' reads; other topic or domain reads nothing", async () => {
      const seen = await as(main, { ...B, topic: "slots" }, (tx) => tx`select count(*)::int as n from realtime.messages`);
      ok(seen[0].n > 0, "B cannot read the slots topic");
      const other = await as(main, { ...B, topic: "otra" }, (tx) => tx`select count(*)::int as n from realtime.messages`);
      eq(other[0].n, 0, "other topic:");
      const gmail = await as(main, { id: B.id, email: "intruso@gmail.com", topic: "slots" }, (tx) => tx`select count(*)::int as n from realtime.messages`);
      eq(gmail[0].n, 0, "non-allowed email:");
    });
    await t("B booking the same slot gets SLOT_TAKEN", () => rejects(book(cB, B, tue, "10:00"), "SLOT_TAKEN"));

    // ── check 4 · simultaneous attempts ───────────────────────────────────────
    log("\nCheck 4 · simultaneous attempts (separate connections, released together):");
    const racers = [];
    for (let i = 0; i < 50; i++) racers.push(await signUp(`qa.race.${String(i).padStart(2, "0")}@esdi.edu.es`, `Prueba Carrera ${i}`));
    const raceConns = racers.map(() => conn());
    await t("20 head-to-head races on 20 slots: exactly one winner each, loser gets SLOT_TAKEN", async () => {
      const slots = [];
      for (let d = 0; d < 5; d++) for (const h of ["08:00", "09:00", "10:00", "11:00"]) slots.push([day(W1, d), h]);
      const outcomes = await Promise.all(
        slots.map(([date, start], i) =>
          simultaneously([
            { c: raceConns[2 * i], who: racers[2 * i], date, start },
            { c: raceConns[2 * i + 1], who: racers[2 * i + 1], date, start },
          ]),
        ),
      );
      outcomes.forEach((o, i) => {
        eq(o.filter((r) => r.ok).length, 1, `race ${i} winners:`);
        eq(o.filter((r) => !r.ok).map((r) => r.code), ["SLOT_TAKEN"], `race ${i} loser:`);
      });
      const [{ n }] = await su`select count(*)::int as n from public.slot_reservations where slot_date between ${W1} and ${day(W1, 4)} and slot_start < '12:00'`;
      eq(n, 20, "locks:");
      const [{ orphans }] = await su`select count(*)::int as orphans from public.bookings b where b.slot_date between ${W1} and ${day(W1, 4)} and b.status = 'confirmed' and not exists (select 1 from public.slot_reservations s where s.booking_id = b.id)`;
      eq(orphans, 0, "losing transactions left booking rows:");
    });
    await t("10 students at once on one slot: exactly one winner", async () => {
      const o = await simultaneously(racers.slice(40, 50).map((who, i) => ({ c: raceConns[40 + i], who, date: day(W1, 2), start: "15:00" })));
      eq(o.filter((r) => r.ok).length, 1);
      ok(o.filter((r) => !r.ok).every((r) => r.code === "SLOT_TAKEN"), JSON.stringify(o));
    });
    await t("one student, 3 tabs, same day at once: exactly 1 booked, 2 DAILY_LIMIT", async () => {
      const who = await signUp("qa.tabs.dia@esdi.edu.es", "Dani Pestañas Día");
      const cs = [conn(), conn(), conn()];
      const o = await simultaneously(["08:00", "09:00", "10:00"].map((h, i) => ({ c: cs[i], who, date: day(W2, 4), start: h })));
      eq(o.filter((r) => r.ok).length, 1);
      eq(o.filter((r) => !r.ok).map((r) => r.code), ["DAILY_LIMIT", "DAILY_LIMIT"]);
    });
    await t("one student, 3 tabs, 3 days of one week at once: exactly 2 booked, 1 WEEKLY_LIMIT", async () => {
      const who = await signUp("qa.tabs.semana@esdi.edu.es", "Wendy Pestañas Semana");
      const cs = [conn(), conn(), conn()];
      const o = await simultaneously([0, 2, 3].map((d, i) => ({ c: cs[i], who, date: day(W2, d), start: "12:00" })));
      eq(o.filter((r) => r.ok).length, 2);
      eq(o.filter((r) => !r.ok).map((r) => r.code), ["WEEKLY_LIMIT"]);
    });

    // ── check 5 · limits ──────────────────────────────────────────────────────
    log("\nCheck 5 · 1 per day, 2 per week:");
    await t("A: second slot on Tuesday → DAILY_LIMIT", () => rejects(book(cA, A, tue, "11:00"), "DAILY_LIMIT"));
    let aWed;
    await t("A: Wednesday → booked (2nd this week)", async () => {
      aWed = await book(cA, A, day(W2, 2), "10:00");
      eq(aWed.status, "confirmed");
    });
    await t("A: Thursday → WEEKLY_LIMIT", () => rejects(book(cA, A, day(W2, 3), "10:00"), "WEEKLY_LIMIT"));
    await t("A: next week is a fresh quota", async () => {
      const b = await book(cA, A, day(addDays(W2, 7), 0), "10:00");
      await cancel(cA, A, b.id);
    });

    // ── check 6 · cancelling reopens ──────────────────────────────────────────
    log("\nCheck 6 · cancelling reopens the slot:");
    let bTue;
    await t("A cancels Tuesday 10:00: status, timestamp, actor; lock removed", async () => {
      const c = await cancel(cA, A, aTue.id);
      eq([c.status, c.cancelled_by, Boolean(c.cancelled_at)], ["cancelled", "student", true]);
      const [{ n }] = await su`select count(*)::int as n from public.slot_reservations where booking_id = ${aTue.id}`;
      eq(n, 0);
    });
    await t("realtime 'released' broadcast follows", async () => {
      const ms = await messagesFor(tue, "10:00");
      eq(ms.map((m) => m.payload.action), ["booked", "released"]);
    });
    await t("B sees it free and books it", async () => {
      ok(!(await weekFor(cB, B, W2)).some((s) => s.date === tue && s.start === "10:00"), "still listed as occupied");
      bTue = await book(cB, B, tue, "10:00");
      eq(bTue.status, "confirmed");
    });
    await t("A's quota is freed too: Thursday now books", async () => {
      const b = await book(cA, A, day(W2, 3), "10:00");
      eq(b.status, "confirmed");
    });
    await t("cancel twice → ALREADY_CANCELLED; someone else's booking → NOT_FOUND", async () => {
      await rejects(cancel(cA, A, aTue.id), "ALREADY_CANCELLED");
      await rejects(cancel(cA, A, bTue.id), "NOT_FOUND");
    });
    await t("admin cancel (service role) → cancelled_by 'admin', slot reopened", async () => {
      const [c] = await as(main, service, (tx) => tx`select status, cancelled_by from public.admin_cancel_booking(${bTue.id})`);
      eq([c.status, c.cancelled_by], ["cancelled", "admin"]);
      const [{ n }] = await su`select count(*)::int as n from public.slot_reservations where slot_date = ${tue} and slot_start = '10:00'`;
      eq(n, 0);
    });
    await t("history is kept: bookings rows are never deleted", async () => {
      const rows = await su`select status::text from public.bookings where slot_date = ${tue} and slot_start = '10:00' order by created_at`;
      eq(rows.map((r) => r.status), ["cancelled", "cancelled"]);
    });

    // ── RLS and privileges ────────────────────────────────────────────────────
    log("\nRow-level security and privileges:");
    await t("students read only their own bookings", async () => {
      const rows = await as(cB, B, (tx) => tx`select user_id from public.bookings`);
      ok(rows.length > 0 && rows.every((r) => r.user_id === B.id), "B saw other users' bookings");
    });
    await t("students cannot write bookings or read the lock table directly", async () => {
      await rejects(as(cB, B, (tx) => tx`insert into public.bookings (user_id, slot_date, slot_start) values (${B.id}, ${day(W2, 4)}, '17:00')`), "42501");
      await rejects(as(cB, B, (tx) => tx`select * from public.slot_reservations`), "42501");
      await rejects(as(cB, B, (tx) => tx`update public.bookings set status = 'cancelled'`), "42501");
    });
    await t("students update only their own name, never their email", async () => {
      const mine = await as(cB, B, (tx) => tx`update public.profiles set full_name = 'Bruno Prueba Mas' where id = ${B.id} returning id`);
      eq(mine.length, 1);
      const theirs = await as(cB, B, (tx) => tx`update public.profiles set full_name = 'Hackeado' where id = ${A.id} returning id`);
      eq(theirs.length, 0);
      await rejects(as(cB, B, (tx) => tx`update public.profiles set email = 'otro@esdi.edu.es' where id = ${B.id}`), "42501");
    });
    await t("anon can call nothing; service-only RPCs are closed to students", async () => {
      await rejects(as(main, anon, (tx) => tx`select * from public.get_week_slots(${W2}, ${day(W2, 4)})`), "42501");
      await rejects(as(main, anon, (tx) => tx`select * from public.profiles`), "42501");
      for (const q of [
        (tx) => tx`select * from public.occupied_slots(${W2}, ${day(W2, 4)})`,
        (tx) => tx`select * from public.admin_cancel_booking(${aWed.id})`,
        (tx) => tx`select * from public.jobs_claim(array['excel.booking'], 1)`,
        (tx) => tx`select * from public.booking_rules_snapshot()`,
        (tx) => tx`select public.cron_configure('x', 'y')`,
      ]) {
        await rejects(as(cB, B, q), "42501");
      }
    });

    // ── check 7 (queue) · Excel/email jobs ────────────────────────────────────
    log("\nCheck 7 · Excel and email jobs (transactional outbox):");
    await t("booking enqueues excel.booking + email.booking_confirmed in the same transaction", async () => {
      const rows = await su`select kind from private.jobs where ref_id = ${aWed.id} order by kind`;
      eq(rows.map((r) => r.kind), ["email.booking_confirmed", "excel.booking"]);
    });
    await t("cancel enqueues email.booking_cancelled; pending excel job is deduplicated", async () => {
      const rows = await su`select kind, status from private.jobs where ref_id = ${aTue.id} order by kind`;
      eq(rows.map((r) => r.kind), ["email.booking_cancelled", "email.booking_confirmed", "excel.booking"]);
    });
    await t("a named profile enqueues excel.student; a nameless one does not (until named)", async () => {
      eq((await su`select count(*)::int as n from private.jobs where kind = 'excel.student' and ref_id = ${A.id}`)[0].n, 1);
      eq((await su`select count(*)::int as n from private.jobs where kind = 'excel.student' and ref_id = ${N.id}`)[0].n, 0);
      await su`update public.profiles set full_name = 'Nora Nombre Tarde' where id = ${N.id}`;
      eq((await su`select count(*)::int as n from private.jobs where kind = 'excel.student' and ref_id = ${N.id}`)[0].n, 1);
    });
    await t("worker cycle (service role): claim → fail with backoff → claim later → complete", async () => {
      const claimed = await as(main, service, (tx) => tx`select * from public.jobs_claim(array['email.booking_confirmed'], 200)`);
      ok(claimed.length > 0, "nothing claimed");
      const job = claimed.find((j) => j.ref_id === aWed.id);
      ok(job, "A's confirmation not claimed");
      await as(main, service, (tx) => tx`select public.jobs_fail(${job.id}, 'SMTP no disponible', 12)`);
      const [f] = await su`select status, attempts, run_after > now() as later, last_error from private.jobs where id = ${job.id}`;
      eq([f.status, f.attempts, f.later, f.last_error], ["pending", 1, true, "SMTP no disponible"]);
      const again = await as(main, service, (tx) => tx`select id from public.jobs_claim(array['email.booking_confirmed'], 200)`);
      ok(!again.some((j) => j.id === job.id), "claimed again before its backoff");
      await as(main, service, (tx) => tx`select public.jobs_complete(${job.id})`);
      eq((await su`select status from private.jobs where id = ${job.id}`)[0].status, "done");
      const summary = await as(main, service, (tx) => tx`select * from public.jobs_summary()`);
      ok(summary.length > 0, "empty summary");
    });
    await t("Excel lease: one worker at a time", async () => {
      const a = await as(main, service, (tx) => tx`select public.lease_acquire('excel', 'worker-1', 60) as ok`);
      const b = await as(main, service, (tx) => tx`select public.lease_acquire('excel', 'worker-2', 60) as ok`);
      eq([a[0].ok, b[0].ok], [true, false]);
    });

    // ── cron + vault ──────────────────────────────────────────────────────────
    log("\nRetry driver (pg_cron + pg_net + Vault):");
    await t("job scheduled every 5 minutes; no-op until configured", async () => {
      const [j] = await su`select schedule, command from cron.job where jobname = 'taller-jobs-runner'`;
      eq(j.schedule, "*/5 * * * *");
      await su`select private.invoke_job_runner()`;
      eq((await su`select count(*)::int as n from net.http_request_queue`)[0].n, 0);
    });
    await t("cron_configure (service role) stores secrets; runner POSTs with the bearer", async () => {
      await as(main, service, (tx) => tx`select public.cron_configure('https://taller.example/api/jobs/run', 'secreto-1')`);
      await as(main, service, (tx) => tx`select public.cron_configure('https://taller.example/api/jobs/run', 'secreto-2')`);
      eq((await su`select count(*)::int as n from vault.secrets`)[0].n, 2);
      await su`select private.invoke_job_runner()`;
      const [r] = await su`select url, headers from net.http_request_queue`;
      eq([r.url, r.headers.Authorization], ["https://taller.example/api/jobs/run", "Bearer secreto-2"]);
    });

    // ── rules parity ──────────────────────────────────────────────────────────
    await t("booking_rules_snapshot() mirrors src/config/booking.ts", async () => {
      const [r] = await as(main, service, (tx) => tx`select * from public.booking_rules_snapshot()`);
      eq({ ...r }, { timezone: "Europe/Madrid", allowed_domain: "esdi.edu.es", first_slot_hour: 8, last_slot_end_hour: 19, slot_minutes: 60, max_per_day: 1, max_per_week: 2, weeks_ahead: 4 });
    });

    // ── check 7 (file) · export what the app's loadAll() would read ───────────
    const students = await su`
      select id, full_name, email::text, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"+00:00"') as created_at
        from public.profiles where full_name is not null order by created_at`;
    const bookings = await su`
      select b.id, b.user_id, b.slot_date::text, b.slot_start::text, b.slot_end::text, b.status::text,
             to_char(b.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"+00:00"') as created_at,
             case when b.cancelled_at is null then null else to_char(b.cancelled_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"+00:00"') end as cancelled_at,
             b.cancelled_by::text, p.full_name, p.email::text
        from public.bookings b join public.profiles p on p.id = b.user_id
       order by b.slot_date, b.slot_start, b.created_at`;
    writeFileSync(path.join(OUT, "db-export.json"), JSON.stringify({ students, bookings }, null, 2));
    if (!MUTATE) {
      log(`\nCheck 7 · the .xlsx download built from this database (src/lib/excel/workbook.ts):`);
      const xlsx = path.join(OUT, "excel-desde-bd.xlsx");
      const r = spawnSync(process.execPath, [TSX, path.join(HERE, "excel-from-db.mts"), path.join(OUT, "db-export.json"), PROJECT, xlsx], { cwd: PROJECT, encoding: "utf8" });
      log((r.stdout + r.stderr).trim().replace(/^/gm, "  | "));
      const name = "Excel workbook has Registros and Reservas with every student and booking";
      results.push(r.status === 0 ? ["PASS", name] : ["FAIL", name, "see output above"]);
      log(`  ${r.status === 0 ? "✓" : "✗"} ${name} → ${path.relative(PROJECT, xlsx)}`);
    }

    await Promise.all(conns.map((c) => c.end()));
  } finally {
    await su.end();
    await pg.stop();
  }
  const failed = results.filter((r) => r[0] === "FAIL");
  log(`\n${results.length - failed.length}/${results.length} passed`);
  writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  rmSync(DATA, { recursive: true, force: true });
  return failed.length;
}

// Explicit exit: the embedded server's shutdown hooks would otherwise reset the code.
main().then((failures) => process.exit(failures ? 1 : 0), async (e) => {
  console.error("FATAL", e);
  await pg.stop().catch(() => {});
  process.exit(2);
});
