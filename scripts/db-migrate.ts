/**
 * Applies supabase/migrations/*.sql to the database in DATABASE_URL, in order,
 * each in its own transaction. Applied versions are recorded in
 * supabase_migrations.schema_migrations (the same table the Supabase CLI uses),
 * so `supabase db push` and this script can be mixed.
 *
 *   npm run db:migrate            apply pending migrations
 *   npm run db:migrate -- --status
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { loadEnv, requireEnv } from "./env";

loadEnv();
const statusOnly = process.argv.includes("--status");
const url = requireEnv("DATABASE_URL");
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const sql = postgres(url, { max: 1, prepare: false, ssl: local ? false : "require", onnotice: () => undefined });

async function main() {
  await sql.unsafe(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text
    );
  `);
  const applied = new Set((await sql<{ version: string }[]>`select version from supabase_migrations.schema_migrations`).map((r) => r.version));
  const dir = path.resolve(process.cwd(), "supabase", "migrations");
  const files = (await readdir(dir)).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();

  let ran = 0;
  for (const file of files) {
    const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
    const name = rest.join("_");
    if (applied.has(version!)) {
      if (statusOnly) console.log(`  ✓ ${file}`);
      continue;
    }
    if (statusOnly) {
      console.log(`  · ${file} (pendiente)`);
      continue;
    }
    const content = await readFile(path.join(dir, file), "utf8");
    process.stdout.write(`→ ${file} … `);
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`insert into supabase_migrations.schema_migrations (version, name, statements) values (${version!}, ${name}, ${[content]})`;
    });
    console.log("ok");
    ran++;
  }
  if (!statusOnly) console.log(ran === 0 ? "No hay migraciones pendientes." : `${ran} migraciones aplicadas.`);
}

main()
  .catch((e) => {
    console.error("\n✗", (e as Error).message);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
