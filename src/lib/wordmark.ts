/**
 * Geometry of the "TALLER" wordmark set in Roboto Condensed 900, in font units
 * (font-size = 1000). Measured with canvas `measureText` on the Google Fonts
 * build that next/font self-hosts. Using fixed metrics lets the SVG render
 * server-side at its final size: no client measurement, no layout shift.
 */
export const WORDMARK_FONT_SIZE = 1000;
export const CAP_HEIGHT = 718.8;

interface GlyphMetrics {
  /** Advance width. */
  advance: number;
  /** Ink starts this far right of the glyph origin. */
  inkLeft: number;
  /** Ink ends this far right of the glyph origin. */
  inkRight: number;
}

const GLYPHS: Record<string, GlyphMetrics> = {
  T: { advance: 554.7, inkLeft: 15.6, inkRight: 531.3 },
  A: { advance: 605.5, inkLeft: 0, inkRight: 609.4 },
  L: { advance: 479, inkLeft: 46.9, inkRight: 468.8 },
  E: { advance: 488.3, inkLeft: 46.9, inkRight: 468.8 },
  R: { advance: 566.9, inkLeft: 46.9, inkRight: 546.9 },
};

/** ESDI hero ratios measured on the 1440 frame: gap 56/1364.8 of width, cap 558/767.7 of height. */
export const ESDI_GAP_RATIO = 56 / 1364.8;
export const ESDI_CAP_RATIO = 558 / 767.7;

export interface PlacedGlyph {
  char: string;
  /** SVG text x (glyph origin). */
  x: number;
  inkStart: number;
  inkEnd: number;
}

export interface WordmarkLayout {
  width: number;
  height: number;
  /** SVG text y (baseline). */
  baseline: number;
  glyphs: PlacedGlyph[];
}

function metrics(char: string): GlyphMetrics {
  const m = GLYPHS[char];
  if (!m) throw new Error(`No wordmark metrics for "${char}"`);
  return m;
}

/**
 * ESDI hero lockup: glyph *ink* justified edge to edge, equal gaps of
 * `gapRatio × width`, cap height = `capRatio × height`, vertically centred.
 */
export function justifiedLayout(word: string, gapRatio = ESDI_GAP_RATIO, capRatio = ESDI_CAP_RATIO): WordmarkLayout {
  const chars = [...word];
  const inkSum = chars.reduce((sum, c) => sum + (metrics(c).inkRight - metrics(c).inkLeft), 0);
  const width = inkSum / (1 - (chars.length - 1) * gapRatio);
  const gap = gapRatio * width;
  const height = CAP_HEIGHT / capRatio;
  const baseline = (height + CAP_HEIGHT) / 2;
  let cursor = 0;
  const glyphs = chars.map((char) => {
    const m = metrics(char);
    const placed = { char, x: cursor - m.inkLeft, inkStart: cursor, inkEnd: cursor + (m.inkRight - m.inkLeft) };
    cursor = placed.inkEnd + gap;
    return placed;
  });
  return { width, height, baseline, glyphs };
}

/** Logo setting: natural advances, viewBox cropped to the ink. */
export function tightLayout(word: string): WordmarkLayout {
  const chars = [...word];
  let origin = 0;
  const raw = chars.map((char) => {
    const m = metrics(char);
    const placed = { char, x: origin, inkStart: origin + m.inkLeft, inkEnd: origin + m.inkRight };
    origin += m.advance;
    return placed;
  });
  const offset = raw[0]?.inkStart ?? 0;
  const glyphs = raw.map((g) => ({ ...g, x: g.x - offset, inkStart: g.inkStart - offset, inkEnd: g.inkEnd - offset }));
  const width = Math.max(...glyphs.map((g) => g.inkEnd));
  return { width, height: CAP_HEIGHT, baseline: CAP_HEIGHT, glyphs };
}
