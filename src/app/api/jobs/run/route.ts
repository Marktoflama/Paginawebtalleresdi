import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runJobs } from "@/lib/jobs/worker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get("authorization") ?? "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Outbox worker endpoint, called by pg_cron + pg_net every 5 minutes (and usable by any external scheduler). */
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const summary = await runJobs({ limit: 50 });
    if (!summary) return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    console.error("[jobs/run]", (e as Error).message);
    return NextResponse.json({ ok: false, error: "job run failed" }, { status: 500 });
  }
}
