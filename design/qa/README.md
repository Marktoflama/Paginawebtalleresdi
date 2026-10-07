# Phase 4 · QA report

Run on 2026-10-07 on Windows 11 with Node 24.18 and Next 16.4 (dev server), using headless Google Chrome through Playwright 1.63. The database checks ran on PostgreSQL 17.10 (embedded, through `tests/db`).

**The hosted Supabase project isn't connected yet** (no `.env.local`). So every check was run at the layers that don't need it: the browser, the server action and the real SQL. Running real Supabase Auth, Realtime and SMTP end to end needs the keys, as described under [What still needs the hosted project](#what-still-needs-the-hosted-project).

## Results

| # | Check | Result | How it was verified | Evidence |
|---|---|---|---|---|
| 1 | `alumno@gmail.com` rejected, `alumno@esdi.edu.es` accepted | **Pass (4 layers; the hook is tested as SQL, and switching it on in the dashboard is a manual step)** | **Browser:** the form shows the error and sends no request. **Server action:** rejects with JavaScript disabled. **Database:** the `auth.users` trigger rejects gmail and 6 look-alikes; the Auth hook returns 403 "Solo se admiten cuentas @esdi.edu.es."; esdi is accepted at every layer. The admin allowlist (D7) works. | `01-*.png`, `tests/e2e/access.spec.ts`, `db-checks.log` |
| 2 | No weekends, nothing outside 08–19 | **Pass** | **UI:** 5 day columns × 11 rows (08:00–19:00), 55 cells, no Saturday or Sunday at 1440. Mobile shows Lun–Vie tabs with 11 slots each. A Saturday deep link resolves to its week. The 4-week window disables "Siguiente". **DB:** `book_slot` rejects Saturday, Sunday, 07:00, 19:00, 10:30, past slots and +29 days. The CHECK constraints also block direct inserts. 08:00, 18:00 and the last bookable day are accepted. | `compare-table-grid-*.png`, `db-checks.log` |
| 3 | A books Tue 10:00 → B sees it closed in realtime | **Pass at the DB level · UI spec ready** | **DB:** A books Tuesday 10:00; `get_week_slots` returns it as closed for B (`mine=false`) and as A's. A broadcast goes to the private topic `slots` with only `{date, start, action}` (no identity). RLS lets only allowed students on that topic read it. B then gets `SLOT_TAKEN`. **UI:** `booking.spec.ts` opens two signed-in browsers and asserts B's cell changes with no reload. | `db-checks.log`; run `npm run test:e2e` once connected |
| 4 | Two simultaneous attempts → exactly one wins | **Pass** | Separate DB connections were released at the same instant: **20 head-to-head races** (each had 1 winner, and the loser got `SLOT_TAKEN` with no orphan rows), a **10-way race** (1 winner) and **one student in 3 tabs** (same day: 1 booked + 2 `DAILY_LIMIT`; same week: 2 booked + 1 `WEEKLY_LIMIT`). **Negative control:** with the UNIQUE constraint and the advisory lock removed, the same tests fail (2 winners, 10 winners, 3 bookings). | `db-checks.log`, `db-mutation-control.log` |
| 5 | Weekly and daily limits | **Pass** | **DB:** a second booking on the same day → `DAILY_LIMIT`; a third in the week → `WEEKLY_LIMIT`; the next week starts a fresh quota. **UI:** the sample board shows "Límite diario"/"Límite semanal", and those cells are disabled. | `db-checks.log`, `booking.spec.ts` |
| 6 | Cancelling reopens the slot | **Pass** | Cancelling sets the status, timestamp and actor, deletes the lock and sends a `released` broadcast. B can then book the slot, and A's quota is freed. Cancelling twice → `ALREADY_CANCELLED`; cancelling someone else's booking → `NOT_FOUND`. Admin cancel → `cancelled_by = admin`. History rows are never deleted. | `db-checks.log` |
| 7 | Excel contains the rows | **Pass (download) · Graph pending** | The `.xlsx` was built from the database state by the app's own `buildWorkbookBuffer` and read back. "Registros" has 58 rows (name, email, registration date) and "Reservas" has 31 rows (ID, name, email, date, weekday, start, end, status, created, cancelled) with 5 cancelled. The job outbox queues `excel.*` and `email.*` jobs in the booking transaction and dedupes pending jobs. The fail → backoff → complete cycle and the single-worker lease work. | `excel-desde-bd.xlsx`, `db-checks.log` |
| 8 | No horizontal scroll at 390/768/1024/1440 | **Pass (40/40)** | 9 routes plus the open menu at each width. | `tests/e2e/layout.spec.ts` |
| 9 | Animations match the spec; reduced motion disables them | **Pass (13/13)** | **M1:** zero fade frames, always exactly one shot per slot, each hold within 60 ms of the spec, an 11.3 s loop, and the pause control works. **Other M-rows:** M2 cards switch to the accent instantly (green/red/blue/yellow). M4 trail: a new image every >80 px, gone after 1.5 s + 0.4 s. M5 reveal at left 200 px, 150 px wide. M6 underline. M8 200 ms `cubic-bezier(.4,0,.2,1)`. M9 menu overlay 250 ms, content +100 ms / 300 ms / 10 px rise, no stagger; M10 close 200 ms. M11 instant hover. M12 accordion 350 ms. M14 smooth anchors. **Reduced motion:** static hero, no pause control, instant menu, no accordion transition, no smooth scroll, no image trail. | `tests/e2e/motion.spec.ts` |
| 10 | Side by side with esdi.es at 1440 and 390 | **Done** | Hero, menu, table/grid and footer. | `compare-*.png`, `raw/` |

Totals: 45 unit tests · 53 e2e passed (7 skipped until the backend is connected) · 51/51 database checks.

## Side-by-side notes (check 10)

* **Hero:** same composition (header, justified wordmark with collage cuts, display H1, lead). "TALLER" has 6 letters against ESDI's 4, so at the same width the word is shorter. This was accepted as D3.
* **Menu:** same full-screen grammar: categories with a 1 px rule, indented links, CTA column with arrows, language at the bottom right, "Cerrar". It has fewer categories because there is less content.
* **Table/grid:** ESDI's agenda grammar (1 px rules, small date type, no fills) is extended to a 5-day grid. On mobile it becomes day tabs and stacked rows, like ESDI's stacked agenda rows.
* **Footer:** the same 8-column grid (2/3/2/1), a giant wordmark with a light two-line descriptor (≈62 px at 1440) and the legal row. ESDI's partner-logo strip is omitted because there are no partners.

## Defects found in Phase 4 and fixed

1. **There was no browser-side domain check**, only the server, hook and trigger. The access form now runs `studentEmailError()` before submitting. Admins outside the domain use `/acceso?personal=1`.
2. **`/admin` answered 200 with the title "Administración"** for non-admins (the 404 UI streamed after `loading.tsx`). A layout guard now returns a real 404, and the title reads "Página no encontrada".
3. **The demo board opened a Realtime WebSocket.** It now has `useRealtimeSlots(…, enabled = false)`.
4. **Smooth scrolling also animated route changes.** Added `data-scroll-behavior="smooth"` on `<html>`, as Next recommends.

## What still needs the hosted project

These need the keys in `.env.local`; the tests are written and skip themselves until then:

* Supabase Auth sending the magic link and the code through your SMTP: `access.spec.ts` with `E2E_EMAIL_TO`.
* Realtime between two real browsers, and the UI flows for limits and cancellation: `booking.spec.ts`, with `ENABLE_DEV_LOGIN=true`.
* `npm run test:integration` against the real project, including the Excel export from `loadAll()`.
* Microsoft Graph sync to the OneDrive/SharePoint workbook (needs the app registration and "Conectar con Microsoft").
* The pg_cron → `/api/jobs/run` retry loop after deploying (`npm run cron:setup`).
