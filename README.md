# TALLER · Reservas

Workshop booking for students with an `@esdi.edu.es` address: one-hour slots, Monday to Friday, 08:00–19:00 (Europe/Madrid), one student per slot, realtime availability, email confirmations and an automatic Excel log. The interface follows the measured esdi.es design system (see [`DESIGN.md`](DESIGN.md) and [`design/esdi-analysis.md`](design/esdi-analysis.md)). It's an unofficial project and uses no ESDI assets.

- **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · GSAP 3 · Supabase (Auth, Postgres, RLS, Realtime) · exceljs · Microsoft Graph.
- **UI copy:** Spain Spanish. Code and comments: English.

---

## 1. Quick look (no backend needed)

```bash
npm install
npm run dev
```

- `http://localhost:3000`: home page (hero collage, rules, FAQ). Availability shows a "not connected" notice.
- `http://localhost:3000/dev/reservar`: booking grid with sample data (development only; 404 in production).

Needs Node 20.9+ (`.nvmrc` pins 24). No install at all: open the repository in **GitHub Codespaces** (Code → Codespaces → Create) or in VS Code with **Dev Containers**. `.devcontainer/` installs dependencies, starts `npm run dev` and opens port 3000.

---

## 2. Supabase

### 2.1 Project and keys
1. Create a project at [supabase.com](https://supabase.com) (EU region, e.g. Frankfurt). Keep the database password.
2. `cp .env.example .env.local`, then fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, plus the **publishable** key (`sb_publishable_…`) and the **secret** key (`sb_secret_…`), from *Project Settings → API Keys*.
   - `DATABASE_URL` from *Connect → Session pooler* (port 5432, includes the password).
3. Apply the schema:
   ```bash
   npm run db:migrate          # applies supabase/migrations/*.sql in order
   npm run db:migrate -- --status
   ```
   It's compatible with the Supabase CLI (`supabase db push` uses the same tracking table).

### 2.2 Auth settings (dashboard)
| Where | Setting |
|---|---|
| Authentication → URL Configuration | **Site URL** = `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`, later the Vercel URL). Add the same URL with `/**` to Redirect URLs. |
| Authentication → Sign In / Providers → Email | Email provider on, **Confirm email** on, OTP length **6**, OTP expiry **3600 s**. |
| Authentication → Emails → Templates | *Magic Link* ← paste `supabase/templates/magic-link.html`. *Confirm signup* ← paste `supabase/templates/confirm-signup.html`. Subjects: "Tu acceso al taller" / "Confirma tu correo para reservar el taller". |
| Authentication → Hooks | **Before User Created** → Postgres → `public.hook_before_user_created`. |
| Authentication → Emails → SMTP Settings | **Custom SMTP (required).** The built-in sender only delivers to project team members, about 2 per hour. See §4. |
| Realtime → Settings | Keep **"Allow public access" disabled** (private channels). Migration 0007 adds the policy that lets signed-in students receive the `slots` topic. |

The templates verify the link with a **button** (`/auth/confirmar`, POST), not on page load. Mail scanners such as Microsoft Defender Safe Links open links automatically and would otherwise consume the one-time token. The 6-digit code works across devices.

### 2.3 Test data and admins
```bash
npm run db:seed        # 4 students alumno1..4@esdi.edu.es + sample bookings (local site URL only)
npm run admins:sync    # after editing ADMIN_EMAILS (lets admins outside @esdi.edu.es sign in)
```

Admins whose address isn't @esdi.edu.es sign in from **/acceso?personal=1** (link "Acceso para administración del taller" on the access page). That variant skips the in-browser domain check, because the allowlist only exists on the server; the server, the Auth hook and the trigger still apply.

---

## 3. How the domain restriction works

The publishable key is public, so the browser can call Supabase Auth directly. The rule is therefore enforced in four places:

1. **Browser:** the access form runs `studentEmailError()` (src/lib/auth/domain.ts) before submitting, so `alumno@gmail.com` never leaves the page. Exact domain match: rejects `x@esdi.edu.es.evil.com`, `x@sub.esdi.edu.es`, `a@b@esdi.edu.es`.
2. **Server action:** the same check before `signInWithOtp`.
3. **Auth hook** `public.hook_before_user_created`: returns 403 "Solo se admiten cuentas @esdi.edu.es."
4. **Backstop trigger** on `auth.users` (installed by migration 0008): blocks the insert even if the hook was never enabled.

Every policy and booking function also re-checks the caller's email (`private.is_allowed_email`). Admins outside the domain are allowed only through `private.allowed_emails` (`npm run admins:sync`).

---

## 4. Email

Two kinds of email go out, ideally through **the same SMTP account**:

| Email | Sent by | Configure |
|---|---|---|
| Magic link + 6-digit code | Supabase Auth | Dashboard → SMTP Settings |
| Booking confirmation / cancellation (with an `.ics` calendar file) | The app's job worker (`nodemailer`) | `EMAIL_TRANSPORT=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` |

