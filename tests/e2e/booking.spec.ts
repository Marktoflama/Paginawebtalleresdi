import { expect, test, type Browser, type Page } from "@playwright/test";
import { adminClient, configured, freeSlot, wipeBookings, type Client } from "../integration/helpers";

/**
 * Checks 2, 3, 5 and 6 through the real UI, against the Supabase project in
 * .env.local. Signs in through the dev-only /api/dev/login route, so it needs
 * ENABLE_DEV_LOGIN=true in .env.local. Uses NEXT week (always bookable) and
 * two dedicated test students; cleans up before and after.
 */
const ready = configured && process.env.ENABLE_DEV_LOGIN === "true";
test.skip(!ready, "Needs Supabase keys in .env.local and ENABLE_DEV_LOGIN=true");
test.describe.configure({ mode: "serial" });

const A = { email: "qa.e2e.a@esdi.edu.es", name: "Aina Prueba Roca" };
const B = { email: "qa.e2e.b@esdi.edu.es", name: "Biel Prueba Coll" };

/** Today's date in Madrid, then plain UTC date arithmetic (same approach as src/lib/booking/time.ts). */
function madridToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const today = madridToday();
const isoDow = ((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
const nextMonday = addDays(today, 8 - isoDow);
const [tue, wed, thu] = [1, 2, 3].map((i) => addDays(nextMonday, i)) as [string, string, string];
const week = `/reservar?semana=${nextMonday}`;

const cell = (page: Page, date: string, start: string) => page.locator(`[data-slot="${date}T${start}"]`);

async function signIn(browser: Browser, who: { email: string; name: string }) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const q = new URLSearchParams({ as: who.email, name: who.name, next: week });
  await page.goto(`/api/dev/login?${q}`);
  await expect(page).toHaveURL(new RegExp(`/reservar\\?semana=${nextMonday}`));
  await expect(page.getByRole("grid")).toBeVisible();
  return { context, page };
}

/** Select → confirm dialog (date, time, name) → success, as in the brief. */
async function book(page: Page, who: { name: string }, date: string, start: string) {
  await cell(page, date, start).click();
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(start);
  await expect(dialog).toContainText(who.name);
  await dialog.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.getByText(/^Reserva confirmada:/)).toBeVisible();
  await expect(cell(page, date, start)).toHaveAttribute("data-state", "mine");
}

let admin: Client;
let userIds: string[] = [];
let hour = "10:00";

test.beforeAll(async () => {
  admin = adminClient();
  // Make sure both test users exist before looking them up (dev login creates them too).
  for (const who of [A, B]) {
    const created = await admin.auth.admin.createUser({ email: who.email, email_confirm: true, user_metadata: { full_name: who.name } });
    if (created.error && !/already/i.test(created.error.message)) throw created.error;
  }
  const { data } = await admin.from("profiles").select("id").in("email", [A.email, B.email]);
  userIds = (data ?? []).map((r) => r.id);
  await wipeBookings(admin, userIds);
  // The brief's scenario is Tuesday 10:00; fall back to another hour if seed data holds it.
  hour = await freeSlot(admin, tue, ["10:00", "11:00", "12:00", "16:00"]);
});

test.afterAll(async () => {
  if (admin) await wipeBookings(admin, userIds);
});

test("check 2: the grid shows Monday to Friday, 08:00–19:00 only", async ({ browser }) => {
  const { context, page } = await signIn(browser, A);
  const headers = await page.locator("[role=grid] thead th").allTextContents();
  expect(headers).toHaveLength(6); // "Hora" + Mon–Fri
  expect(headers.slice(1).map((h) => h.slice(0, 3))).toEqual(["Lun", "Mar", "Mié", "Jue", "Vie"]);
  const rows = await page.locator("[role=grid] tbody th").allTextContents();
  expect(rows[0]).toMatch(/^08:00/);
  expect(rows.at(-1)).toMatch(/19:00$/);
  expect(rows).toHaveLength(11);
  await context.close();
});

test("checks 3 and 6: A books, B sees it close in realtime; A cancels, B sees it reopen", async ({ browser }) => {
  const a = await signIn(browser, A);
  const b = await signIn(browser, B);
  let bNavigations = 0;
  b.page.on("framenavigated", (f) => {
    if (f === b.page.mainFrame()) bNavigations++;
  });
  await expect(cell(b.page, tue, hour)).toHaveAttribute("data-state", "available");

  await book(a.page, A, tue, hour);
  // B never reloads: the change arrives over Supabase Realtime.
  await expect(cell(b.page, tue, hour)).toHaveAttribute("data-state", "closed", { timeout: 8_000 });
  await expect(cell(b.page, tue, hour)).toHaveAttribute("aria-label", /ocupada\.$/);
  expect(bNavigations).toBe(0);

  await a.page.goto("/mis-reservas");
  await a.page.getByRole("button", { name: new RegExp(`Cancelar la reserva del .* a las ${hour}`) }).click();
  const dialog = a.page.locator("dialog[open]");
  await dialog.getByRole("button", { name: "Cancelar reserva" }).click();
  await expect(a.page.locator("dialog[open]")).toHaveCount(0);

  await expect(cell(b.page, tue, hour)).toHaveAttribute("data-state", "available", { timeout: 8_000 });
  expect(bNavigations).toBe(0);
  await a.context.close();
  await b.context.close();
});

test("check 5: one booking per day and two per week, shown in the grid", async ({ browser }) => {
  await wipeBookings(admin, userIds);
  const a = await signIn(browser, A);
  await book(a.page, A, tue, hour);
  // Same day: every other free slot on Tuesday is now "Límite diario".
  const otherHour = hour === "10:00" ? "11:00" : "10:00";
  await expect(cell(a.page, tue, otherHour)).toHaveAttribute("aria-label", /ya tienes una reserva este día/);
  await expect(cell(a.page, tue, otherHour)).toHaveAttribute("aria-disabled", "true");

  const wedHour = await freeSlot(admin, wed, ["12:00", "13:00", "14:00", "15:00"]);
  await book(a.page, A, wed, wedHour);
  // Third booking in the week: Thursday is blocked by the weekly limit.
  const thuHour = await freeSlot(admin, thu, ["12:00", "13:00", "14:00", "15:00"]);
  await expect(cell(a.page, thu, thuHour)).toHaveAttribute("aria-label", /máximo de reservas esta semana/);
  await cell(a.page, thu, thuHour).click();
  await expect(a.page.locator("dialog[open]")).toHaveCount(0);
  await a.context.close();
});
