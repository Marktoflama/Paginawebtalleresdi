import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "./admin";
import { isAllowedEmail } from "./domain";

export interface SessionSummary {
  userId: string;
  email: string;
  fullName: string | null;
  isAdmin: boolean;
  /** False if the account's domain isn't allowed (e.g. created by hand in the dashboard). */
  allowed: boolean;
}

/** Current session (deduplicated per request). `null` when signed out or not configured. */
export const getSession = cache(async (): Promise<SessionSummary | null> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub || typeof claims.email !== "string") return null;
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", claims.sub).maybeSingle();
  const isAdmin = isAdminEmail(claims.email);
  return {
    userId: claims.sub,
    email: claims.email,
    fullName: profile?.full_name ?? null,
    isAdmin,
    allowed: isAllowedEmail(claims.email) || isAdmin,
  };
});

/** For student pages: signed in, allowed domain, and name completed. */
export async function requireStudent(nextPath: string): Promise<SessionSummary> {
  // Guards must run per request: never let a build without Supabase env prerender the outcome.
  await connection();
  const session = await getSession();
  if (!session) redirect(`/acceso?next=${encodeURIComponent(nextPath)}`);
  if (!session.fullName) redirect(`/bienvenida?next=${encodeURIComponent(nextPath)}`);
  return session;
}

/** For admin pages and actions: ADMIN_EMAILS allowlist. Others get a 404 (no hint the page exists). */
export async function requireAdmin(): Promise<SessionSummary> {
  await connection();
  const session = await getSession();
  if (!session?.isAdmin) notFound();
  return session;
}
