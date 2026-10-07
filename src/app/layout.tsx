import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SITE, siteUrl } from "@/config/site";
import { getSession } from "@/lib/auth/session";
import { displayFont, textFont, wordmarkFont } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE.title, template: "%s · Taller" },
  description: SITE.description,
  robots: { index: false, follow: false },
  openGraph: {
    title: SITE.title,
    description: SITE.description,
    locale: "es_ES",
    type: "website",
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  return (
    <html
      lang="es"
      // Smooth scrolling is for in-page anchors (M14); Next skips it on route changes with this flag.
      data-scroll-behavior="smooth"
      className={`${displayFont.variable} ${wordmarkFont.variable} ${textFont.variable}`}
    >
      <body>
        <a
          href="#contenido"
          className="type-body-lg sr-only fixed top-2 left-2 z-(--z-overlay) bg-yellow px-4 py-2 focus:not-sr-only"
        >
          Saltar al contenido
        </a>
        <SiteHeader session={session} />
        <main id="contenido" tabIndex={-1} className="pt-(--header-offset) outline-none">
          {children}
        </main>
        <SiteFooter session={session} />
      </body>
    </html>
  );
}
