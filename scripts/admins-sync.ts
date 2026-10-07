/**
 * Copies ADMIN_EMAILS into private.allowed_emails so that admins whose address
 * is NOT @esdi.edu.es can still sign in (the signup hook and trigger only allow
 * the domain or this allowlist). Admin *authorisation* still comes from
 * ADMIN_EMAILS in the app. Removes stale admin entries.
 *
 *   npm run admins:sync
 */
import postgres from "postgres";
import { BOOKING_RULES } from "../src/config/booking";
import { loadEnv, requireEnv } from "./env";

loadEnv();
const url = requireEnv("DATABASE_URL");
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const sql = postgres(url, { max: 1, prepare: false, ssl: local ? false : "require", onnotice: () => undefined });

const admins = (process.env.ADMIN_EMAILS ?? "")
  .split(/[\s,;]+/)
  .map((e) => e.trim().toLowerCase())
  .filter((e) => e.includes("@"));
const outside = admins.filter((e) => !e.endsWith(`@${BOOKING_RULES.allowedDomain}`));

async function main() {
  await sql.begin(async (tx) => {
    await tx`delete from private.allowed_emails where reason = 'admin' and not (email = any(${outside}::extensions.citext[]))`;
    for (const email of outside) {
      await tx`insert into private.allowed_emails (email, reason) values (${email}, 'admin') on conflict (email) do nothing`;
    }
  });
  console.log(`Admins: ${admins.length}. Fuera de @${BOOKING_RULES.allowedDomain} y autorizados para entrar: ${outside.length ? outside.join(", ") : "ninguno"}.`);
}

main()
  .catch((e) => {
    console.error("✗", (e as Error).message);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
