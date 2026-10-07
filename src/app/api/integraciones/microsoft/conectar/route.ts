import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { authorizeUrl, createPkcePair, graphConfig } from "@/lib/excel/graph";

export const dynamic = "force-dynamic";

/** Starts the delegated Microsoft sign-in (authorization code + PKCE). Admins only. */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return new NextResponse("Not found", { status: 404 });
  const cfg = graphConfig();
  if (!cfg) return NextResponse.redirect(new URL("/admin?excel=error#excel", request.url));

  const { verifier, challenge, state } = createPkcePair();
  const response = NextResponse.redirect(authorizeUrl(cfg, state, challenge));
  response.cookies.set("taller_ms_oauth", JSON.stringify({ state, verifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integraciones/microsoft",
    maxAge: 600,
  });
  return response;
}
