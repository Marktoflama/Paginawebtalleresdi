import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets, image optimisation, the job runner
     * endpoint (authenticated by its own bearer secret) and placeholders.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|placeholders/|api/jobs/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
