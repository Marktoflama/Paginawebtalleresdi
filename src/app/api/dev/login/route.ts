import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail, normalizeEmail } from "@/lib/auth/domain";
import { safeNextPath } from "@/lib/auth/redirect";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * DEVELOPMENT ONLY. Signs in as a test student without sending an email
 * (Supabase's built-in mailer only reaches project members). Used by the
 * Playwright QA suite. Triple-guarded: ENABLE_DEV_LOGIN=true, a non-production
 * build, and a localhost request. Only @esdi.edu.es addresses are accepted.
 *
 *   /api/dev/login?as=alumno1@esdi.edu.es&name=Laia%20Puig&next=/reservar
 */
export async function GET(request: NextRequest) {
  const enabled = process.env.ENABLE_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";
  if (!enabled || !LOCAL_HOSTS.has(request.nextUrl.hostname)) return new NextResponse("Not found", { status: 404 });

  const email = normalizeEmail(request.nextUrl.searchParams.get("as") ?? "");
  const name = (request.nextUrl.searchParams.get("name") ?? "").trim();
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (!isAllowedEmail(email)) return NextResponse.json({ error: "only @esdi.edu.es test accounts" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();
  if (!admin || !supabase) return NextResponse.json({ error: "supabase not configured" }, { status: 503 });

  // Create the user if needed (email already confirmed).
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: name ? { full_name: name } : {},
  });
  if (created.error && !/already been registered|already exists/i.test(created.error.message)) {
    return NextResponse.json({ error: created.error.message }, { status: 400 });
  }

  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) return NextResponse.json({ error: link.error?.message ?? "no token" }, { status: 400 });

  const { data, error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
  if (error || !data.user) return NextResponse.json({ error: error?.message ?? "verify failed" }, { status: 400 });

  if (name) {
    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle();
    if (!profile?.full_name) await admin.from("profiles").update({ full_name: name }).eq("id", data.user.id);
  }
  return NextResponse.redirect(new URL(next, request.url));
}
