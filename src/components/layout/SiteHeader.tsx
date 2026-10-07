import Link from "next/link";
import type { SessionSummary } from "@/lib/auth/session";
import { SiteNav } from "./SiteNav";
import { Wordmark } from "./Wordmark";

/** ESDI header: fixed, white, 8px vertical padding, wordmark left, Menú + account right. Never hides on scroll. */
export function SiteHeader({ session }: { session: SessionSummary | null }) {
  return (
    <header className="fixed inset-x-0 top-0 z-(--z-header) flex items-center justify-between bg-canvas gutter-x py-2">
      <Link href="/" aria-label="Taller, inicio" className="block">
        <Wordmark />
      </Link>
      <SiteNav signedIn={Boolean(session)} isAdmin={Boolean(session?.isAdmin)} email={session?.email ?? null} />
    </header>
  );
}
