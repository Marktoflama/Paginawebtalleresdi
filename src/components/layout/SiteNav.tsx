"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { OverlayDialog } from "@/components/ui/OverlayDialog";
import { Wordmark } from "./Wordmark";
import { menuActions, menuCategories, type NavViewer } from "./nav";

interface SiteNavProps extends NavViewer {
  email: string | null;
}

/** Header right cluster ("Menú" + account link, 40px apart) and the full-screen menu overlay. */
export function SiteNav({ signedIn, isAdmin, email }: SiteNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = useCallback(() => setOpen(false), []);

  // Close when the route changes (link inside the overlay was followed).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onHash = () => setOpen(false);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [open]);

  const viewer = { signedIn, isAdmin };
  const categories = menuCategories(viewer);
  const actions = menuActions(viewer);

  return (
    <nav aria-label="Principal" className="flex items-center gap-6 md:gap-10">
      <button
        type="button"
        className="type-nav link-reveal"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="menu-principal"
        onClick={() => setOpen(true)}
      >
        Menú
      </button>
      {signedIn ? (
        <Link href="/mis-reservas" className="type-nav link-reveal hidden min-[400px]:inline">
          Mis reservas
        </Link>
      ) : (
        <Link href="/acceso" className="type-nav link-reveal">
          Entrar
        </Link>
      )}

      <OverlayDialog
        open={open}
        onRequestClose={close}
        label="Menú"
        brand={
          <Link href="/" onClick={close} aria-label="Taller, inicio">
            <Wordmark />
          </Link>
        }
      >
        <div id="menu-principal" className="flex min-h-[calc(100dvh-7rem)] flex-col">
          <div className="grid w-full grid-cols-1 gap-8 pt-6 xl:grid-cols-4">
            <ul className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:col-span-2">
              {categories.map((cat) => (
                <li key={cat.title}>
                  <h2 className="type-display-md flex items-center justify-between rule-bottom pb-1.5">{cat.title}</h2>
                  <ul className="mt-2 px-2 md:px-4">
                    {cat.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={close}
                          aria-current={link.href === pathname ? "page" : undefined}
                          className="type-body-lg inline-block py-1 hover:text-muted aria-[current=page]:text-muted"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <div className="hidden xl:block" aria-hidden="true" />
            <ul className="flex flex-col gap-[35px]">
              {actions.map((action) => (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    onClick={close}
                    aria-current={action.href === pathname ? "page" : undefined}
                    className="type-display-md group flex items-center justify-between gap-4 rule-bottom pb-1.5 hover:text-muted aria-[current=page]:text-muted"
                  >
                    {action.label}
                    <ArrowRight aria-hidden="true" weight="bold" className="size-8 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-10">
            {signedIn ? (
              <form action="/auth/salir" method="post" className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="type-body-lg break-all">{email}</span>
                <button type="submit" className="type-body-lg link-inline">
                  Salir
                </button>
              </form>
            ) : (
              <Link href="/acceso" onClick={close} className="type-body-lg link-inline">
                Entrar con tu correo @esdi.edu.es
              </Link>
            )}
            <span className="type-body-lg uppercase" lang="es" title="Idioma: español">
              es
            </span>
          </div>
        </div>
      </OverlayDialog>
    </nav>
  );
}
