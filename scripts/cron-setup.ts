/**
 * Stores the job-runner URL and bearer secret in Supabase Vault so pg_cron can
 * call /api/jobs/run every 5 minutes (migration 0009). Run after deploying.
 *
 *   npm run cron:setup
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/types";
import { isLocalUrl, loadEnv, requireEnv } from "./env";

loadEnv();
const site = requireEnv("NEXT_PUBLIC_SITE_URL").replace(/\/+$/, "");
const secret = requireEnv("CRON_SECRET");
if (secret.length < 16) {
  console.error("✗ CRON_SECRET debe tener al menos 16 caracteres.");
  process.exit(1);
}
if (isLocalUrl(site) && !process.argv.includes("--force")) {
  console.error("✗ NEXT_PUBLIC_SITE_URL es local: Supabase no puede llamar a localhost. Despliega primero (o usa --force).");
  process.exit(1);
}

const supabase = createClient<Database>(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { error } = await supabase.rpc("cron_configure", { p_url: `${site}/api/jobs/run`, p_secret: secret });
  if (error) throw new Error(error.message);
  console.log(`✓ pg_cron llamará a ${site}/api/jobs/run cada 5 minutos.`);
}

main().catch((e) => {
  console.error("✗", (e as Error).message);
  process.exitCode = 1;
});
