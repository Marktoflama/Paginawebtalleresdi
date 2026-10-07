/**
 * Hero collage choreography, reconstructed from the esdi.es hero video
 * (design/screenshots/20-22): two photo slots (left around T·A·L, right around
 * L·E·R), each image held 1.8–2.4 s, the two slots offset by ≈1 s, every change
 * a hard cut. Loop ≈ 11.3 s.
 *
 * Geometry is in % of the lockup box. `layer` = index of the glyph the shot is
 * drawn after (-1 = behind every glyph): a shot sits in front of glyph `layer`
 * and behind glyph `layer + 1`, reproducing ESDI's image/letter interleave.
 *
 * Glyph ink spans (% of width): T 0–14.2 · A 18.3–35.0 · L 39.1–50.7 ·
 * L 54.8–66.4 · E 70.5–82.1 · R 86.2–100. Cap band: 13.7–86.3 % of height.
 *
 * To use real photos, replace the files in public/placeholders/ (same names).
 */
export interface HeroShot {
  id: string;
  slot: "left" | "right";
  /** Image path, or an accent fill for solid blocks. */
  src?: string;
  fill?: "green" | "red" | "blue" | "yellow";
  x: number;
  y: number;
  w: number;
  h: number;
  layer: number;
  /** Seconds within the loop. */
  in: number;
  out: number;
}

export const HERO_LOOP_SECONDS = 11.3;

export const HERO_SHOTS: HeroShot[] = [
  { id: "l1", slot: "left", src: "/placeholders/hero-01.webp", x: 8, y: 6, w: 9.5, h: 54, layer: 0, in: 0, out: 1.0 },
  { id: "l2", slot: "left", src: "/placeholders/hero-02.webp", x: 21, y: 50, w: 15, h: 40, layer: 1, in: 1.0, out: 3.0 },
  { id: "l3", slot: "left", fill: "yellow", x: 12, y: 14, w: 8, h: 34, layer: -1, in: 3.0, out: 5.0 },
  { id: "l4", slot: "left", src: "/placeholders/hero-04.webp", x: 30, y: 10, w: 10, h: 50, layer: 1, in: 5.0, out: 6.7 },
  { id: "l5", slot: "left", src: "/placeholders/hero-06.webp", x: 4, y: 52, w: 16, h: 41, layer: -1, in: 6.7, out: 9.0 },
  { id: "l6", slot: "left", fill: "red", x: 33, y: 44, w: 7, h: 46, layer: 1, in: 9.0, out: 11.3 },
  { id: "r1", slot: "right", src: "/placeholders/hero-05.webp", x: 61, y: 5, w: 9, h: 55, layer: 2, in: 0, out: 2.0 },
  { id: "r2", slot: "right", src: "/placeholders/hero-08.webp", x: 77, y: 47, w: 12, h: 45, layer: 4, in: 2.0, out: 4.0 },
  { id: "r3", slot: "right", src: "/placeholders/hero-03.webp", x: 56, y: 34, w: 16, h: 36, layer: 3, in: 4.0, out: 5.8 },
  { id: "r4", slot: "right", fill: "blue", x: 84, y: 6, w: 8, h: 40, layer: 4, in: 5.8, out: 8.2 },
  { id: "r5", slot: "right", src: "/placeholders/hero-07.webp", x: 67, y: 45, w: 11, h: 48, layer: 3, in: 8.2, out: 11.3 },
];

export const ACCENT_HEX: Record<NonNullable<HeroShot["fill"]>, string> = {
  green: "#69aa96",
  red: "#e65541",
  blue: "#7896c8",
  yellow: "#fadc32",
};
