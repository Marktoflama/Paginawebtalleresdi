import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnv } from "../../scripts/env";
import type { Database } from "@/lib/supabase/types";

loadEnv();

export const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
export const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
export const SECRET = process.env.SUPABASE_SECRET_KEY?.trim() ?? "";
export const configured = Boolean(URL_ && PUBLISHABLE && SECRET);

export type Client = SupabaseClient<Database>;

export function adminClient(): Client {
  return createClient<Database>(URL_, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function anonClient(): Client {
  return createClient<Database>(URL_, PUBLISHABLE, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Creates (if needed) a confirmed test student and returns a client signed in as them. */
export async function signedInStudent(admin: Client, email: string, name: string): Promise<{ client: Client; userId: string }> {
  const created = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: name } });
  if (created.error && !/already/i.test(created.error.message)) throw created.error;
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;
  const client = anonClient();
  const { data, error } = await client.auth.verifyOtp({ type: "email", token_hash: link.data.properties.hashed_token });
  if (error || !data.user) throw error ?? new Error("no user");
  await admin.from("profiles").update({ full_name: name }).eq("id", data.user.id).is("full_name", null);
  return { client, userId: data.user.id };
}

/** Removes every booking of the given users (test isolation). */
export async function wipeBookings(admin: Client, userIds: string[]) {
  if (userIds.length === 0) return;
  await admin.from("slot_reservations").delete().in("user_id", userIds);
  await admin.from("bookings").delete().in("user_id", userIds);
}

/** First free slot of `date` among `preferred` hours (avoids colliding with seed data). */
export async function freeSlot(admin: Client, date: string, preferred = ["18:00", "17:00", "16:00", "15:00", "14:00", "13:00"]): Promise<string> {
  const { data } = await admin.rpc("occupied_slots", { p_from: date, p_to: date });
  const taken = new Set((data ?? []).map((r) => r.slot_start.slice(0, 5)));
  const free = preferred.find((h) => !taken.has(h));
  if (!free) throw new Error(`No free test slot on ${date}`);
  return free;
}
