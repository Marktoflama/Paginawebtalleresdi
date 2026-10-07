import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublicEnv } from "./env";
import type { Database } from "./types";

/** Routes that require a session. */
const PROTECTED_PREFIXES = ["/reservar", "/mis-reservas", "/bienvenida", "/admin"];
/** Routes that only make sense without a session. */
const GUEST_ONLY_PREFIXES = ["/acceso"];

function matches(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

function redirectWithCookies(url: URL, from: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

/**
 * Refreshes the Supabase session cookies on every request and guards routes.
 * Authorization itself is enforced again in pages, actions and the database.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = supabasePublicEnv();
  if (!env) return response;

  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Must run immediately after creating the client so tokens are refreshed.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && matches(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/acceso";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return redirectWithCookies(url, response);
  }

  if (signedIn && matches(pathname, GUEST_ONLY_PREFIXES)) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    url.pathname = next && next.startsWith("/") && !next.startsWith("//") ? next.split("?")[0]! : "/reservar";
    url.search = next && next.includes("?") ? `?${next.split("?")[1]}` : "";
    return redirectWithCookies(url, response);
  }

  return response;
}