Options:
- **Microsoft 365** (shared mailbox, `smtp.office365.com:587`, SMTP AUTH enabled for that mailbox).
- **Resend** (`smtp.resend.com:465`, user `resend`, password = API key, verified sending domain).

In development, `EMAIL_TRANSPORT=console` writes every message as an `.eml` file to `./.mail/`.

---

## 5. Excel log

Every booking, cancellation and registration is recorded in two sheets:

| Sheet | Columns |
|---|---|
| **Registros** | Nombre · Email · Fecha de registro |
| **Reservas** | ID reserva · Nombre · Email · Fecha · Día · Inicio · Fin · Estado (confirmada/cancelada) · Creada · Cancelada |

**The database is the source of truth.** Each change inserts a job in the **same transaction** (outbox). The worker processes it right after the response (`after()`) and retries every 5 minutes with exponential backoff. A failing Excel sync never blocks or undoes a booking. Jobs re-read the current state, so they're idempotent.

### 5.1 Fallback (works out of the box)
`/admin` → **Descargar Excel** (`/admin/excel`) generates an up-to-date `.xlsx` from the database with exceljs. No Microsoft setup is needed.

### 5.2 Microsoft Graph (OneDrive / SharePoint)
> Microsoft's Excel workbook endpoints (`tables/…/rows/add`, range updates) **don't support application permissions**: "Application: Not supported" in the official reference. So instead of a client-credentials daemon, an admin connects **once** with a delegated sign-in. The refresh token is stored AES-256-GCM encrypted and rotated automatically.

