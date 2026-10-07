"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { BOOKING_ERROR_MESSAGES, toBookingErrorCode } from "@/lib/booking/errors";
import { forgetCachedToken, PROVIDER } from "@/lib/excel/graph";
import { runJobs, runJobsQuietly } from "@/lib/jobs/worker";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminResult = { ok: true; message: string } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function adminCancelBooking(bookingId: string): Promise<AdminResult> {
  await requireAdmin();
  if (!UUID.test(bookingId)) return { ok: false, message: BOOKING_ERROR_MESSAGES.NOT_FOUND };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, message: BOOKING_ERROR_MESSAGES.BACKEND_UNAVAILABLE };
  const { error } = await admin.rpc("admin_cancel_booking", { p_booking_id: bookingId });
  if (error) return { ok: false, message: BOOKING_ERROR_MESSAGES[toBookingErrorCode(error)] };
  after(runJobsQuietly);
  revalidatePath("/admin");
  return { ok: true, message: "Reserva cancelada. Se ha avisado por correo a la persona." };
}

export async function adminSyncNow(): Promise<AdminResult> {
  await requireAdmin();
  try {
    const summary = await runJobs({ limit: 100 });
    revalidatePath("/admin");
    if (!summary) return { ok: false, message: BOOKING_ERROR_MESSAGES.BACKEND_UNAVAILABLE };
    const parts = [`Correos enviados: ${summary.emails.done}`, `filas de Excel actualizadas: ${summary.excel.done}`];
    if (summary.emails.failed || summary.excel.failed) parts.push(`fallidos: ${summary.emails.failed + summary.excel.failed} (se reintentarán)`);
    if (summary.excel.skipped) parts.push(summary.excel.skipped);
    return { ok: true, message: `${parts.join(". ")}.` };
  } catch (e) {
    return { ok: false, message: `No se ha podido sincronizar: ${(e as Error).message}` };
  }
}

export async function adminRebuildExcel(): Promise<AdminResult> {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, message: BOOKING_ERROR_MESSAGES.BACKEND_UNAVAILABLE };
  const { error } = await admin.rpc("jobs_enqueue", { p_kind: "excel.rebuild", p_ref_id: "all" });
  if (error) return { ok: false, message: error.message };
  after(runJobsQuietly);
  revalidatePath("/admin");
  return { ok: true, message: "Reconstrucción del Excel en marcha. Tarda unos segundos." };
}

export async function adminRetryFailed(): Promise<AdminResult> {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, message: BOOKING_ERROR_MESSAGES.BACKEND_UNAVAILABLE };
  const { data, error } = await admin.rpc("jobs_retry_failed", {});
  if (error) return { ok: false, message: error.message };
  after(runJobsQuietly);
  revalidatePath("/admin");
  return { ok: true, message: `Reintentando ${data ?? 0} tareas.` };
}

export async function adminDisconnectMicrosoft(): Promise<AdminResult> {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, message: BOOKING_ERROR_MESSAGES.BACKEND_UNAVAILABLE };
  const { error } = await admin.rpc("integration_delete", { p_provider: PROVIDER });
  if (error) return { ok: false, message: error.message };
  forgetCachedToken();
  revalidatePath("/admin");
  return { ok: true, message: "Microsoft Excel desconectado. Las reservas siguen registrándose en la base de datos." };
}
