import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

/** Media queries used with gsap.matchMedia(): every effect has a reduced-motion branch. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const MOTION_REDUCED = "(prefers-reduced-motion: reduce)";

/**
 * ESDI's measured CSS curves, registered as GSAP eases so GSAP timings match
 * the reference exactly (DESIGN.md › Motion):
 *   esdiStd  cubic-bezier(.4,0,.2,1)   Tailwind default: tiles, button, accordion
 *   esdiOut  cubic-bezier(0,0,.58,1)   CSS ease-out: menu/dialog open
 *   esdiIn   cubic-bezier(.42,0,1,1)   CSS ease-in: menu/dialog close
 */
let registered = false;

export function setupGsap(): typeof gsap {
  if (registered || typeof window === "undefined") return gsap;
  gsap.registerPlugin(useGSAP, CustomEase, ScrollTrigger);
  CustomEase.create("esdiStd", "0.4,0,0.2,1");
  CustomEase.create("esdiOut", "0,0,0.58,1");
  CustomEase.create("esdiIn", "0.42,0,1,1");
  registered = true;
  return gsap;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MOTION_REDUCED).matches;
}

export { gsap, ScrollTrigger, useGSAP };
