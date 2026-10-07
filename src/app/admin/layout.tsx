import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/session";

/**
 * Guards the whole section before loading.tsx starts streaming, so non-admins
 * get a real 404 status (and no "Administración" title) instead of a 200 shell.
 * page.tsx and every action check again; getSession is cached per request.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return children;
}
