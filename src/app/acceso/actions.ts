"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { siteUrl } from "@/config/site";
import { isAdminEmail } from "@/lib/auth/admin";
import { DOMAIN_ERROR, isAllowedEmail, isEmailLike, normalizeEmail, otpSchema } from "@/lib/auth/domain";
import { safeNextPath } from "@/lib/auth/redirect";
import { BOOKING_ERROR_MESSAGES } from "@/lib/booking/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AccessState {
  status: "idle" | "error";
  message?: string;
  fieldError?: string;
  email?: string;
}

const OTP_COOKIE = "taller_otp_email";

export async function requestAccess(_prev: AccessState, formData: FormData): Promise<AccessState> {
  const raw = String(formData.get("email") ?? "");
  const email = normalizeEmail(raw);
  const next = safeNextPath(String(formData.get("next") ?? ""));

  if (!email) return { status: "error", fieldError: "Escribe tu correo.", email: raw };
  if (!isEmailLike(email)) return { status: "error", fieldError: "Escribe un correo válido.", email: raw };
  // Server-side check (the database enforces it again: Auth hook + trigger).
  if (!isAllowedEmail(email) && !isAdminEmail(email)) return { status: "error", fieldError: DOMAIN_ERROR, email: raw };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: BOOKING_ERROR_MESSAGES.BACKEND_UNAVAILABLE, email: raw };

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl()}/auth/confirmar?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    if (error.status === 429 || /rate limit|security purposes/i.test(error.message)) {
      return { status: "error", message: "Has pedido varios enlaces seguidos. Espera un minuto y vuelve a intentarlo.", email: raw };
    }
    if (error.status === 403 || error.status === 422 || /not allowed|solo se admiten|database error saving new user/i.test(error.message)) {
      return { status: "error", fieldError: DOMAIN_ERROR, email: raw };
    }
    console.error("[auth] signInWithOtp failed:", error.status, error.message);
    return { status: "error", message: "No hemos podido enviar el correo. Inténtalo de nuevo en unos minutos.", email: raw };
  }

  const cookieStore = await cookies();
  cookieStore.set(OTP_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  redirect(`/acceso/codigo?next=${encodeURIComponent(next)}`);
}

export async function verifyCode(_prev: AccessState, formData: FormData): Promise<AccessState> {
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const cookieStore = await cookies();
  const email = cookieStore.get(OTP_COOKIE)?.value;
  if (!email) {
    return { status: "error", message: "No sabemos a qué correo enviamos el código. Vuelve a pedir el acceso." };
  }
  const parsed = otpSchema.safeParse(String(formData.get("code") ?? ""));
  if (!parsed.success) return { status: "error", fieldError: parsed.error.issues[0]?.message ?? "Código no válido." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: BOOKING_ERROR_MESSAGES.BACKEND_UNAVAILABLE };

  const { data, error } = await supabase.auth.verifyOtp({ email, token: parsed.data, type: "email" });
  if (error || !data.user) {
    return { status: "error", fieldError: "El código no es correcto o ha caducado. Pide uno nuevo si hace falta." };
  }
  cookieStore.delete(OTP_COOKIE);
  await redirectAfterSignIn(data.user.id, next);
  return { status: "idle" };
}

export async function confirmMagicLink(_prev: AccessState, formData: FormData): Promise<AccessState> {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "email");
  const next = safeNextPath(String(formData.get("next") ?? ""));
  if (!tokenHash) return { status: "error", message: "El enlace no es válido. Vuelve a pedir el acceso." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: BOOKING_ERROR_MESSAGES.BACKEND_UNAVAILABLE };

  // Magic-link and signup-confirmation hashes both verify as type "email".
  void type;
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error || !data.user) {
    return {
      status: "error",
      message: "El enlace ha caducado o ya se ha usado. Pide un acceso nuevo, o usa el código de 6 cifras del correo.",
    };
  }
  await redirectAfterSignIn(data.user.id, next);
  return { status: "idle" };
}

async function redirectAfterSignIn(userId: string, next: string): Promise<never> {
  const supabase = await createSupabaseServerClient();
  const { data: profile } = supabase
    ? await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle()
    : { data: null };
  if (!profile?.full_name) redirect(`/bienvenida?next=${encodeURIComponent(next)}`);
  redirect(next);
}
