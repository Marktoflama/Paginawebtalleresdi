"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { fullNameSchema } from "@/lib/auth/domain";
import { safeNextPath } from "@/lib/auth/redirect";
import { BOOKING_ERROR_MESSAGES } from "@/lib/booking/errors";
import { runJobsQuietly } from "@/lib/jobs/worker";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ProfileState {
  status: "idle" | "error";
  message?: string;
  fieldError?: string;
  value?: string;
}

export async function saveFullName(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const raw = String(formData.get("full_name") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const parsed = fullNameSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldError: parsed.error.issues[0]?.message, value: raw };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: BOOKING_ERROR_MESSAGES.BACKEND_UNAVAILABLE, value: raw };
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect(`/acceso?next=${encodeURIComponent("/bienvenida")}`);

  const { error } = await supabase.from("profiles").update({ full_name: parsed.data }).eq("id", userId);
  if (error) {
    console.error("[profile] update failed:", error.message);
    return { status: "error", message: "No hemos podido guardar tu nombre. Inténtalo de nuevo.", value: raw };
  }
  // The DB trigger queued an "excel.student" job (Registros sheet); process it now.
  after(runJobsQuietly);
  redirect(next);
}
