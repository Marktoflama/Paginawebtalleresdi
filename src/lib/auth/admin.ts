import { normalizeEmail } from "./domain";

/** Admin allowlist from the ADMIN_EMAILS env var (comma or whitespace separated). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(/[\s,;]+/)
    .map(normalizeEmail)
    .filter((e) => e.includes("@"));
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(normalizeEmail(email));
}
