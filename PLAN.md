# TALLER: Phase 1 plan

Workshop booking web app for ESDI students, visually built on the measured ESDI system in [`DESIGN.md`](DESIGN.md) (evidence in [`design/esdi-analysis.md`](design/esdi-analysis.md)).
Status: **awaiting approval**. Nothing below has been built yet.

Defaults taken from Phase 0 (you approved the analysis without choosing, so I applied my recommendations; change any of them before Phase 2):

| Phase 0 decision | Applied default |
|---|---|
| Motion | **Faithful**: no scroll animation. ScrollTrigger only pauses the hero loop when it's off-screen |
| Slot colours | **Option A**: hover = weekday accent (instant), mine = black/white inversion, closed = `#e2e4e7` + hatch + strikethrough, past = muted, error = red |
| Hero lockup | **Keep ESDI's ratios** (gap 4.1 % of width, cap 72.7 % of box height); the box aspect follows the word "TALLER" (≈ 3.7:1) |

---

## 1. Facts verified while planning (they change the brief)

| # | Finding | Source | Consequence |
|---|---|---|---|
| F1 | **No Docker and no WSL on this PC**, so the Supabase local stack (`supabase start`) can't run | `docker`/`wsl` checks | Develop and QA against a **hosted Supabase project** (free tier), or you install Docker Desktop + WSL2 (§10, decision D4) |
| F2 | Microsoft Graph Excel **workbook** endpoints (`tables/{t}/rows/add`, range update…) list **Application permissions: "Not supported"**; only *delegated* `Files.ReadWrite` | [learn.microsoft.com › tablerowcollection-add](https://learn.microsoft.com/en-us/graph/api/tablerowcollection-add?view=graph-rest-1.0), [range-update](https://learn.microsoft.com/en-us/graph/api/range-update?view=graph-rest-1.0) | `MS_CLIENT_SECRET` (client-credentials, app-only) **can't** officially write table rows. Needs a one-time delegated "Conectar con Microsoft" sign-in, or a different write strategy (§7, decision D5) |
| F3 | Supabase's built-in email sender only delivers to **project team members** and is limited to ~2 emails/h | [supabase.com › auth-smtp](https://supabase.com/docs/guides/auth/auth-smtp) | **Custom SMTP is mandatory** before real students can receive magic links. QA bypasses email with a dev-only login (§5.4) |
| F4 | Vercel Hobby cron runs **once per day** at most | [vercel.com › cron usage](https://vercel.com/docs/cron-jobs/usage-and-pricing) | Excel/email retries are driven by **Supabase `pg_cron` + `pg_net`** every 5 min, plus an immediate `after()` attempt |
| F5 | Supabase recommends **Broadcast from Database** (`realtime.send`) over Postgres Changes for scale and security | [supabase.com › subscribing to database changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) | Realtime "slot closed" events are broadcast **without personal data** on a private channel |
| F6 | **Before User Created** auth hook exists (Postgres function, returns `{error:{http_code:403,…}}`) | [supabase.com › before-user-created-hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook) | Server-side domain enforcement at signup (plus a trigger backstop, §5.1) |
| F7 | Next.js 16: `middleware.ts` → **`proxy.ts`** (Node runtime by default) | [Next 16 notes](https://auth0.com/blog/whats-new-nextjs-16/) | Session refresh lives in `src/proxy.ts` |
| F8 | Supabase keys: legacy `anon` / `service_role` are deprecated by end of 2026, replaced by **`sb_publishable_…` / `sb_secret_…`** | [supabase.com › new API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys.md) | Env vars use the new names |
| F9 | Since the Webflow acquisition, **every GSAP plugin is free** (CustomEase, ScrollTrigger…) | GSAP docs | Use `CustomEase` to reproduce ESDI's exact CSS curves |

Current versions: Next 16.4 · React 19.3 · Tailwind 4.3 · @supabase/supabase-js 2.117 · @supabase/ssr 0.12 · GSAP 3.15 · exceljs 4.4 · zod 4.6 · date-fns 4.4 + @date-fns/tz · Vitest 5 · Playwright 1.63. Node 24 is installed.

---

## 2. Architecture

```
Browser ── Next.js 16 App Router (Vercel) ───────────────── Supabase (hosted)
  │  RSC pages + Server Actions                                ├─ Auth: email OTP / magic link
  │  GSAP (client islands only)                                │    ├─ Before-User-Created hook (domain)
  │  Supabase Realtime (private channel "slots") ◄──broadcast──┤    └─ trigger backstop on auth.users
  │                                                            ├─ Postgres
  │  Server Action book() ──► rpc book_slot() ─────────────────┤    ├─ bookings (history) + slot_reservations (UNIQUE lock)
  │                              │ same transaction            │    ├─ RLS everywhere, writes only via SECURITY DEFINER RPCs
  │                              └─► private.jobs (outbox)     │    └─ realtime.send() trigger (no PII)
  │  after(): run jobs ─► Microsoft Graph (Excel) + SMTP       ├─ pg_cron (*/5) ─pg_net─► /api/jobs/run (retries)
  │  /admin/excel ─► exceljs .xlsx from DB (always works)      └─ Vault (cron URL + secret)
```

**Principles**
1. **The database is the authority.** Every rule that matters (domain, one student per slot, limits, past or out-of-window slots) is enforced in Postgres, and the client and server checks only improve UX. The publishable key is public, so anything not enforced in the DB can be bypassed with curl.
2. **Writes go through one door.** Students have no direct `INSERT`, `UPDATE` or `DELETE` on booking tables. They call `book_slot` and `cancel_booking` (RPC, `SECURITY DEFINER`, `search_path=''`).
3. **Side effects never block a booking.** Excel and email go through a transactional **outbox** written in the same transaction, then get processed asynchronously and retried.

---

## 3. Data model

### 3.1 Tables

```sql
-- public.profiles: one per auth user (created by an AFTER INSERT trigger on auth.users)
id          uuid primary key references auth.users on delete cascade
email       citext not null unique
full_name   text   check (char_length(full_name) between 2 and 120)   -- null until onboarding
created_at  timestamptz not null default now()        -- "registration date" in Excel
updated_at  timestamptz not null default now()

-- public.bookings: immutable record of every booking (never deleted)
id            uuid primary key default gen_random_uuid()
user_id       uuid not null references public.profiles(id)
slot_date     date not null                 -- Europe/Madrid wall-clock date
slot_start    time not null                 -- 08:00 … 18:00
slot_end      time generated always as (slot_start + interval '1 hour') stored
status        public.booking_status not null default 'confirmed'   -- enum: confirmed | cancelled
created_at    timestamptz not null default now()
cancelled_at  timestamptz
cancelled_by  public.cancel_actor              -- enum: student | admin
check (extract(isodow from slot_date) between 1 and 5)
check (date_part('minute', slot_start) = 0 and date_part('second', slot_start) = 0)
check ((status = 'cancelled') = (cancelled_at is not null))

-- public.slot_reservations: the LOCK. A row exists ⇔ the slot is closed
booking_id  uuid primary key references public.bookings(id) on delete cascade
slot_date   date not null
slot_start  time not null
user_id     uuid not null
created_at  timestamptz not null default now()
constraint slot_reservations_slot_unique UNIQUE (slot_date, slot_start)   -- ← the required constraint

-- private.* (schema NOT exposed through the API)
private.booking_rules   (single row: timezone, first_hour 8, last_end_hour 19, slot_minutes 60,
                          max_per_day 1, max_per_week 2, weeks_ahead 4)
private.allowed_emails  (email citext pk, reason text)   -- extra sign-in allowlist (admins outside the domain)
private.jobs            (outbox: id, kind, ref_id, status, attempts, run_after, last_error, timestamps;
                          partial unique (kind, ref_id) where status in ('pending','processing'))
private.worker_leases   (name pk, holder, leased_until)   -- single-worker lease for the Excel writer
private.integrations    (provider pk, account_email, refresh_token_enc, iv, tag, scopes,
                          connected_at, last_ok_at, last_error)  -- delegated Graph token (AES-256-GCM)
```

**Why two booking tables (alternatives considered)**

| Option | One student per slot | Cancel reopens slot | History for Excel | Verdict |
|---|---|---|---|---|
| A. single `bookings` + **partial** unique index `WHERE status='confirmed'` | ✔ | ✔ | ✔ | Works, but it's a unique *index*, not the UNIQUE *constraint* the brief asks for, and every query must remember the status filter |
| B. single `bookings`, delete on cancel + an event log | ✔ literal | ✔ | Split across two tables | The Excel row's "current truth" for a cancelled booking would live only in the log |
| **C. `bookings` (history) + `slot_reservations` (lock, literal `UNIQUE (slot_date, slot_start)`)** | ✔ **literal** | ✔ (delete the lock row) | ✔ one row per booking | **Chosen.** The lock table is also the only table that broadcasts realtime events, so nothing personal leaks |

### 3.2 RPCs (the only write path for students)

| Function | Security | Does |
|---|---|---|
| `book_slot(p_date date, p_start time) → bookings` | definer | Checks the caller's email domain and that the profile is complete. Validates weekday, hour range and minute = 0, rejects past slots (start ≤ now in Madrid) and slots beyond today + 28 days. Takes a **per-user lock** (`pg_advisory_xact_lock(hashtextextended(uid::text,0))`) so the two limit checks are race-free, then counts confirmed bookings that day (≤ 1) and that ISO week (≤ 2). Inserts `bookings` and `slot_reservations`; a `unique_violation` on the lock becomes `SLOT_TAKEN`. Enqueues `excel.booking` and `email.booking_confirmed` |
| `cancel_booking(p_id uuid)` | definer | Owner only, future only. Sets `status='cancelled'` and `cancelled_at`, deletes the lock (which reopens the slot), enqueues `excel.booking` and `email.booking_cancelled` |
| `get_week_slots(p_from date, p_to date)` | definer, stable | Returns `(slot_date, slot_start, mine boolean)` for occupied slots. **No other students' identities.** |
| `admin_*` | service key only | Called by server code after an `ADMIN_EMAILS` check |

Errors are raised as `P0001` with stable keys (`SLOT_TAKEN`, `DAILY_LIMIT`, `WEEKLY_LIMIT`, `SLOT_PAST`, `OUT_OF_WINDOW`, `INVALID_SLOT`, `NOT_ALLOWED`, `PROFILE_INCOMPLETE`) and mapped to Spanish copy in `lib/booking/errors.ts`.

**Race analysis.** Two students booking the same slot: both transactions insert into `slot_reservations`. The second blocks on the unique index until the first commits, then fails with `23505`. Exactly one succeeds, and the loser gets a clear message and a refreshed grid. One student in two tabs booking two slots on the same day: the advisory lock serialises them, and the second count (READ COMMITTED, new snapshot) sees the first booking and fails with `DAILY_LIMIT`.

### 3.3 Row-level security

| Table | Student | Admin |
|---|---|---|
| `profiles` | select own; update own `full_name` | via service key |
| `bookings` | select own; **no writes** | via service key |
| `slot_reservations` | **no access** (read through `get_week_slots`) | via service key |
| `private.*` | not exposed | service key |
| `realtime.messages` | `select` where `realtime.topic() = 'slots'` and the email domain is allowed | — |

Every student-facing policy and RPC also checks `private.is_allowed_email(auth.jwt()->>'email')`. So even a user created by hand in the dashboard with another domain can't read or book.

### 3.4 Config constants (one meaning, two runtimes)

`src/config/booking.ts` is what you edit (`TIMEZONE='Europe/Madrid'`, `WEEKDAYS=[1..5]`, `FIRST_SLOT_HOUR=8`, `LAST_SLOT_END_HOUR=19`, `SLOT_MINUTES=60`, `MAX_PER_DAY=1`, `MAX_PER_WEEK=2`, `WEEKS_AHEAD=4`, `ALLOWED_DOMAIN='esdi.edu.es'`). The migration seeds `private.booking_rules` with the same values for the DB to enforce, and an integration test **fails if the two drift**. Rejected alternative: reading rules from env at runtime, because the DB can't see Vercel env and a client-supplied value would be trusted wrongly.

"Bookable up to 4 weeks ahead" is defined as **slot date ≤ today (Madrid) + 28 days**. Week navigation offers the current week plus the next four.

---

## 4. Time handling

* Slots are stored as **Madrid wall-clock** `date` + `time`, as the brief asks. "Now" is always evaluated as `now() at time zone 'Europe/Madrid'` in SQL, and with `TZDate` (`@date-fns/tz`) in TypeScript, so the server's time zone and the browser's never matter.
* DST changes happen at 02:00–03:00 on Sundays, so they can never touch a weekday 08:00–19:00 slot. Unit tests still cover the last week of March and of October.
* Week identity is the ISO date of its Monday (`?semana=2026-10-12`), which gives shareable, server-rendered URLs.

---

## 5. Authentication

### 5.1 Domain restriction: four layers

1. **Client:** a zod schema (`lib/auth/domain.ts`) trims, lower-cases and splits on the last `@`, then requires domain `=== 'esdi.edu.es'`. That rejects `x@esdi.edu.es.evil.com` and `x@sub.esdi.edu.es`. Errors are inline in Spanish.
2. **Server Action:** the same schema runs before `signInWithOtp`.
3. **Before User Created hook** (`public.hook_restrict_signup`): returns a 403 "Solo se admiten cuentas @esdi.edu.es" unless the email is in `private.allowed_emails`. It has to be enabled once in the dashboard (Auth → Hooks), which is a manual step.
4. **Backstop:** a `BEFORE INSERT` trigger on `auth.users` raises if the domain isn't allowed. It lives in a migration, so enforcement holds **even if step 3 was never enabled**.

### 5.2 Passwordless flow

`/acceso` asks only for the email (no account enumeration). The server action calls `signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo } })`. The email template (ESDI-styled, Spanish) contains:
* a **link to `/auth/confirmar?token_hash=…`**, which shows an "ENTRAR" button and verifies on **POST**, not on GET. Microsoft 365 *Safe Links* pre-fetches links in school mailboxes and would otherwise burn the one-time token (likely here, since @esdi.edu.es is probably Microsoft 365).
* a **6-digit code** for opening the email on another device (`/acceso/codigo`).

After verification, if `profiles.full_name` is empty the student goes to `/bienvenida`, which asks for "Nombre y apellidos" before they can book. Completing it enqueues `excel.student`, which produces the "Registros" row.

### 5.3 Admins

`ADMIN_EMAILS` (comma-separated env) is the single source of authorisation. `/admin` and every admin action check it server-side, then use the secret key. If an admin address isn't @esdi.edu.es, `npm run admins:sync` copies `ADMIN_EMAILS` into `private.allowed_emails` so that person can sign in (decision D7).

### 5.4 Testing without email (dev only)

`/api/dev/login?as=alumno1@esdi.edu.es` uses `auth.admin.generateLink` to start a session with no email sent. Playwright uses it for students A and B. It's guarded three ways: `ENABLE_DEV_LOGIN=true` **and** `NODE_ENV !== 'production'` **and** a localhost host. The route also isn't compiled into production builds (build-time constant).

---

## 6. Routes & pages (UI copy in Spain Spanish)

| Route | Type | Content (ESDI pattern) |
|---|---|---|
| `/` | RSC + client islands | Hero "TALLER" lockup (M1) · h1 "RESERVAS" (display-xxl) · lead sentence · **Cómo funciona** (4 feature cards, accent hover M2) · **Normas** (label + ruled list, optional image trail M4) · **Próximas franjas libres** (agenda table, live data, "Reservar" links) · **Preguntas frecuentes** (accordion) · footer |
| `/acceso` | RSC + Server Action | display-xxl "ACCESO" · underline email input · outline "ENVIAR" · status row |
| `/acceso/codigo` | idem | 6-digit code entry |
| `/auth/confirmar` | Route handler (GET page, POST verify) | Safe-Links-proof magic link |
| `/bienvenida` | RSC + action | Name onboarding (required before booking) |
| `/reservar?semana=` | RSC (initial state) + client grid | Week grid Mon–Fri × 11 rows, week nav ← →, legend, confirm dialog, realtime; mobile: day tabs + single-day rows |
| `/mis-reservas` | RSC + actions | Agenda table: Fecha · Franja · "Cancelar" (confirm dialog); past bookings below, muted |
| `/admin?semana=` | RSC + actions (allowlist) | All bookings (agenda table) with week filter + "Todas", cancel any, **Excel panel** (Microsoft connection status, queue counts, "Sincronizar ahora", "Reconstruir Excel", "Descargar .xlsx") |
| `/admin/excel` | Route handler | `.xlsx` generated with exceljs from the DB |
| `/api/jobs/run` | Route handler (Bearer `CRON_SECRET`) | Outbox worker (pg_cron target) |
| `/api/integraciones/microsoft/{conectar,callback}` | Route handlers (admin) | Delegated OAuth (auth code + PKCE) if D5 = A |
| `/privacidad` | Static | GDPR notice (we store students' names and emails, in Excel too) |
| `/api/dev/login` | Dev only | §5.4 |

The **full-screen menu overlay** (header "Menú") lists Inicio · Reservar · Mis reservas · Admin (admins only) as display-md headings with 1 px rules. The CTA column holds "Reservar franja →" and "Normas →". "Salir" sits bottom-right where ESDI has the language links. The language switcher is shown as a static "ES" (a single language; there's no Catalan or English content to switch to). Decision: keep ESDI's header silhouette without a fake dropdown.

---

## 7. Excel sync

### 7.1 Workbook contract

| Sheet / table | Columns (header text in Spanish) | Key |
|---|---|---|
| **Registros** | Nombre · Email · Fecha de registro | Email |
| **Reservas** | ID reserva · Nombre · Email · Fecha · Día · Inicio · Fin · Estado (`confirmada` / `cancelada`) · Creada · Cancelada | ID reserva |

Dates are written as real Excel dates in Madrid local time. One shared row builder (`lib/excel/rows.ts`) feeds **both** Graph and exceljs, so the two outputs can never diverge.

### 7.2 Pipeline (applies to both D5 options)

1. `book_slot` / `cancel_booking` / profile completion insert a job (`excel.booking:{id}`, `excel.student:{uid}`) **in the same transaction**. A booking can't commit without its job, and a failure can never roll back the booking.
2. The server action calls `after(() => runJobs())`, so the first attempt starts milliseconds after the response.
3. `pg_cron` runs every 5 min and `net.http_post` calls `/api/jobs/run` with `CRON_SECRET` taken from Vault. That covers retries even when nobody is using the app.
4. The worker takes the **`excel` lease** (one writer at a time, which prevents duplicate rows), claims jobs with `FOR UPDATE SKIP LOCKED`, and **re-reads the current DB state** of each booking or student, so jobs are idempotent and order-independent. On failure it backs off exponentially (1, 2, 4… up to 60 min, max 12 attempts), then marks the job `failed`. Failed jobs are visible in `/admin` with a retry button. Every failure is logged with its Graph request id.
5. "Reconstruir Excel" rewrites both tables from the DB (repair tool).

### 7.3 Decision D5: how to write to OneDrive/SharePoint

| | **A. Delegated "Conectar con Microsoft" (recommended)** | B. App-only, whole-file upload |
|---|---|---|
| Auth | One-time admin sign-in (auth code + PKCE, scopes `offline_access Files.ReadWrite[.All]`). Refresh token stored **AES-256-GCM encrypted** (`MS_TOKEN_ENCRYPTION_KEY`) | Client credentials (`MS_CLIENT_SECRET`) as in the brief; `Files.ReadWrite.All` or `Sites.Selected` app permission |
| Write | **Excel table endpoints**: find the row by key in the key column → `PATCH rows/itemAt(index=n)` or `POST rows/add`, inside a workbook session | Regenerate the full `.xlsx` with exceljs, then `PUT /drives/{d}/items/{f}/content` |
| Officially supported | ✔ | ✔ |
| Matches the brief | ✔ "append/update rows via table endpoints" | ✘ (no table endpoints) |
| Manual edits in the file (notes, colours, extra columns) | **Preserved** | **Overwritten** on every sync |
| Fragility | Refresh token can be revoked (password reset, conditional access, 90 days unused). The admin panel shows status and "Reconectar" | File locked while open in desktop Excel causes 423, which the retry handles |
| Tenant needs | Admin consent may be required by the university for `Files.ReadWrite.All` | Admin consent for an app permission (usually harder to obtain) |

Not chosen: calling the workbook API with an app-only token anyway. It's reported to work on some tenants, but Microsoft lists it as unsupported, so it could break at any time.

Either way, **if Graph isn't configured or connected, nothing breaks**. Jobs stay `pending`, and `/admin/excel` always downloads an up-to-date `.xlsx` (the "works out of the box" fallback). `npm run excel:template` produces the empty workbook (both sheets with real Excel *tables*) to upload to OneDrive, which provides `MS_DRIVE_ID`/`MS_FILE_ID`.

---

## 8. Email

* **Auth emails** (magic link + code) are sent by Supabase Auth through **custom SMTP** (F3), with an ESDI-styled template in `supabase/templates/`.
* **Booking confirmation** (and cancellation) is sent by the outbox worker through **nodemailer SMTP**, ideally the same SMTP account. It includes a plain-text part and an `.ics` attachment (Europe/Madrid `VTIMEZONE`) so students can add the slot to their calendar.
* `EMAIL_TRANSPORT=console` (the default in dev) writes the emails as `.eml` files to `.mail/` so QA can assert on them without a provider.

---

## 9. Front end

### 9.1 Stack choices

| Concern | Choice | Why / alternatives |
|---|---|---|
| Styling | Tailwind v4 `@theme` tokens generated from `DESIGN.md` (colours, fonts, the `clamp()` scale as CSS vars, `@utility text-display-xxl` …) | A 1:1 token mirror. CSS-in-JS rejected (RSC friction) |
| Fonts | `next/font/google`: Barlow Condensed 700, Roboto Condensed 900, Inter Tight 300/400 (self-hosted at build, `display: swap`, `adjustFontFallback`) | Phase 0 metric study |
| Motion | GSAP 3.15 + `@gsap/react` (`useGSAP`), `CustomEase` (`std .4,0,.2,1` · `out 0,0,.58,1` · `in .42,0,1,1`), `ScrollTrigger` (hero pause only), everything inside `gsap.matchMedia()` | ESDI's exact curves; reduced-motion branch for every effect |
| Forms | Server Actions + `useActionState`, zod shared client/server | Progressive enhancement: login works without JS |
| Dialogs | Native `<dialog>` + `showModal()` (focus trap, Escape and `inert` for free) animated with GSAP | Fixes ESDI weak point A7 |
| Dates | date-fns 4 + `@date-fns/tz` | Small, DST-correct |
| Tests | Vitest (unit + DB integration), Playwright (e2e + visual comparison) | Phase 4 |

### 9.2 Component map (ESDI → TALLER)

| ESDI component (DESIGN.md) | TALLER component | Notes |
|---|---|---|
| `site-header` | `SiteHeader` | `Wordmark` "TALLER" (Roboto Condensed 900, cap ≈ 32 px) · "Menú" · "ES" |
| `menu-overlay`, `menu-heading`, `menu-sublink`, `menu-cta-link` | `MenuOverlay` | `<dialog>`; GSAP M9/M10; → internal / ↗ external |
| `hero-lockup` + `hero-image-slot` (M1) | `HeroLockup` | SVG glyph layers + images inserted **between** glyphs; GSAP zero-duration cuts; pause/play control (WCAG 2.2.2) |
| `page-title` / `section-subtitle` / `section-rule` | `PageTitle`, `SectionTitle`, `Rule` | vw-locked display, −0.75 vw optical shift |
| `lead-paragraph`, `link-inline`, `link-reveal` | `Lead`, `TextLink` (variant `inline` / `reveal`) | Inverse underline convention |
| `feature-card` (+ `-hover-1…4`) | `FeatureCards` ("Cómo funciona") | Instant accent cycle, real `<a>` |
| `ruled-list` (awards) | `RuledList` ("Normas") + optional `ImageTrail` (M4) | Trail images are generated placeholders |
| `agenda-table` | `AgendaTable` (home "Próximas franjas", Mis reservas, Admin) | Real `<th scope>`, `<time datetime>` |
| `agenda-table` (as a grid) | `WeekGrid`, `DayTabs`, `SlotCell`, `WeekNav`, `Legend` | §9.3 |
| `button-outline` | `Button` | The only button; invert in 200 ms |
| `text-input`, `form-label`, `checkbox` | `Field`, `TextInput`, `OtpInput` | Underline inputs, glued `*` |
| `accordion-row` | `Accordion` (FAQ) | `grid-template-rows` 0fr→1fr in 350 ms std |
| `ex-dialog` | `ConfirmDialog` | Full-screen white overlay (menu grammar): display-lg "CONFIRMAR RESERVA", ruled key/value list (Fecha · Hora · Nombre), "CONFIRMAR" + "Volver" |
| `ex-status-row` | `StatusRow` (`aria-live`) | Accent fill + black text, never toast cards |
| `footer`, `footer-wordmark`, `footer-legal` | `SiteFooter` | 8-col grid → 2-col; giant "TALLER" + light descriptor "RESERVA DE / TALLERES"; legal row |

The ESDI gallery and news patterns aren't used: there's no real content for them, and inventing filler would fail the anti-generic review.

### 9.3 Booking grid behaviour

* **Desktop/tablet (≥ 768):** a `<table>` with a `<caption>` (week label). `th scope="col"` = "LUN 13 OCT"; `th scope="row"` = "08:00–09:00" (tabular numerals). Each cell is a `SlotCell`:
  * `available`: a `<button>` (≥ 44 px tall) with an `aria-label` such as "Martes 14 de octubre, 10:00 a 11:00, disponible"
  * `mine`, `closed`, `past`: non-interactive (`aria-disabled`), with the state also in text (never colour only): "TU RESERVA", "Ocupado" (strikethrough + hatch), "—"
  * **Keyboard:** roving tabindex, arrow keys move between cells, Home/End jump within a row, PgUp/PgDn change week, Enter/Space opens the dialog
* **Mobile (< 768):** day tabs (`role=tablist`, arrow keys), then the 11 rows of the selected day, stacked like ESDI's mobile agenda rows.
* **Booking flow:** select, then `ConfirmDialog`, then the server action. Success: the cell **cuts** to `mine`, a green status row "Reserva confirmada: martes 14 oct, 10:00–11:00. Te hemos enviado un correo." appears, and focus returns to the cell. Race lost: the cell cuts to red for 600 ms then to `closed`, a red status row "Otra persona ha reservado esta franja hace un momento. Elige otra.", and the grid re-syncs.
* **Realtime:** a private channel `slots`. The DB trigger on `slot_reservations` runs `realtime.send({date,start,action}, 'slot', 'slots', true)`. On an event for the visible week the client applies an instant cut, then refetches `get_week_slots` (debounced 150 ms) to settle mine-versus-closed. A polite `aria-live` region announces "La franja del martes 10:00 se acaba de ocupar". On reconnect it refetches.
* Limits are shown up front (the "2 de 2 reservas esta semana" counter, and slots on a day you've already booked are marked "Límite diario"), so students rarely hit a server rejection.

### 9.4 Motion plan (maps to DESIGN.md §Motion)

| ID | Where | Implementation | Reduced motion |
|---|---|---|---|
| M1 | Home hero | `gsap.timeline({repeat:-1})`, ≈ 11.3 s, two slot tracks offset ≈ 1 s, **`tl.set()` only** (hard cuts) for visibility, position, size and z between glyph `<g>` layers. `ScrollTrigger.create({onToggle})` pauses it off-screen. "Pausar / Reanudar" control | One static composition, no timeline |
| M2, M6, M7, M11 | Cards, links, menu hovers | CSS state, **no transition** | identical |
| M4 | "Normas" image trail (optional) | ESDI algorithm (> 80 px travel, scale 0.6–1.1, ±30°, hold 1.5 s, out 0.4 s `power2.inOut`), pointer-only (`hover:hover`), pooled DOM nodes | disabled |
| M8 | Button | CSS `transition: background-color,color 200ms var(--ease-std)` | instant |
| M9 / M10 | Menu + ConfirmDialog | GSAP: overlay `autoAlpha` 0→1 250 ms `esdiOut`; content `autoAlpha` + `y:10→0` 300 ms, +100 ms; close 200 ms `esdiIn`; focus management in callbacks | instant show/hide |
| M12 | FAQ | CSS grid-rows 350 ms std | instant |
| M13 | Realtime slot change | instant cut + 600 ms red flash (cut, not fade) for a lost race | identical (no motion) |
| — | Scroll | **None** (faithful). No reveals, parallax or pinning | — |
| — | Route changes | Instant (faithful; ESDI is an MPA) | — |

### 9.5 Placeholder imagery

No ESDI asset is used. Hero and trail images are **generated monochrome compositions** (SVG: grain from `feTurbulence`, halftone dots, ruler stripes, grid paper, cut-paper shapes evoking a workshop) plus solid accent blocks. They're served from `public/placeholders/` via a manifest, so real photos can replace them later by dropping files into a folder. This needs no downloads and carries no licensing risk.

---

## 10. Folder structure

```
taller-reservas/
├─ DESIGN.md · PLAN.md · README.md · .env.example · package.json · tsconfig.json · next.config.ts
├─ design/                         Phase 0 evidence
├─ supabase/
│  ├─ migrations/                  0001_extensions · 0002_profiles · 0003_bookings · 0004_rls · 0005_rpc
│  │                               0006_realtime · 0007_jobs_outbox · 0008_auth_domain · 0009_cron (all idempotent)
│  ├─ templates/magic-link.html    ESDI-styled auth email (link + 6-digit code)
│  └─ config.toml                  for anyone who later runs the local stack with Docker
├─ scripts/                        db-migrate.ts (DATABASE_URL, CLI-compatible tracking) · seed.ts · admins-sync.ts
│                                  excel-template.ts · cron-setup.ts (Vault secrets + schedule)
├─ public/placeholders/            generated SVG compositions + manifest.json
├─ src/
│  ├─ proxy.ts                     Supabase session refresh + route guards
│  ├─ config/                      booking.ts · site.ts
│  ├─ app/
│  │  ├─ layout.tsx · globals.css (tokens) · page.tsx · not-found.tsx · error.tsx
│  │  ├─ acceso/ (page, codigo/, actions.ts) · auth/confirmar/ · bienvenida/
│  │  ├─ reservar/ (page, loading, actions.ts) · mis-reservas/ · admin/ (page, actions, excel/route.ts)
│  │  ├─ privacidad/ · api/jobs/run/ · api/integraciones/microsoft/ · api/dev/login/
│  ├─ components/
│  │  ├─ layout/   SiteHeader · MenuOverlay · SiteFooter · Wordmark
│  │  ├─ home/     HeroLockup · FeatureCards · RulesSection · UpcomingSlots · Faq
│  │  ├─ booking/  WeekGrid · DayTabs · SlotCell · WeekNav · Legend · ConfirmDialog · useRealtimeSlots
│  │  ├─ tables/   AgendaTable
│  │  └─ ui/       Button · TextLink · Field · TextInput · OtpInput · Accordion · RuledList · PageTitle
│  │               SectionTitle · Rule · StatusRow · VisuallyHidden
│  └─ lib/
│     ├─ supabase/ server.ts · browser.ts · admin.ts (secret key, server-only) · proxy.ts · types.ts (generated)
│     ├─ auth/     domain.ts · session.ts · admin.ts
│     ├─ booking/  time.ts · slots.ts · rules.ts · errors.ts · format.ts (es-ES dates "16 Oct 26")
│     ├─ excel/    rows.ts · workbook.ts (exceljs) · graph.ts · sync.ts · crypto.ts
│     ├─ email/    transport.ts · templates.ts · ics.ts
│     ├─ jobs/     worker.ts · lease.ts
│     └─ motion/   gsap.ts (register + CustomEase) · hero-timeline.ts · image-trail.ts
└─ tests/  unit/ · integration/ (needs Supabase env, skipped otherwise) · e2e/ (Playwright)
```

---

## 11. Build order (Phase 2 milestones)

1. **Scaffold:** Next 16 + TS strict + Tailwind 4 + ESLint/Prettier, fonts, tokens from DESIGN.md, `git init`.
2. **Shell:** header, menu overlay, footer, wordmark, UI primitives. Static home with hero lockup and placeholders.
3. **Motion:** GSAP setup, M1 hero timeline, M9/M10 overlays, M4 trail, reduced-motion branches.
4. **Database:** migrations, RLS, RPCs, triggers, realtime broadcast, outbox; migration runner; seed.
5. **Auth:** `/acceso`, code, confirm (Safe-Links-proof), onboarding, proxy guards, dev login.
6. **Booking:** grid (desktop + mobile), dialog, actions, realtime, limits UX; Mis reservas.
7. **Admin + side effects:** admin table/actions, xlsx fallback, job worker, Graph adapter (D5), SMTP + ICS, cron setup script.
8. **Docs:** README (Supabase setup, domain hook, SMTP, Microsoft app registration, Vercel deploy), `.env.example`.

Each milestone ends with `tsc --noEmit`, lint and unit tests green before the next starts.

### How the plan makes Phase 4 checks provable

| Phase 4 check | Mechanism |
|---|---|
| 1. gmail rejected / esdi.edu.es accepted | e2e on the form (client message) + integration call straight to Auth with the publishable key (hook/trigger 403), which proves it isn't client-only |
| 2. No weekends, nothing outside 08–19 | e2e DOM assertion (5 columns × 11 rows) + RPC rejects Saturday / 19:00 (CHECK + validation) |
| 3. A books Tue 10:00, B sees it closed live | two Playwright contexts via dev login; B asserts the cell changes **without reload** |
| 4. Simultaneous attempts → exactly one wins | integration test with `Promise.all` of two RPC calls (A and B tokens) + an e2e double-click race |
| 5. Weekly / daily limits | integration (3rd booking in a week, 2nd on a day) + e2e message |
| 6. Cancel reopens | e2e: A cancels → B's grid shows the slot available live |
| 7. Excel rows | download `/admin/excel`, parse with exceljs, assert a "Reservas" row (confirmed then cancelled) and a "Registros" row; plus the Graph path if credentials exist |
| 8. No horizontal scroll | `scrollWidth ≤ innerWidth` at 390 / 768 / 1024 / 1440 on every page |
| 9. Motion matches spec; reduced motion off | read GSAP timeline durations, eases and `set` positions; emulate `reduce` → no timeline, static hero |
| 10. Side-by-side with esdi.es | paired screenshots (hero, menu, table/grid, footer) at 1440 and 390 |

---

## 12. Risks

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| R1 | No local Supabase (F1); QA blocked without hosted credentials | Certain / High | You create a free Supabase project (≈ 5 min) **or** install Docker Desktop. Everything up to milestone 3 needs no backend |
| R2 | Graph Excel app-only unsupported (F2); university tenant may also restrict consent | Certain / Medium | D5 options; fallback `.xlsx` always works; admin panel shows sync health |
| R3 | Students don't receive magic links without custom SMTP (F3) | Certain / High in prod | README step; console transport and dev login for QA |
| R4 | Microsoft Safe Links consumes one-time links | Likely / High | POST-to-verify confirm page + 6-digit code |
| R5 | Realtime private channels need Realtime Authorization enabled | Possible / Medium | Migration adds the policy; README checklist; client refetches on reconnect and on focus as a safety net |
| R6 | Auth hook not enabled in the dashboard | Possible / Low | Trigger backstop in a migration enforces the domain anyway |
| R7 | Config drift between `config/booking.ts` and `private.booking_rules` | Possible / Medium | Parity integration test |
| R8 | Vercel Hobby cron limit (F4) | Certain / Low | pg_cron + pg_net + `after()` |
| R9 | Concurrency bugs in limits | Low / High | Advisory lock + unique constraint + parallel-RPC integration tests |
| R10 | Hero lockup reflow (font load, very narrow screens) | Medium / Medium | Lockup measured from `document.fonts.ready`; SVG `viewBox` scaling; static fallback before fonts load (no layout shift: fixed aspect box) |
| R11 | GDPR: names and emails in DB **and** in a shared Excel | Certain / Medium | `/privacidad` notice, least-privilege Graph scopes, no PII in realtime payloads or logs |
| R12 | Looks "ESDI-official" | Low / Medium | Text wordmark "TALLER", no ESDI logo or assets, footer note "Proyecto no oficial" |
| R13 | Workspace path contains spaces (`ESTUDI DE CONVERTIDORS…`) | Low / Low | All scripts quote paths; verified in milestone 1 |

---

## 13. Decisions needed before Phase 2

| # | Question | Recommended |
|---|---|---|
| D1–D3 | Phase 0 defaults (table at the top) | As applied |
| **D4** | Backend for development and QA | **Hosted Supabase dev project** (I'll give a 5-minute checklist; you paste keys into `.env.local` yourself). Alternative: install Docker Desktop + WSL2 (admin rights + reboot) |
| **D5** | Excel write strategy | **A: delegated "Conectar con Microsoft" + table endpoints** (honours "append/update rows"; keeps manual edits) |
| **D6** | SMTP provider (auth emails + confirmations) | Whatever the school allows: **Microsoft 365 SMTP** with a shared mailbox, or **Resend** with a verified domain. Code supports any SMTP; dev uses the console transport |
| **D7** | Can admins use non-@esdi.edu.es addresses? | **Yes**, via `private.allowed_emails` synced from `ADMIN_EMAILS` (no effect if all admins are @esdi.edu.es) |
