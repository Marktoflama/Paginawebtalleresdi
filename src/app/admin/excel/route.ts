import { getSession } from "@/lib/auth/session";
import { loadAll } from "@/lib/excel/data";
import { buildWorkbookBuffer } from "@/lib/excel/workbook";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Up-to-date .xlsx (Registros + Reservas) generated from the database. Admins only. */
export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) return new Response("Not found", { status: 404 });
  const admin = createSupabaseAdminClient();
  if (!admin) return new Response("Servicio de reservas no configurado", { status: 503 });

  const data = await loadAll(admin);
  const buffer = await buildWorkbookBuffer(data);
  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reservas-taller-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
