import "server-only";
import { randomUUID } from "node:crypto";
import { SITE } from "@/config/site";
import { trimSeconds } from "@/lib/booking/format";
import { bookingIcs } from "@/lib/email/ics";
import { bookingCancelledEmail, bookingConfirmedEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/transport";
import { loadBooking } from "@/lib/excel/data";
import { graphConfig } from "@/lib/excel/graph";
import { runExcelJobs, type ExcelJob } from "@/lib/excel/sync";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_ATTEMPTS = 12;
const EMAIL_KINDS = ["email.booking_confirmed", "email.booking_cancelled"];
const EXCEL_KINDS = ["excel.booking", "excel.student", "excel.rebuild"];

export interface RunSummary {
  emails: { done: number; failed: number };
  excel: { done: number; failed: number; skipped: string | null };
}

async function handleEmail(admin: SupabaseAdminClient, kind: string, bookingId: string) {
  const booking = await loadBooking(admin, bookingId);
  if (!booking || !booking.email) return; // nothing to send (deleted user): treat as done
  const data = {
    fullName: booking.fullName || booking.email,
    date: booking.slotDate,
    start: trimSeconds(booking.slotStart),
    end: trimSeconds(booking.slotEnd),
    bookingId: booking.id,
  };
  const cancelled = kind === "email.booking_cancelled";
  if (cancelled && booking.status !== "cancelled") return; // re-booked state changed: skip stale cancellation
  if (!cancelled && booking.status !== "confirmed") return; // cancelled before the email went out
  const content = cancelled
    ? bookingCancelledEmail({ ...data, byAdmin: booking.cancelledBy === "admin" })
    : bookingConfirmedEmail(data);
  const ics = bookingIcs({
    uid: booking.id,
    date: data.date,
    start: data.start,
    end: data.end,
    summary: `${SITE.workshopName}: reserva`,
    description: `Franja reservada por ${data.fullName}.`,
    location: SITE.workshopName,
    cancelled,
  });
  await sendEmail({
    to: booking.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    attachments: [{ filename: cancelled ? "cancelacion.ics" : "reserva.ics", content: ics, contentType: "text/calendar; charset=utf-8" }],
  });
}

/**
 * Processes pending outbox jobs. Safe to call concurrently: jobs are claimed
 * with FOR UPDATE SKIP LOCKED and the Excel writer holds a lease, so only one
 * process writes to the workbook at a time. Excel jobs stay pending while
 * Microsoft Graph isn't configured/connected (nothing is lost).
 */
export async function runJobs(options: { limit?: number } = {}): Promise<RunSummary | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const limit = options.limit ?? 25;
  const summary: RunSummary = { emails: { done: 0, failed: 0 }, excel: { done: 0, failed: 0, skipped: null } };

  // Emails
  const { data: emailJobs, error: emailErr } = await admin.rpc("jobs_claim", { p_kinds: EMAIL_KINDS, p_limit: limit });
  if (emailErr) throw new Error(`jobs_claim: ${emailErr.message}`);
  for (const job of emailJobs ?? []) {
    try {
      await handleEmail(admin, job.kind, job.ref_id);
      await admin.rpc("jobs_complete", { p_id: job.id });
      summary.emails.done++;
    } catch (e) {
      await admin.rpc("jobs_fail", { p_id: job.id, p_error: (e as Error).message, p_max_attempts: MAX_ATTEMPTS });
      summary.emails.failed++;
    }
  }

  // Excel (single writer)
  if (!graphConfig()) {
    summary.excel.skipped = "Microsoft Graph no está configurado";
    return summary;
  }
  const { data: integration } = await admin.rpc("integration_get", { p_provider: "microsoft" });
  if (!integration?.[0]?.refresh_token_enc) {
    summary.excel.skipped = "Microsoft Excel no está conectado";
    return summary;
  }
  const holder = randomUUID();
  const { data: leased } = await admin.rpc("lease_acquire", { p_name: "excel", p_holder: holder, p_seconds: 120 });
  if (!leased) {
    summary.excel.skipped = "Otro proceso está escribiendo en el Excel";
    return summary;
  }
  try {
    const { data: excelJobs, error: excelErr } = await admin.rpc("jobs_claim", { p_kinds: EXCEL_KINDS, p_limit: limit });
    if (excelErr) throw new Error(`jobs_claim: ${excelErr.message}`);
    const jobs = excelJobs ?? [];
    if (jobs.length > 0) {
      let results: Array<{ ok: boolean; error?: string }>;
      try {
        results = await runExcelJobs(
          admin,
          jobs.map((j): ExcelJob => ({ kind: j.kind as ExcelJob["kind"], refId: j.ref_id })),
        );
      } catch (e) {
        results = jobs.map(() => ({ ok: false, error: (e as Error).message }));
      }
      for (const [i, job] of jobs.entries()) {
        const r = results[i];
        if (r?.ok) {
          await admin.rpc("jobs_complete", { p_id: job.id });
          summary.excel.done++;
        } else {
          await admin.rpc("jobs_fail", { p_id: job.id, p_error: r?.error ?? "error", p_max_attempts: MAX_ATTEMPTS });
          summary.excel.failed++;
        }
      }
    }
  } finally {
    await admin.rpc("lease_release", { p_name: "excel", p_holder: holder });
  }
  return summary;
}

/** Fire-and-forget wrapper for `after()`: never throws. */
export async function runJobsQuietly(): Promise<void> {
  try {
    await runJobs();
  } catch (e) {
    console.error("[jobs] run failed:", (e as Error).message);
  }
}
