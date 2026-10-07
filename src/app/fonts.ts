import { Barlow_Condensed, Inter_Tight, Roboto_Condensed } from "next/font/google";

/** Display face, substitute for ESDI's proprietary FramerSans 700 (see DESIGN.md). */
export const displayFont = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

/** Wordmark face, substitute for the ESDI logo letterforms (2.2% proportion error). */
export const wordmarkFont = Roboto_Condensed({
  subsets: ["latin"],
  weight: ["900"],
  variable: "--font-roboto-condensed",
  display: "swap",
});

/** Text face, substitute for Helvetica Light. 300 at >= 18px, 400 below. */
export const textFont = Inter_Tight({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400"],
  variable: "--font-inter-tight",
  display: "swap",
});
