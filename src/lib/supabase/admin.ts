import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Privileged client (secret key, bypasses RLS). Server-only: never import this
 * from a Client Component. Used for admin actions after an ADMIN_EMAILS check,
 * the job worker, and anonymous availability on the home page.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secret) return null;
  return createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export type SupabaseAdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
