import { z } from "zod";
import { BOOKING_RULES } from "@/config/booking";

const LOCAL_PART = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Syntactically plausible address with exactly one `@`. */
export function isEmailLike(raw: string): boolean {
  const email = normalizeEmail(raw);
  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@") || at === email.length - 1) return false;
  const local = email.slice(0, at);
  const host = email.slice(at + 1);
  if (local.length > 64 || email.length > 254) return false;
  if (!LOCAL_PART.test(local) || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host);
}

/**
 * True only for `<local>@esdi.edu.es` exactly. Rejects look-alikes such as
 * `x@esdi.edu.es.evil.com`, `x@sub.esdi.edu.es` or `x@esdi.edu.es@gmail.com`.
 * The database applies the same rule (`private.is_allowed_email`).
 */
export function isAllowedEmail(raw: string, domain: string = BOOKING_RULES.allowedDomain): boolean {
  if (!isEmailLike(raw)) return false;
  const email = normalizeEmail(raw);
  return email.slice(email.indexOf("@") + 1) === domain;
}

export const DOMAIN_ERROR = `Solo se admiten correos @${BOOKING_RULES.allowedDomain}.`;

/**
 * Student address check shared by the access form (in the browser, before
 * submitting) and the server. `null` means the address may request a link.
 */
export function studentEmailError(raw: string): string | null {
  const email = normalizeEmail(raw);
  if (email.length === 0) return "Escribe tu correo.";
  if (!isEmailLike(email)) return "Escribe un correo válido.";
  return isAllowedEmail(email) ? null : DOMAIN_ERROR;
}

export const studentEmailSchema = z
  .string({ error: "Escribe tu correo." })
  .transform(normalizeEmail)
  .superRefine((email, ctx) => {
    const message = studentEmailError(email);
    if (message) ctx.addIssue({ code: "custom", message });
  });

export const fullNameSchema = z
  .string({ error: "Escribe tu nombre y apellidos." })
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(2, "Escribe tu nombre y apellidos.")
      .max(120, "El nombre es demasiado largo (máximo 120 caracteres).")
      .regex(/^[\p{L}\p{M}' .-]+$/u, "Usa solo letras, espacios, apóstrofos o guiones."),
  );

export const otpSchema = z
  .string({ error: "Escribe el código." })
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, "El código tiene 6 cifras."));
