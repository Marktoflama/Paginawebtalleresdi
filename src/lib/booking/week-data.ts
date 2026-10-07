import "server-only";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { trimSeconds } from "./format";
import type { OccupiedSlot } from "./slots";

/** Occupied slots of a date range for the signed-in student (times + "mine" only). */
export async function fetchOccupied(supabase: SupabaseServerClient, from: string, to: string): Promise<OccupiedSlot[]> {
  const { data, error } = await supabase.rpc("get_week_slots", { p_from: from, p_to: to });
  if (error) throw new Error(`get_week_slots: ${error.message}`);
  return (data ?? []).map((r) => ({ date: r.slot_date, start: trimSeconds(r.slot_start), mine: r.mine }));
}