1. **Entra ID → App registrations → New registration**
   - Supported accounts: *Single tenant* (the school's tenant).
   - Redirect URI (Web): `https://YOUR-SITE/api/integraciones/microsoft/callback`. Add `http://localhost:3000/api/integraciones/microsoft/callback` for local use.
2. **Certificates & secrets** → new client secret → `MS_CLIENT_SECRET`. From *Overview*, take `MS_CLIENT_ID` and `MS_TENANT_ID`.
3. **API permissions** → Microsoft Graph → **Delegated**: `User.Read`, `Files.ReadWrite.All`, `offline_access` → *Grant admin consent* (a tenant admin may be required). If the workbook lives in the connecting admin's own OneDrive, `Files.ReadWrite` is enough (set `MS_GRAPH_SCOPES="offline_access User.Read Files.ReadWrite"`).
4. `npm run excel:template` creates `reservas-taller.xlsx` with real Excel **tables** named *Registros* and *Reservas*. Upload it to OneDrive or a SharePoint library.
5. Find its IDs in [Graph Explorer](https://developer.microsoft.com/graph/graph-explorer): `GET https://graph.microsoft.com/v1.0/me/drive/root:/reservas-taller.xlsx`. Use `id` → `MS_FILE_ID` and `parentReference.driveId` → `MS_DRIVE_ID`. For SharePoint: `GET /sites/{site-id}/drive/root:/path/reservas-taller.xlsx`.
6. `MS_TOKEN_ENCRYPTION_KEY`: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
7. `/admin` → **Conectar con Microsoft** → sign in. The app then rebuilds the workbook with all existing data. The panel shows the connected account, the last sync, pending and failed jobs, **Sincronizar ahora**, **Reconstruir Excel** and **Desconectar**.

---

## 6. Background jobs (retries)

- `CRON_SECRET`: a long random string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
- Migration 0009 schedules `pg_cron` every 5 minutes. `pg_net` calls `POST /api/jobs/run` with `Authorization: Bearer CRON_SECRET`.
- After deploying, store the URL and secret in Supabase Vault:
  ```bash
  npm run cron:setup     # uses NEXT_PUBLIC_SITE_URL (must be public) and CRON_SECRET
  ```
  Vercel Hobby cron runs only once a day, which is why the schedule lives in Supabase.

---

## 7. Deploy (Vercel)

1. Push this folder to a Git repository and import it in Vercel (framework: Next.js; root directory: this folder if it sits inside a monorepo).
2. Set every variable from `.env.example` in *Settings → Environment Variables*. Set `NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app` and keep `ENABLE_DEV_LOGIN=false`.
3. Deploy. In Supabase, set **Site URL** and **Redirect URLs** to the Vercel URL.
4. In Entra ID, add the production redirect URI (§5.2).
5. `npm run cron:setup` (with the production `NEXT_PUBLIC_SITE_URL` in your shell or `.env.local`).

---

## 8. Rules

Edit [`src/config/booking.ts`](src/config/booking.ts) **and** `private.booking_rules` (migration 0002 or a new migration). `tests/integration/booking.test.ts` fails if they drift. Hours and slot length are also fixed by CHECK constraints in migration 0004 (`slot_start between 08:00 and 18:00`, `slot_end = start + 1 h`).

| Rule | Value |
|---|---|
| Days | Monday–Friday |
| Slots | 11 × 60 min, 08:00–19:00 Europe/Madrid |
| Per student | max 1 per day, max 2 per ISO week |
| Window | up to today + 28 days |
| Per slot | one student (`UNIQUE (slot_date, slot_start)` on `slot_reservations`) |

---

## 9. Tests

```bash
npm run check              # typecheck + lint + unit tests
npm run test:unit          # pure logic: time/DST, limits, domain, Excel, ICS, lockup geometry
npm run test:integration   # database guarantees against the Supabase project in .env.local (skipped if not configured)
npm run test:e2e           # Playwright, headless, uses the installed Google Chrome (PW_CHANNEL=msedge|chromium to change)
```

**End-to-end (tests/e2e).** Starts `npm run dev` if nothing is listening on :3000.

| Spec | Checks | Needs |
|---|---|---|
| `layout.spec.ts` | no horizontal scroll at 390 / 768 / 1024 / 1440 on every page and with the menu open | nothing |
| `motion.spec.ts` | the motion spec (design/esdi-analysis.md §4.3): hero hard cuts and hold times, 11.3 s loop, pause control, card accents, 200 ms button, menu 250/300+100/200 ms, accordion, image trail; everything off under reduced motion | nothing |
| `access.spec.ts` | `alumno@gmail.com` rejected in the browser (nothing sent) and by the server with JavaScript off; `alumno@esdi.edu.es` passes (its request is blocked, so no real email) | Supabase keys in .env.local. `E2E_EMAIL_TO=<your @esdi.edu.es inbox>` also sends one real link |
| `booking.spec.ts` | Mon–Fri 08–19 grid; A books Tuesday 10:00 and B sees it close **without reloading** (Realtime); cancelling reopens it for B; 1/day and 2/week shown in the grid | Supabase keys + `ENABLE_DEV_LOGIN=true` in .env.local |

**Database harness (tests/db).** Applies `supabase/migrations` with `npm run db:migrate` to a throwaway PostgreSQL 17 (no Docker, no Supabase project; pg_cron and pg_net are stubbed), then checks the domain trigger and hook, the slot rules and CHECK constraints, simultaneous bookings on separate connections (head-to-head, 10-way, same student in three tabs), limits, cancellation, RLS, the realtime payload, the job outbox, the cron/Vault wiring, and the Excel workbook built from the resulting data. It has its own `package.json` so the 100 MB PostgreSQL binary never reaches the app's dependencies:

```bash
cd tests/db && npm install
npm test                  # 51 checks
npm run test:mutation     # negative control: drops the UNIQUE constraint and the advisory lock; the race checks must fail
```

QA evidence from Phase 4 (screenshots side by side with esdi.es, the Excel file, results) is in `design/qa/`.

---

## 10. Structure

```
supabase/migrations   schema, RLS, RPCs (book_slot, cancel_booking, get_week_slots), realtime, outbox, auth domain, cron
supabase/templates    Auth email templates (link + 6-digit code)
scripts/              db-migrate · seed · admins-sync · excel-template · cron-setup · placeholders.py
src/config            booking rules, site
src/lib               booking (time, slots, errors, format) · auth · supabase · excel (rows, exceljs, Graph) · email · jobs · motion
src/components        layout (header, menu overlay, footer) · home (hero collage, cards, trail) · booking (grid, day tabs, dialog, realtime) · ui
src/app               /, /acceso, /auth/confirmar, /bienvenida, /reservar, /mis-reservas, /admin, /privacidad, api routes
tests/                unit · integration (Supabase) · e2e (Playwright) · db (throwaway PostgreSQL)
design/               Phase 0 analysis of esdi.es (report, screenshots, measurements) · qa/ Phase 4 evidence
```

## 11. Imagery

`public/placeholders/` holds generated monochrome and duotone compositions (`scripts/placeholders.py`). No ESDI asset is used. To use real photos of the workshop, replace the files, keeping the names. Hero layout and timing live in `src/components/home/hero-shots.ts`.

## 12. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "Email address not authorized" | Custom SMTP not configured (built-in sender only reaches team members). |
| Magic link says "expired" immediately | A mail scanner opened it. The confirm page needs a click; or use the 6-digit code. Check the template uses `/auth/confirmar`. |
| Grid doesn't update live | Realtime private channels: check migration 0007 ran and "Allow public access" is off; the page also resyncs on focus. |
| Excel not updating | `/admin` → Excel panel shows the last error. `Sincronizar ahora`, or reconnect Microsoft. The `.xlsx` download always works. |
| Signup with a non-ESDI address shows "Database error saving new user" | Expected when the hook isn't enabled: the backstop trigger blocked it. Enable the hook for a cleaner 403. |
