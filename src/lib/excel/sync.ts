import "server-only";
import type { SupabaseAdminClient } from "@/lib/supabase/admin";
import { loadAll, loadBooking, loadStudent } from "./data";
import { getAccessToken, graphConfig, PROVIDER, WorkbookClient } from "./graph";
import { registroRow, reservaRow } from "./rows";

export type ExcelJob = { kind: "excel.booking" | "excel.student" | "excel.rebuild"; refId: string };

/**
 * Applies a batch of Excel jobs inside one workbook session. Each job re-reads
 * the current database state, so retries and out-of-order processing are safe.
 * Returns per-job results; the caller marks jobs done/failed.
 */
export async function runExcelJobs(admin: SupabaseAdminClient, jobs: ExcelJob[]): Promise<Array<{ ok: boolean; error?: string }>> {
  const cfg = graphConfig();
  if (!cfg) return jobs.map(() => ({ ok: false, error: "Microsoft Graph no está configurado" }));

  const token = await getAccessToken(admin, cfg);
  const wb = new WorkbookClient(token, cfg);
  await wb.open();
  const results: Array<{ ok: boolean; error?: string }> = [];
  try {
    for (const job of jobs) {
      try {
        if (job.kind === "excel.booking") {
          const booking = await loadBooking(admin, job.refId);
          if (booking) await wb.upsert("reservas", booking.id, reservaRow(booking));
          // The booking's student must be in "Registros" too (e.g. name set before Graph was connected).
          if (booking) {
            const student = await loadStudent(admin, booking.userId);
            if (student) await wb.upsert("registros", student.email, registroRow(student), 1);
          }
        } else if (job.kind === "excel.student") {
          const student = await loadStudent(admin, job.refId);
          if (student) await wb.upsert("registros", student.email, registroRow(student), 1);
        } else {
          const all = await loadAll(admin);
          await wb.rebuild("registros", all.students.map(registroRow));
          await wb.rebuild("reservas", all.bookings.map(reservaRow));
        }
        results.push({ ok: true });
      } catch (e) {
        results.push({ ok: false, error: (e as Error).message });
      }
    }
  } finally {
    await wb.close().catch(() => undefined);
  }
  if (results.every((r) => r.ok)) await admin.rpc("integration_mark", { p_provider: PROVIDER, p_ok: true, p_error: null });
  else {
    const firstError = results.find((r) => !r.ok)?.error ?? "error";
    await admin.rpc("integration_mark", { p_provider: PROVIDER, p_ok: false, p_error: firstError });
  }
  return results;
}
