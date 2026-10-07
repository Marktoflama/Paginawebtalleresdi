import { after, NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { exchangeCode, fetchAccountEmail, graphConfig, saveConnection } from "@/lib/excel/graph";
import { runJobsQuietly } from "@/lib/jobs/worker";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function back(request: NextRequest, result: "conectado" | "error") {
  const response = NextResponse.redirect(new URL(`/admin?excel=${result}#excel`, request.url));
  response.cookies.delete({ name: "taller_ms_oauth", path: "/api/integraciones/microsoft" });
  return response;
}

/** OAuth redirect target: validates state, exchanges the code, stores the encrypted refresh token, then rebuilds the workbook. */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return new NextResponse("Not found", { status: 404 });
  const cfg = graphConfig();
  const admin = createSupabaseAdminClient();
  if (!cfg || !admin) return back(request, "error");

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  if (params.get("error") || !code || !state) {
    console.error("[ms-oauth] provider error:", params.get("error"), params.get("error_description"));
    return back(request, "error");
  }

  let stored: { state?: string; verifier?: string } = {};
  try {
    stored = JSON.parse(request.cookies.get("taller_ms_oauth")?.value ?? "{}");
  } catch {
    stored = {};
  }
  if (!stored.state || !stored.verifier || stored.state !== state) {
    console.error("[ms-oauth] state mismatch");
    return back(request, "error");
  }

  try {
    const tokens = await exchangeCode(cfg, code, stored.verifier);
    const email = await fetchAccountEmail(tokens.access_token);
    await saveConnection(admin, cfg, tokens, email);
    await admin.rpc("jobs_enqueue", { p_kind: "excel.rebuild", p_ref_id: "all" });
    after(runJobsQuietly);
    return back(request, "conectado");
  } catch (e) {
    console.error("[ms-oauth]", (e as Error).message);
    return back(request, "error");
  }
}
