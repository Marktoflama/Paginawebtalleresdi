import ExcelJS from "exceljs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BOOKING_RULES } from "@/config/booking";
import { addDays, mondayOf, wallClock } from "@/lib/booking/time";
import { loadAll } from "@/lib/excel/data";
import { SHEETS } from "@/lib/excel/rows";
import { buildWorkbookBuffer } from "@/lib/excel/workbook";
import { adminClient, anonClient, configured, freeSlot, signedInStudent, wipeBookings, type Client } from "./helpers";

/**
 * Database-level guarantees, run against the real Supabase project in
 * .env.local (skipped when it isn't configured). Uses two dedicated test
 * students and slots in NEXT week, and cleans up after itself.
 */
describe.skipIf(!configured)("booking rules enforced by the database", () => {
  let admin: Client;
  let A: { client: Client; userId: string };
  let B: { client: Client; userId: string };
  const nextMonday = addDays(mondayOf(wallClock().date), 7);
  const [mon, tue, wed, thu] = [0, 1, 2, 3].map((i) => addDays(nextMonday, i)) as [string, string, string, string];

  beforeAll(async () => {
    admin = adminClient();
    A = await signedInStudent(admin, `qa.alumna.a@${BOOKING_RULES.allowedDomain}`, "Alba Prueba Serra");
    B = await signedInStudent(admin, `qa.alumno.b@${BOOKING_RULES.allowedDomain}`, "Bruno Prueba Mas");
    await wipeBookings(admin, [A.userId, B.userId]);
  });

  afterAll(async () => {
    if (admin) await wipeBookings(admin, [A.userId, B.userId]);
  });

  it("the database rules mirror src/config/booking.ts", async () => {
    const { data, error } = await admin.rpc("booking_rules_snapshot", {});
    expect(error).toBeNull();
    expect(data?.[0]).toEqual({
      timezone: BOOKING_RULES.timezone,
      allowed_domain: BOOKING_RULES.allowedDomain,
      first_slot_hour: BOOKING_RULES.firstSlotHour,
      last_slot_end_hour: BOOKING_RULES.lastSlotEndHour,
      slot_minutes: BOOKING_RULES.slotMinutes,
      max_per_day: BOOKING_RULES.maxPerDay,
      max_per_week: BOOKING_RULES.maxPerWeek,
      weeks_ahead: BOOKING_RULES.weeksAhead,
    });
  });

  it("rejects non-@esdi.edu.es accounts server-side (not only in the UI)", async () => {
    const created = await admin.auth.admin.createUser({ email: "alumno.qa@gmail.com", email_confirm: true });
    expect(created.error).not.toBeNull();
    const otp = await anonClient().auth.signInWithOtp({ email: "alumno.qa@gmail.com", options: { shouldCreateUser: true } });
    expect(otp.error).not.toBeNull();
  });

  it("A books a slot; B sees it closed (not mine); A sees it as mine", async () => {
    const hour = await freeSlot(admin, tue);
    const booked = await A.client.rpc("book_slot", { p_date: tue, p_start: hour });
    expect(booked.error).toBeNull();
    const forB = await B.client.rpc("get_week_slots", { p_from: nextMonday, p_to: addDays(nextMonday, 4) });
    expect(forB.data?.find((r) => r.slot_date === tue && r.slot_start.startsWith(hour))?.mine).toBe(false);
    const forA = await A.client.rpc("get_week_slots", { p_from: nextMonday, p_to: addDays(nextMonday, 4) });
    expect(forA.data?.find((r) => r.slot_date === tue && r.slot_start.startsWith(hour))?.mine).toBe(true);
  });

  it("two simultaneous attempts on one slot: exactly one succeeds", async () => {
    const hour = await freeSlot(admin, wed, ["13:00", "14:00", "15:00", "16:00"]);
    const [ra, rb] = await Promise.all([
      A.client.rpc("book_slot", { p_date: wed, p_start: hour }),
      B.client.rpc("book_slot", { p_date: wed, p_start: hour }),
    ]);
    const ok = [ra, rb].filter((r) => !r.error);
    const failed = [ra, rb].filter((r) => r.error);
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.error!.message).toBe("SLOT_TAKEN");
    const { count } = await admin.from("slot_reservations").select("*", { count: "exact", head: true }).eq("slot_date", wed).eq("slot_start", hour);
    expect(count).toBe(1);
  });

  it("enforces 1 per day and 2 per week", async () => {
    await wipeBookings(admin, [A.userId]);
    const h1 = await freeSlot(admin, mon);
    expect((await A.client.rpc("book_slot", { p_date: mon, p_start: h1 })).error).toBeNull();
    const h2 = await freeSlot(admin, mon, ["08:00", "09:00", "10:00", "11:00"]);
    expect((await A.client.rpc("book_slot", { p_date: mon, p_start: h2 })).error?.message).toBe("DAILY_LIMIT");
    const h3 = await freeSlot(admin, thu);
    expect((await A.client.rpc("book_slot", { p_date: thu, p_start: h3 })).error).toBeNull();
    const h4 = await freeSlot(admin, tue, ["08:00", "09:00", "10:00", "11:00"]);
    expect((await A.client.rpc("book_slot", { p_date: tue, p_start: h4 })).error?.message).toBe("WEEKLY_LIMIT");
  });

  it("cancelling reopens the slot for everyone", async () => {
    await wipeBookings(admin, [A.userId, B.userId]);
    const hour = await freeSlot(admin, thu, ["10:00", "11:00", "12:00"]);
    const booked = await A.client.rpc("book_slot", { p_date: thu, p_start: hour });
    expect(booked.error).toBeNull();
    expect((await B.client.rpc("book_slot", { p_date: thu, p_start: hour })).error?.message).toBe("SLOT_TAKEN");
    expect((await A.client.rpc("cancel_booking", { p_booking_id: booked.data!.id })).error).toBeNull();
    expect((await B.client.rpc("book_slot", { p_date: thu, p_start: hour })).error).toBeNull();
    const { data: row } = await admin.from("bookings").select("status, cancelled_at, cancelled_by").eq("id", booked.data!.id).single();
    expect(row).toMatchObject({ status: "cancelled", cancelled_by: "student" });
    expect(row?.cancelled_at).toBeTruthy();
  });

  it("the Excel export has both sheets with the students and every booking", async () => {
    // State left by the previous test: A's Thursday booking cancelled, B's confirmed.
    const buffer = await buildWorkbookBuffer(await loadAll(admin));
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheetRows = (name: string) => {
      const ws = wb.getWorksheet(name);
      expect(ws, name).toBeDefined();
      const rows: unknown[][] = [];
      ws!.eachRow((row) => rows.push((row.values as unknown[]).slice(1)));
      return rows;
    };

    const registros = sheetRows(SHEETS.registros.name);
    expect(registros[0]).toEqual([...SHEETS.registros.headers]);
    expect(registros.find((r) => r[1] === `qa.alumna.a@${BOOKING_RULES.allowedDomain}`)?.[0]).toBe("Alba Prueba Serra");
    expect(registros.find((r) => r[1] === `qa.alumno.b@${BOOKING_RULES.allowedDomain}`)?.[0]).toBe("Bruno Prueba Mas");

    const reservas = sheetRows(SHEETS.reservas.name);
    expect(reservas[0]).toEqual([...SHEETS.reservas.headers]);
    const forA = reservas.filter((r) => r[2] === `qa.alumna.a@${BOOKING_RULES.allowedDomain}`);
    const forB = reservas.filter((r) => r[2] === `qa.alumno.b@${BOOKING_RULES.allowedDomain}`);
    // exceljs reads date-formatted serials back as Date objects.
    expect(forA.some((r) => r[4] === "Jueves" && r[7] === "cancelada" && r[9] instanceof Date)).toBe(true);
    expect(forB.some((r) => r[4] === "Jueves" && r[7] === "confirmada" && (r[9] == null || r[9] === ""))).toBe(true);
  });

  it("rejects weekends, out-of-hours, misaligned and past slots", async () => {
    const saturday = addDays(nextMonday, 5);
    expect((await A.client.rpc("book_slot", { p_date: saturday, p_start: "10:00" })).error?.message).toBe("INVALID_SLOT");
    expect((await A.client.rpc("book_slot", { p_date: tue, p_start: "19:00" })).error?.message).toBe("INVALID_SLOT");
    expect((await A.client.rpc("book_slot", { p_date: tue, p_start: "07:00" })).error?.message).toBe("INVALID_SLOT");
    expect((await A.client.rpc("book_slot", { p_date: tue, p_start: "10:30" })).error?.message).toBe("INVALID_SLOT");
    const lastWeekMonday = addDays(mondayOf(wallClock().date), -7);
    expect((await A.client.rpc("book_slot", { p_date: lastWeekMonday, p_start: "10:00" })).error?.message).toBe("SLOT_PAST");
    const tooFar = addDays(mondayOf(addDays(wallClock().date, 7 * BOOKING_RULES.weeksAhead + 7)), 1);
    expect((await A.client.rpc("book_slot", { p_date: tooFar, p_start: "10:00" })).error?.message).toBe("OUT_OF_WINDOW");
  });

  it("row-level security isolates students", async () => {
    await wipeBookings(admin, [A.userId, B.userId]);
    const hour = await freeSlot(admin, mon, ["12:00", "13:00", "14:00"]);
    expect((await A.client.rpc("book_slot", { p_date: mon, p_start: hour })).error).toBeNull();
    const seenByB = await B.client.from("bookings").select("id, user_id");
    expect((seenByB.data ?? []).every((r) => r.user_id === B.userId)).toBe(true);
    const locks = await B.client.from("slot_reservations").select("*");
    expect(locks.data ?? []).toHaveLength(0);
    const direct = await B.client.from("bookings").insert({ user_id: B.userId, slot_date: tue, slot_start: "09:00" });
    expect(direct.error).not.toBeNull();
    const anon = await anonClient().rpc("get_week_slots", { p_from: mon, p_to: thu });
    expect(anon.error).not.toBeNull();
  });

  it("queues Excel and email jobs in the same transaction", async () => {
    const { data } = await admin.rpc("jobs_summary", {});
    const kinds = new Set((data ?? []).map((r) => r.kind));
    expect(kinds.has("excel.booking")).toBe(true);
    expect(kinds.has("email.booking_confirmed")).toBe(true);
  });
});
