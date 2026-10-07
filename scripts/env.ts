import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";

/** Load .env.local then .env (same precedence as Next.js) for the CLI scripts. */
export function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const p = path.resolve(process.cwd(), file);
    if (existsSync(p)) config({ path: p, override: false, quiet: true });
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`✗ Falta la variable ${name} en .env.local`);
    process.exit(1);
  }
  return value;
}

export function isLocalUrl(url: string | undefined): boolean {
  if (!url) return true;
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
  } catch {
    return true;
  }
}
