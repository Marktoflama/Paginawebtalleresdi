import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusRow } from "@/components/ui/StatusRow";
import { PageTitle } from "@/components/ui/Typography";
import { getSession, requireAdmin } from "@/lib/auth/session";
import { BOOKING_ERROR_MESSAGES } from "@/lib/booking/errors";
import { formatTimestamp, formatWeekRange, trimSeconds } from "@/lib/booking/format";
import { addDays, isPastSlot, isValidISODate, mondayOf, wallClock } from "@/lib/booking/time";
import { hasEncryptionKey } from "@/lib/excel/crypto";
import { graphConfig, PROVIDER } from "@/lib/excel/graph";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BookingStatus, CancelActor } from "@/lib/supabase/types";
import { AdminBookings, type AdminBooking } from "./AdminBookings";
import { ExcelPanel, type ExcelStatus } from "./ExcelPanel";

/** Non-admins get the 404 UI from the layout; don't leak the section name in the tab title. */
export async function generateMetadata(): Promise<Metadata> {
  const session = await getSession();
  return { title: session?.isAdmin ? "Administración" : "Página no encontrada" };
}

interface Row {
  id: string;
  slot_date: string;
  slot_start: string;
  slot_end: string;
  status: BookingStatus;
  cancelled_by: CancelActor | null;
  profiles: { full_name: string | null; email: string } | null;
}

function missingGraphEnv(): string[] {
  const names = ["MS_TENANT_ID", "MS_CLIENT_ID", "MS_CLIENT_SECRET", "MS_DRIVE_ID", "MS_FILE_ID"];
  const missing = names.filter((n) => !process.env[n]?.trim());
  if (!hasEncryptionKey()) missing.push("MS_TOKEN_ENCRYPTION_KEY");
  return missing;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const now = wallClock();
  const all = params.semana === "todas";
  const monday = !all && isValidISODate(params.semana) ? mondayOf(params.semana) : mondayOf(now.date);
  const sunday = addDays(monday, 6);
  const admin = createSupabaseAdminClient();

  let bookings: AdminBooking[] = [];
  let excel: ExcelStatus | null = null;
  let loadError = false;

  if (admin) {
    let query = admin
      .from("bookings")
      .select("id, slot_date, slot_start, slot_end, status, cancelled_by, profiles(full_name, email)")
      .order("slot_date", { ascending: true })
      .order("slot_start", { ascending: true })
      .limit(1000);
    query = all ? query.gte("slot_date", now.date).eq("status", "confirmed") : query.gte("slot_date", monday).lte("slot_date", sunday);
    const { data, error } = await query;
    if (error) {
      console.error("[admin]", error.message);
      loadError = true;
    }
    bookings = ((data ?? []) as unknown as Row[]).map((r) => {
      const start = trimSeconds(r.slot_start);
      return {
        id: r.id,
        date: r.slot_date,
        start,
        end: trimSeconds(r.slot_end),
        status: r.status,
        cancelledBy: r.cancelled_by,
        fullName: r.profiles?.full_name ?? "",
        email: r.profiles?.email ?? "",
        past: isPastSlot(r.slot_date, start, now),
      };
    });

    const [{ data: integration }, { data: summary }] = await Promise.all([
      admin.rpc("integration_get", { p_provider: PROVIDER }),
      admin.rpc("jobs_summary", {}),
    ]);
    const i = integration?.[0];
    const excelRows = (summary ?? []).filter((s) => s.kind.startsWith("excel."));
    const flash = params.excel === "conectado" ? "conectado" : params.excel === "error" ? "error" : null;
    excel = {
      configured: Boolean(graphConfig()),
      missing: missingGraphEnv(),
      connected: Boolean(i?.refresh_token_enc),
      accountEmail: i?.account_email ?? null,
      lastOkAt: i?.last_ok_at ? formatTimestamp(i.last_ok_at) : null,
      lastError: i?.last_error ?? null,
      pending: excelRows.filter((s) => s.status === "pending" || s.status === "processing").reduce((n, s) => n + Number(s.total), 0),
      failed: excelRows.filter((s) => s.status === "failed").reduce((n, s) => n + Number(s.total), 0),
      lastJobError: excelRows.find((s) => s.last_error)?.last_error ?? null,
      flash,
    };
  } else {
    loadError = true;
  }

  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const label = all ? "Todas las próximas" : formatWeekRange(monday, addDays(monday, 4));
  const navLink = "type-body-lg inline-flex min-h-11 items-center gap-2 link-reveal";

  return (
    <div className="gutter-x section-gap">
      <PageTitle>Admin</PageTitle>
      {loadError ? (
        <StatusRow tone="error" className="mb-6">
          {BOOKING_ERROR_MESSAGES.BACKEND_UNAVAILABLE}
        </StatusRow>
      ) : null}

      <section aria-labelledby="reservas-title" className="section-gap-sm">
        <h2 id="reservas-title" className="type-display-lg pb-6">
          Reservas
        </h2>
        <nav aria-label="Filtrar por semana" className="grid grid-cols-1 items-center gap-2 rule-top py-2 md:grid-cols-[1fr_auto_1fr]">
          <div className="flex gap-6">
            <Link href={`/admin?semana=${addDays(monday, -7)}`} className={navLink}>
              <ArrowLeft aria-hidden="true" weight="bold" className="size-5" /> Anterior
            </Link>
            <Link href={`/admin?semana=${addDays(monday, 7)}`} className={navLink}>
              Siguiente <ArrowRight aria-hidden="true" weight="bold" className="size-5" />
            </Link>
          </div>
          <p className="type-body-lg tabular md:text-center" aria-live="polite">
            {label} · <span className="tabular">{confirmed}</span> confirmadas
          </p>
          <div className="flex gap-6 md:justify-end">
            <Link href="/admin" className={navLink} aria-current={!all && monday === mondayOf(now.date) ? "page" : undefined}>
              Esta semana
            </Link>
            <Link href="/admin?semana=todas" className={navLink} aria-current={all ? "page" : undefined}>
              Todas las próximas
            </Link>
          </div>
        </nav>
        <AdminBookings bookings={bookings} caption={`Reservas: ${label}`} />
      </section>

      <section id="excel" aria-labelledby="excel-title" className="section-gap-sm scroll-mt-(--header-offset)">
        <h2 id="excel-title" className="type-display-lg pb-6">
          Excel
        </h2>
        {excel ? <ExcelPanel status={excel} /> : null}
      </section>
    </div>
  );
}
