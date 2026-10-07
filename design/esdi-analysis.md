# esdi.es — Phase 0 analysis

Reference: <https://esdi.es/> (ESDI, Escola Superior de Disseny).
Captured: 2026-10-07 with Playwright MCP (Chromium), cookies **denied** ("Denegar") through the Complianz consent dialog. Viewports 1440×900, 1024×768, 768×1024 and 390×844.
Pages: home (`/`), `/estudios/grado-en-diseno/` and `/noticias/`.

This report documents ESDI's design system so the TALLER booking app can reproduce its look, layout and motion. No ESDI asset (video, photos, logo, font files) is reused. Substitute fonts and placeholders are specified in §2.4 and in `../DESIGN.md`.

> **Measurement notes.** The capture machine runs Windows at 125 % scaling, so Chromium reports 1 CSS px borders as `0.8px`. Read every `0.8px` as **1px**. On Windows the 1440 viewport also includes a 15 px classic scrollbar, so the content width is 1425 px. `vw`-based tokens are still computed against the full 1440.

---

## 0. Executive summary

1. **Stack.** WordPress with a custom `_tw` theme on **Tailwind CSS v4.1.3**. Libraries: **GSAP 3.12.2 core only** (no ScrollTrigger and no other plugin registered), **Splide 4.1.4** (loaded, but not mounted on the home page) and Complianz for cookie consent. There is no smooth-scroll library and no page-transition library: it's a classic MPA with full page reloads.
2. **The hero is a video, not DOM.** `Video-Home-ESDI-V4.mp4` is 1920×1080 and plays as a muted, autoplaying, inline loop of **11.31 s**. It shows a static black "ESDI" wordmark with photos that **hard-cut** in and out of two slots (left and right). Each cut is a single frame: no fade, no scale, no easing. The photos sit **between glyphs in z-order** (in front of one letter, behind the next). Nothing is masked, clipped or blended.
3. **There is no scroll-driven motion at all.** `gsap.globalTimeline` is empty. Across 8 scroll positions every probed element kept `transform: none`, `opacity: 1` and `clip-path: none`, and moved exactly 1:1 with the scroll. The 27-frame scroll sequence confirms it (`screenshots/23-…`).
4. **The motion vocabulary is "cuts plus a few short fades".** Instant colour swaps on hover; a 300 ms overlay fade on gallery tiles; a 250/200 ms menu fade in and out with a 300 ms content fade-up; a 200 ms button inversion; a 350 ms accordion. The only GSAP code is the **award image trail**: clones spawn under the cursor and fade out after 1.5 s over 0.4 s with `power2.inOut`.
5. **Type system.** Two families: **FramerSans 700** (proprietary condensed grotesque, always uppercase) for display, and **"Helvetica" 300** for everything else (it resolves to Arial 400 on Windows). Sizes come from fluid `clamp()` tokens. The hero/footer wordmark uses a *third*, heavier semi-condensed face (the ESDI logo letterforms), baked into the video and SVGs.
6. **Colour.** Pure black on pure white. One resting surface grey, **#e2e4e7**, and four accents (**#69aa96 green, #e65541 red, #7896c8 blue, #fadc32 yellow**) used *only* as solid fills that appear on hover, cycling by position, always with **black** text. No semantic colours (no success/error palette) anywhere.
7. **Geometry.** Full-bleed layout with **no max-width container**. Side gutters are 30 px (16 px below 768). The grid is 4 columns. Every divider is a **1 px solid black rule**. **Radius 0** and **no shadows** everywhere (the one exception is a Tailwind `shadow-lg` on the language dropdown).
8. **Weak points to improve.** Text as small as 10–12 px; a 300 weight at small sizes; focus outlines suppressed on accordions and inputs; hover grey #a7a7a7 at 2.41:1; fake links (`href="#"`, `javascript:void(0)`); a looping video with no pause control; `prefers-reduced-motion` ignored; no Escape key in the menu overlay; an agenda table with no header cells.

---

## 1. Structure & layout

### 1.1 Home: section inventory (accessibility snapshot: `a11y-snapshots/home-1440.yml`)

| # | Section (`id`) | Content | y / height @1440 | @1024 | @768 | @390 |
|---|---|---|---|---|---|---|
| — | `header#masthead` | Logo (75×31.8 SVG) · "Menú" · "ES" | fixed, h 56 | h 51.7 | h 49 | h 47.8 |
| 1 | `video_fullwidth-1` | 16:9 autoplay video (hero wordmark) | 82 / 767.7 | 82 / 533.7 | 82 / 389.7 | 82 / 193.1 |
| 2 | `header-2` | h1 "ESCOLA SUPERIOR / DE DISSENY" | 849.7 / 382.2 | 615.7 / 261.6 | 471.7 / 197.2 | 275.1 / 141 |
| 3 | `parrafo_imagen-4` | Lead sentence with 2 image-reveal links | 1321.9 / 118.8 | 967.3 / 84.5 | 758.9 / 63.4 | 461 / 125.5 |
| 4 | `oferta_academica-5` | h2 "OFERTA ACADÉMICA" + 4 feature cards | 1530.7 / 763.5 | 1141.7 / 631.2 | 912.3 / 722.6 | 631.5 / 509.4 |
| 5 | `reconocimientos-6` (`.awardsHover`) | h2 "RECONOCIMIENTOS" + 2-col label / ruled list + cursor image trail | 2384.3 / 878.5 | 1862.9 / 791.8 | 1724.8 / 738.5 | 1185.9 / 865.8 |
| 6 | `proyectos_alumnos-7` | 4-tile asymmetric gallery | 3352.8 / 494.6 | 2744.7 / 343.8 | 2553.3 / 1004.2 | 2096.7 / 497.5 |
| 7 | `agenda-8` | h2 "AGENDA" + events table (6 rows) | 3937.3 / 647.8 | 3178.5 / 577.9 | 3647.5 / 545.7 | 2639.2 / 838.9 |
| 8 | `noticias-9` | h2 "NOTICIAS" + "Ver todo" + 4 news cards | 4675.1 / 667.2 | 3846.4 / 581.9 | 4283.1 / 519.5 | 3523 / 734.1 |
| — | `footer#colophon` | partner-logo strip · 4 info columns · giant wordmark · legal row | 5432.3 / 590.1 | 4518.3 / 503.2 | 4892.7 / 566 | 4302.1 / 566.4 |
| | **Document height** | | **6022** | 5022 | 5458 | 4869 |

Landmarks: skip link "Skip to content" → `banner` → `navigation "Main Navigation"` → `main` → `contentinfo` (with `navigation "Footer Menu"`, `"Footer Menu Social"`, `"Footer Legal"`). Every section title is an `h2` holding a `<p>`; the cards use `h3`.

### 1.2 Page frame

| Property | Value | Source |
|---|---|---|
| Side gutter (`.block-padding`) | **16 px** below 768 · **30 px** at ≥ 768 | CSS + measured `x=16 / x=30` |
| Container | **none**: content spans viewport − 2 × gutter at every width (1364.8 px @1440) | measured |
| Header | `position: fixed; top: 0; z-index: 50; background: #fff`, padding `8px 30px` (`8px 16px` mobile). Never hides on scroll | CSS, scroll probe |
| Body offset | `body { padding-top: 82px }`, so the first content starts 26 px below the 56 px header at 1440 | CSS |
| Logo | `width: 75px; height: auto` (31.8 px tall), same at every width | CSS |
| Nav cluster | `gap: 40px` (`gap-10`) between "Menú" and "ES" | markup |

### 1.3 Grid

* **4-column grid, zero gutter, borders collapsed** for feature cards (`grid-cols-2 lg:grid-cols-4 gap-0`): 341.2 px columns @1440, 237.2 @1024, 2 × 346.4 @768, 2 × 171.6 @390.
* **4-column grid with a 1 vw gap** for news and the footer legal row (14.4 px gap @1440, 10.24 @1024, 7.68 @768, 10 px fixed on mobile).
* **8-column footer grid** at ≥ 1024 (`lg:grid-cols-8 lg:gap-[1vw]`): links span 2, Sabadell address spans 3, Barcelona address spans 2, social spans 1. Below 1024 it becomes 2 columns.
* **Agenda table columns:** 25 % date · auto title · 25 % CTA.
* **Awards:** `grid-cols-2`, `gap-x` 16 px (8 px mobile); the label is on the left, the ruled list on the right.
* **Project gallery** (`.grid-alumnos-home.short`): 4 cols × 2 rows. Tile 1 sits at (r1,c1) and tile 2 at (r2,c1), both 465:337 crops; tile 3 spans c2 over 2 rows; tile 4 spans c3–4 over 2 rows. Below 768 it becomes 2 columns and tile 4 goes full width.

### 1.4 Vertical rhythm (measured margins)

| Token (ESDI class) | < 768 | ≥ 768 | Used for |
|---|---|---|---|
| `separator-y-1` | **45 px** | **90 px** | gap after every home section |
| `separator-y-2` | 25 px | 55 px | inner-page sections, news-card bottom |
| `separator-y-3` | 35 px | 35 px | under the RECONOCIMIENTOS title |
| Title → content | `pb-6` = **24 px**, then `mt-3` = **12 px** | same | h2 padding + grid top margin |
| Ruled-row padding | `py-4` = 16 px | `py-3.5` = **14 px** | award rows, key/value rows, accordions, agenda cells (14 top / 20 bottom) |
| Card inner padding | 8 px | **16 px** | feature cards |
| Footer blocks | 16 px (logos strip) · 20 px (menu block) · 8 px (wordmark) · 12 px (legal) | same | |

Tailwind's spacing unit is `--spacing: 0.25rem` (4 px).

### 1.5 Separators

* `border-top: 1px solid #000` opens each list or table under its title (awards, agenda, inner-page section bodies).
* `border-bottom: 1px solid #000` closes every list row, with `last:border-b-0` on the final one.
* Feature cards collapse borders. Every card gets `border-top/right/bottom`; only the first gets `border-left` (`:first-child … !important`).
* The footer frames the partner-logo strip with a 1 px top and bottom rule. The legal row has a 1 px top rule.
* The menu overlay underlines each category heading and each CTA link with a 1 px rule (`border-b-1`, `pb-1.5`).

### 1.6 Reflow across breakpoints (Tailwind v4 defaults: sm 640 · md 768 · lg 1024 · xl 1280)

| Element | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| Typography set | `*_mobile` tokens (vw-scaled from a ~462 px artboard) | desktop tokens switch on | desktop | desktop |
| Hero video | 343 × 193 | 693 × 390 | 949 × 534 | 1365 × 768 |
| Feature cards | 2 cols, 199:220 aspect, **description hidden**, 8 px padding | 2 cols, auto height, description shown | **4 cols** | 4 cols, 466:499 aspect (xl) |
| Awards | 2 cols (label wraps to 4 lines) | 2 cols | 2 cols | 2 cols |
| Gallery | 2 cols, tile 4 full width | 2 cols (`max-width: 48rem` rule), 1004 px tall | 4 cols | 4 cols |
| Agenda | rows **stack** (`td` becomes `display: block`): date large, category absolute top-right, title, CTA under it | table, 3 columns, small text (14 / 12 px) | table | table |
| News | 2 cols, 10 px gap | **4 cols**, 1 vw gap | 4 cols | 4 cols |
| Footer | 2 cols (links + Sabadell / social + Barcelona); horizontal wordmark (ESDI + 2 text lines) | 2 cols | **8-col grid** | 8 cols |
| Legal row | 1 col stacked | 4 cols | 4 cols | 4 cols |
| Menu overlay | 1 col, scrolls (1469 px content) | 1 col with a 2-col category list | same | **4-col grid** (xl): 2 category cols · empty · CTA col |

No horizontal overflow at any of the four widths (`scrollWidth ≤ innerWidth`).

---

## 2. Typography

### 2.1 Families

| Role | ESDI declaration | Actually rendered | Notes |
|---|---|---|---|
| Display | `"FramerSans", sans-serif` (only `@font-face` is weight 700, `font-display: swap`) | FramerSans 700 | Always uppercase. Tight leading (83–100 %). Negative tracking |
| Text | `"Helvetica", sans-serif`, **weight 300** set on `body` and on every text class | macOS: Helvetica Light. **Windows: Arial 400** (no 300 exists, so the browser substitutes) | All copy, nav, labels, tables, forms, footer |
| Wordmark | n/a: baked into `Video-Home-ESDI-V4.mp4`, `esdi-logo-black-v2.svg`, `logo-footer.svg` | heavy, semi-condensed, sharp-cornered grotesque | Measured proportions in §2.4 |

### 2.2 The fluid type system

The live system is the set of `--text-*` tokens below. Each is a linear `clamp(min, intercept + slope·vw, max)`.

The `--fluid-base-vw: 430 / --fluid-mobile-min: 290 / --fluid-desktop-start: 768 / --fluid-desktop-max: 2120` variables also exist. They feed a `.text-fluid` utility: `font-size = fluid-size × (100vw / 430)`, clamped to `[×290/430, ×768/430]` below 768 and `[×768/430, ×2120/430]` above. Only `.text-mobile-22 { --fluid-size: 22px }` sets it, and **no element on the analysed pages uses it** (0 matches). Treat it as dormant. The 768 and 2120 bounds do reappear inside the `--text-*` slopes.

**Desktop tokens** (applied at ≥ 768 through `md:` classes):

| Token | Formula | 768 | 1024 | 1440 | Ceiling |
|---|---|---|---|---|---|
| `--text-300px` | `clamp(7.273rem, 0rem + 15.152vw, 20.076rem)` | 116.4 | 155.2 | **218.2** | 321.2 @2120 |
| `--text-150px` | `clamp(6.25rem, 2.5rem + 3.125vw, 9.375rem)` | 100 | 100 | 100 | 150 |
| `--text-95px` / `--text-100px` | `clamp(3.125rem, 0.625rem + 3.125vw, 5.938rem)` | 50 | 50 | **55** | 95 |
| `--text-58px` | `clamp(1.875rem, 0.125rem + 2.5vw, 3.125rem)` | 30 | 30 | 38 | 50 @1920 |
| `--text-55px` | `clamp(1.333rem, 0rem + 2.778vw, 3.681rem)` | 21.3 | 28.4 | **40.0** | 58.9 @2120 |
| `--text-35px` | `clamp(1.563rem, 1.146rem + 0.868vw, 2.188rem)` | 25.0 | 27.2 | 30.8 | 35 @1920 |
| `--text-22px` | `clamp(1.375rem, 1.041rem + 0.695vw, 1.875rem)` | 22.0 | 23.8 | **26.7** | 30 @1920 |
| `--text-open-22px` | `clamp(0.875rem, 0.276rem + 0.935vw, 1.563rem)` | 14.0 | 14.0 | 17.9 | 25 |
| `--text-open-14px` | `clamp(0.75rem, 0.532rem + 0.34vw, 1rem)` | **12.0** | **12.0** | 13.4 | 16 |
| `--text-14px` | `clamp(0.625rem, 0.125rem + 0.5vw, 0.875rem)` | **10** | **10** | **10** | 14 @2400 |
| `--text-13_16px` | `clamp(0.813rem, 0.682rem + 0.213vw, 0.938rem)` | 13.0 | 13.1 | 14.0 | 15 @1920 |
| `--tracking-150px` | `clamp(-0.375rem, -0.5rem + 0.213vw, -0.125rem)` | −6.0 | −5.8 | −4.9 | −2 |

**Mobile tokens** (below 768). These are pure or near-pure `vw` scaling from a **~462 px artboard**: for example 67 / 0.14502 = 462, 22 / 0.04762 = 462 and 25 / 0.05411 = 462.

| Token | Formula | @390 | @375 | Min (narrow) |
|---|---|---|---|---|
| `--text-mobile-67px` | `clamp(2.629rem, 0rem + 14.502vw, 6.952rem)` | **56.6** | 54.4 | 42.1 |
| `--text-mobile-40px` | `clamp(1.744rem, 0.06rem + 8.983vw, 4.366rem)` | 36.0 | 34.6 | 27.9 |
| `--text-mobile-33px` | `clamp(1.461rem, 0.012rem + 7.73vw, 3.717rem)` | 30.4 | | |
| `--text-mobile-30px` | `clamp(1.308rem, 0.005rem + 6.949vw, 3.336rem)` | 27.2 | | |
| `--text-mobile-25px` | `clamp(0.981rem, 0rem + 5.411vw, 2.594rem)` | 21.1 | | |
| `--text-mobile-22px` | `clamp(0.863rem, 0rem + 4.762vw, 2.283rem)` | 18.6 | | 13.8 |
| `--text-mobile-18px` | `clamp(1.125rem, 1.005rem + 0.641vw, 1.313rem)` | 18.6 | | 18 |
| `--text-mobile-14px` | `clamp(0.567rem, 0rem + 3.021vw, 1.449rem)` | **11.8** | 11.3 | 9.1 |

Design reading: the pure-`vw` display token `--text-300px` (15.152 vw) makes every giant title a **fixed fraction of viewport width**. "RECONOCIMIENTOS" spans the full content width at every desktop size (1375.6 px @1440, 956.5 @1024, 698.5 @768). That proportional lock is the core of the ESDI look and must be reproduced exactly (see the width calibration in §2.4).

### 2.3 Role → class → computed style

| Role | ESDI class (desktop / mobile) | Family / weight | Size @1440 · @1024 · @768 · @390 | Line-height | Tracking | Case |
|---|---|---|---|---|---|---|
| h0 page / section title | `md:h0-framerSans` · `md:header-title` / `h1-framerSans_mobile`, `header-title_mobile` | FramerSans 700 | 218.2 · 155.2 · 116.4 · 56.6 | **0.83** | −0.02 em (h0) · `--tracking-150px` (header-title, awards) / −0.03 em mobile | UPPER |
| Optical left adjust | `md:header-title_left-adjust`, `h1-framerSans_mobile` | | `margin-left: −0.75vw` (x = 19.2 @1440 against a 30 px gutter) | | | |
| h2 sub-section | `md:h2-framerSans` / `h2-framerSans_mobile` | FramerSans 700 | 55 · 50 · 50 · 36.0 | 0.8774 | −0.01 em / −0.015 em | UPPER |
| h3 card title | same as h2 | FramerSans 700 | 55 · 50 · 50 · 36.0 | 0.8774 | −0.01 em | UPPER |
| Menu category / CTA | `.topmenu-item > a`, `.framer-menu-header` | FramerSans 700 | 30.8 · 27.2 · 25 · 36.0 | 1.0 / 0.8774 | −0.015 em | UPPER |
| Lead (h4) | `md:h4-helvetica` / `h4-helvetica_mobile` | Helvetica 300 | 40.0 · 28.4 · 21.3 · 21.1 | 0.99 | normal | as-is |
| Body large (h5) | `md:h5-helvetica` / `h5-helvetica_mobile` | Helvetica 300 | 26.7 · 23.8 · 22 · 18.6 | 0.99 (1.05 mobile) | normal | as-is |
| Body copy | `md:helvetica-22` | Helvetica 300 | 26.7 · 23.8 · 22 | **1.16** | normal | as-is |
| Table body ("open") | `md:h5-helvetica-open` | Helvetica 300 | 17.9 · 14 · 14 | 0.99 | normal | dates as-is, titles UPPER |
| Category / meta | `md:h6-helvetica-open` / `h6-helvetica_mobile` | Helvetica 300 | **13.4 · 12 · 12 · 11.8** | 0.99 | normal | as-is |
| Nav ("Menú", "ES", "Cerrar") | `md:text-22px` / `text-mobile-22px` | Helvetica 300 | 26.7 · 23.8 · 22 · 18.6 | 1.5 | normal | "ES" uppercase |
| Button | `.hs-button` | Helvetica 300 | 17.9 | 0.99 | **0.05 em** | UPPER |
| Form label / input | HubSpot form | Helvetica 300 | 26.7 | 0.99 | normal | as-is |
| Legal links / © | `.menu-footer-legal a` | Helvetica 300 | 14.0 · 13.1 · 13 · **11.8** | 1.0 | normal | as-is |

### 2.4 Substitute fonts (FramerSans and the wordmark face are proprietary)

The comparison was run on esdi.es itself, with the real FramerSans loaded, so every candidate was rendered with identical size and tracking. Evidence: `screenshots/70-font-comparison.png`, `71-hero-wordmark-substitute.jpg`, `72-corner-detail-E.png`, `73-hero-taller-lockup-preview-1440.png`.

**A. Display (FramerSans 700).** Two measurements:

* Width of "OFERTA ACADÉMICA" at 200 px, which decides line breaks of full-bleed titles.
* Per-glyph ink width ÷ cap height for E I S D O R A, which describes letter shape.

| Candidate | Word width vs FramerSans | Cap height vs FS | Glyph-shape error | Corners | Verdict |
|---|---|---|---|---|---|
| **Barlow Condensed 700** | **+1.9 %** | −3.4 % | 10.7 % (uniformly ~10 % wider glyphs, tighter sidebearings) | ~1 px rounding at 200 px; invisible ≤ 320 px | **Chosen** |
| Barlow Condensed 600 | −0.5 % | −4 % | — | | Visibly too light |
| Bebas Neue | −13.8 % | −4 % | 7.2 % (uniformly ~6 % narrower), stem −11 % | sharp | Breaks title widths; too light |
| Anton | +5.4 % | **+18 %** | — | sharp | Much taller x-height feel, too black |
| Oswald 700 | **+18.8 %** | +11 % | — | sharp | Too wide |
| League Gothic | −20.5 % | +1 % | — | sharp | Too narrow |
| Antonio 700 | +0.8 % | +18 % | 16.8 % | sharp | Caps far too tall |
| Sofia Sans Extra Condensed 800 | — | — | 9.0 % (H, D and O 14–17 % wide) | sharp | Close runner-up |

**Decision: Barlow Condensed 700 at `0.98 ×` ESDI's token sizes.** At 0.98 the word widths match FramerSans to within ±0.1 %, so every giant title fills and breaks exactly as on esdi.es. Cap height ends up 5 % shorter, which isn't perceptible. Barlow is DIN-derived like FramerSans, so the R, S, A and O construction matches visually (`70-font-comparison.png`).

**B. Wordmark face (hero video, header and footer logo).** Measured on the hero frame at 1440: E width / cap = **0.593**, stem / cap = **0.228**, S / cap = 0.679, D / cap = 0.649, sharp corners. Mean proportion error by candidate:

| Candidate | Error | Note |
|---|---|---|
| **Roboto Condensed 900** | **2.2 %** | Sharp corners. **Chosen** |
| Roboto Condensed 800 | 2.5 % | |
| Barlow Semi Condensed 800 | 3.2 % (3.9 % in run 1) | Corners visibly rounded at hero scale (`71-…`) |
| Archivo 900 wdth 62–68 | 7.0–8.9 % | |
| Hanken Grotesk 900 | 13.7 % | |
| Archivo 900 wdth 100–125 / Anybody | > 15 % | Far too wide |

Roboto Condensed 900, justified into the hero box, is near-indistinguishable from the ESDI frame (`71-hero-wordmark-substitute.jpg`, middle panel).

**C. Text (Helvetica 300).** Width of a 26.66 px sample sentence relative to Helvetica/Arial: Inter Tight 300 −4 %, Archivo 300 −3 %, Hanken 300 −2.6 %, Public Sans 300 +1.6 %, Inter 300 +3.4 %. **Decision: Inter Tight**, the closest neo-grotesque rhythm to Helvetica Light, self-hosted for identical rendering on every OS. Use **300 at ≥ 18 px** and **400 below 18 px**. That second rule is also faithful: Windows visitors to esdi.es already see 400, because Arial has no 300. Fallback stack: `"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif`.

### 2.5 Accessibility overrides (requested: body text never below 14 px)

| ESDI token | ESDI value | Override |
|---|---|---|
| `--text-14px` | 10 px at < 2400 px | removed; use the caption token |
| `--text-open-14px` (meta, categories, agenda CTA) | 12–13.4 px | `clamp(0.875rem, 0.657rem + 0.34vw, 1rem)`: **14 px** up to ~1030 px, 15.4 px @1440, 16 px max |
| `--text-mobile-14px` | 11.8 px @390 | **14 px** fixed (`0.875rem`) |
| `--text-13_16px` (legal) | 13–14 px | `clamp(0.875rem, 0.744rem + 0.213vw, 1rem)` |
| `--text-mobile-22px` floor | 13.8 px | floor raised to 0.875rem |
| weight 300 below 18 px | | 400 |

---

## 3. Colour & surfaces

### 3.1 Palette (from `:root` and confirmed by computed styles)

| Token (ESDI) | Hex | Where and when it appears | Contrast |
|---|---|---|---|
| `--color-black` | `#000000` | All text, all rules, wordmarks, button border, button hover fill | 21:1 on white |
| `--color-white` | `#ffffff` | Page, header, menu overlay, button hover text | — |
| `--color-box_bg` | **`#e2e4e7`** | **Resting** fill of the feature cards ("Oferta académica") | black on it: 16.5:1 |
| `--color-box_green` | **`#69aa96`** | Hover fill of feature card 1, 5…; gallery overlay on tile 3 | black: 7.8:1 · white: **2.7:1 ✗** |
| `--color-box_red` | **`#e65541`** | Hover fill of feature card 2, 6…; gallery overlay on tile 4 | black: 5.7:1 · white: **3.7:1 ✗** |
| `--color-box_blue` | **`#7896c8`** | Hover fill of feature card 3, 7…; gallery overlay on tile 1 | black: 7.0:1 · white: **3.0:1 ✗** |
| `--color-box_yellow` | **`#fadc32`** | Hover fill of feature card 4, 8…; gallery overlay on tile 2 | black: 15.4:1 |
| (literal) | **`#a7a7a7`** | Menu link and CTA hover colour (text and arrow SVG); current item in the "internacional" submenu | on white: **2.41:1 ✗** |
| `gray-100` (Tailwind) | `#f3f4f6` | Language dropdown item hover background | — |

**Accent rules observed:** (1) Accents only ever appear as **solid area fills**, never as text, borders or icons. (2) They appear **on interaction** (hover), except the gallery overlays, which also only show on hover. (3) The order **cycles by DOM position**: cards go green → red → blue → yellow (`nth-child(4n+1…4)`), gallery tiles go blue → yellow → green → red. (4) Text on an accent is always **black**. White on accents fails AA, so that rule is mandatory, not a style choice.

### 3.2 Borders, radii, shadows

* Borders: **1 px solid #000** without exception (rendered 0.8 px at DPR 1.25). Inputs use only `border-bottom`. The checkbox is a 16 px square with a 1 px border (`appearance: none`).
* Radii: **0** on every measured element (cards, buttons, inputs, images, menu, dropdown).
* Shadows: **none**, except the language dropdown (`0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1)`, Tailwind `shadow-lg`) and the third-party consent widget. The dropdown shadow is out of character; the build replaces it with a 1 px rule.
* Video background `#fefefe` is white after compression; treat it as `#ffffff`.

---

## 4. Motion

### 4.1 Method

* `window.gsap` → 3.12.2. `gsap.globalTimeline.getChildren(true,true,true)` → **`[]`** while idle. `window.ScrollTrigger` → **undefined**. Registered plugins: core eases, `CSSPlugin`, `AttrPlugin`, `SnapPlugin` and the like; **no ScrollTrigger, ScrollSmoother or SplitText**.
* Theme JS read in full: `script.min.js` (menu, accordions, sticky sub-nav, lazy-loading news, image-reveal links, logo justification) and `awards.js` (the only GSAP user).
* Every element was scanned for CSS `animation` and non-zero `transition`. Results: `oferta li` 150 ms colors; gallery `a` 300 ms colors; `.div-bg` 300 ms opacity; caption `all .3s ease`; button `.2s cubic-bezier(.4,0,.2,1)`; accordion `.35s cubic-bezier(.4,0,.2,1)`. CSS `@keyframes`: `menuSlideIn`, `menuSlideOut`, `contentFadeIn` and `spin` (loader).
* Scroll probe: `transform`, `opacity`, `clip-path` and `top` of 10 elements at scrollY 0…5600 in 800 px steps. Every value stayed static and `top` moved exactly 1:1. Viewport captures every 200 px: `screenshots/23-scroll-sequence-200px-1440.jpg`. The coloured blocks in a few of those frames are hover states under the parked cursor, not scroll effects.
* Hero video sampled every ~0.45 s across the full loop (`20-…`), then frame by frame (≈ 1/30 s) around a swap (`21-…`, `22-…`).
* Hover states driven with real pointer moves, with computed styles sampled every 40 ms.
* Menu opacity and transform sampled at ~0, 100, 250 and 450 ms after the click.

### 4.2 Hero wordmark: stop-motion collage

* **Lockup geometry (1440):** box 1364.8 × 767.7 (16:9, `object-fit: cover`), starting at y = 82. The four letters are justified edge to edge: E 30–361, S 415–794, D 850–1212, I 1268–1395 (absolute px). The **inter-letter gap ≈ 56 px = 4.1 % of box width**. **Cap height 558 px = 72.7 % of box height**, vertically centred with 105 px above and below.
* **Image slots:** a *left* slot around the E/S junction and a *right* slot around the D/I region. Images vary in size (≈ 150–260 px wide at 1440) and aspect (portrait, landscape, square). Each new image lands at a **new position and size**.
* **Layering:** each image is inserted **between glyph layers**, in front of one letter and behind the next. For example, the "green ruler" image covers the E's top arm but sits behind the S. The orange interior sits behind the S's curve.
* **Transition:** a **hard cut on a single frame** (`t = 0.970 s`: laptop → `t = 1.004 s`: orange interior; `22-hero-cut-frame-by-frame.jpg`). No fade, scale, blur or easing. Photos stay still between cuts; there's no Ken Burns.
* **Schedule (one 11.31 s loop, ≈ 10 cuts):**
  * Left slot: 0.0 laptop → 1.0 interior → ~3.0 figure with ruler → ~5.0 landscape (lower-left) → ~6.7 beach collage → ~9.0 yellow figure (lower-left) → 10.6 laptop returns (the two overlap until the loop restarts).
  * Right slot: 0.0 dark figure (top-right) → ~2.0 sculpture (lower-right) → ~4.0 flowers (inside the D counter) → ~5.8 statue (top-right) → ~8.2 lamp (lower-right) → loop.
  * Each slot **holds ≈ 1.8–2.4 s**, and the two slots are **offset by ≈ 1 s**, so a cut lands somewhere roughly every second.
* **Load:** the `poster` frame (static wordmark) shows until the video plays. `preload="auto"`, no loading animation, no intro sequence.
* **Scroll:** none; the video scrolls away normally.
* **Reduced motion:** ignored; the video keeps playing.

### 4.3 Motion spec table

| # | Element | Trigger | Animation (properties) | Duration | Easing | Delay / stagger | Evidence |
|---|---|---|---|---|---|---|---|
| M1 | Hero wordmark collage | Page load; infinite loop | Images swap position, size and content with **hard cuts**; 2 slots; z-order interleaved with glyphs | Loop 11.31 s; hold ≈ 1.8–2.4 s per image; cut = 1 frame | **none (steps)** | Left/right slots offset ≈ 1 s | `20`, `21`, `22` |
| M2 | Feature card (Oferta) | `:hover` (only when `hover: hover`) | `background-color` #e2e4e7 → accent (green, red, blue, yellow by position); text stays black | **0 ms** (instant: the 150 ms transition sits on the `li`, the colour changes on the child `a`) | — | — | `30-hover-oferta-card-*` |
| M3 | Gallery tile | `:hover` | Full-cover accent overlay `opacity 0 → 1` (hides the photo completely); caption (title + "by …", h5) `opacity 0 → 1` at top-left | 300 ms overlay · 300 ms caption | `cubic-bezier(.4,0,.2,1)` overlay · `ease` caption | none | `32-hover-project-tile-*` |
| M4 | Awards section | `mousemove` / `mouseenter` over the whole section | Clone a random award image at the cursor every **> 80 px** of travel: `translate(-50%,-50%) scale(0.6–1.1) rotate(−30°…30°)`, random `z-index` 0–9, `max-width: 20rem`, **appears instantly** | Hold **1500 ms**, then GSAP `to {opacity:0, scale:.5, rotation:+15°}` over **400 ms**, then removed | `power2.inOut` | Continuous trail | `31-hover-awards-image-trail.png` |
| M5 | Inline image-reveal link (intro) | `mouseenter` / `mouseleave` | 150 px image box shown at `left: 200px`, vertically centred on the hovered link, `z-index: 10`, over the text; underline removed | 0 ms (display toggle) | — | — | `33-hover-intro-link-image.png` |
| M6 | Text links (body, agenda CTA, footer, legal) | `:hover` | Underline 1 px (offset 2–3 px) **removed** | 0 ms | — | — | probe |
| M7 | "Ver todo", news category, news title, menu social and language links | `:hover` | **Inverse:** a hidden underline / `border-bottom` **appears** (transparent → #000) | 0 ms | — | — | probe |
| M8 | Outline button ("ENVIAR") | `:hover` | Invert: `background` transparent → #000, `color` #000 → #fff | **200 ms** | `cubic-bezier(.4,0,.2,1)` | — | `51-grado-form` |
| M9 | Menu overlay **open** | Click "Menú" | Overlay `opacity 0 → 1` (`menuSlideIn`, despite the name it's opacity only); inner content `opacity 0 → 1` + `translateY(10px → 0)` (`contentFadeIn`); body scroll-locked | **250 ms** overlay · **300 ms** content | `ease-out` · `ease-out` | Content delayed **100 ms**; **no per-item stagger** | samples: 0.05 @0 ms → 0.67 @~100 ms (overlay); content 0.11 + 8.9 px @~100 ms → 0.76 + 2.4 px @~250 ms |
| M10 | Menu overlay **close** | Click "Cerrar" or the backdrop | Overlay `opacity 1 → 0` (`menuSlideOut`), then `display: none` | **200 ms** | `ease-in` | — | samples 0.99 → 0.81 → 0.10 |
| M11 | Menu links and CTAs | `:hover` | `color` → #a7a7a7 (CTA arrow SVG fill too) | 0 ms | — | — | `41-menu-hover-secondary` |
| M12 | Accordion (FAQ, team) | Click | `max-height 0 ↔ scrollHeight`; "+" icon swaps to "−" instantly | **350 ms** | `cubic-bezier(.4,0,.2,1)` | — | `52`, `53` |
| M13 | Language dropdown | Click "ES" | `display` toggle | 0 ms | — | — | `43` |
| M14 | Anchor scroll | In-page `#` links | `html { scroll-behavior: smooth }`; sticky sub-nav offsets (inner pages) | browser | browser | — | CSS |
| M15 | Sticky sub-nav pills (inner pages only) | Scroll / drag | Scroll-spy at the 50 % viewport midline; drag with momentum (`step = v × 15`, friction × 0.94/frame); respects reduced motion | — | — | — | JS |
| M16 | Splide slider (`.testimonial-slider`, not on home) | Drag / pagination | `type: 'loop'`, `arrows: false`, `autoplay: false` (interval 5000 configured but disabled); pagination bullets black on a 1 px top rule | Splide default (400 ms) | Splide default | — | JS config |
| M17 | News infinite scroll (`/noticias/`) | `IntersectionObserver`, `rootMargin: 200px` | Appends posts (no entrance animation) | — | — | — | JS |
| — | Page transitions | Navigation | **None** (full reload) | — | — | — | — |
| — | Scroll reveals, parallax, pinning, split-text | — | **None present** | — | — | — | §4.1 |
| — | `prefers-reduced-motion` | — | **Ignored** by the hero video (M1) and the award trail (M4); only M15 respects it | — | — | — | emulated `reduce`: video playing, 9 clones spawned |

### 4.4 Motion character (for the build)

The ESDI grammar is **editorial stop-motion**: things *cut*, they don't glide. Colour swaps are instant. The few eased motions are short (200–350 ms), use Tailwind's `cubic-bezier(.4,0,.2,1)` or a plain `ease-out` / `ease-in`, and never bounce or overshoot. Nothing moves on scroll. Reproducing it faithfully means **resisting** the usual scroll-reveal choreography.

---

## 5. Interaction patterns & copy tone

* **Links are underlined at rest, and the underline disappears on hover** (1 px, `text-underline-offset` 2–3 px). It's the inverse of the common web convention. Navigation-type links (Ver todo, categories, menu social and languages) use the opposite: no underline until hover.
* **Arrows:** in the menu's CTA column, **→ marks internal** pages (Solicita información, Open Days, Becas y Ayudas) and **↗ marks external** (`target="_blank"`: Plataforma Alumni, Campus Virtual, Prácticas de empresa). The 32 px SVG arrow is right-aligned on the rule. Content CTAs ("Reserva tu plaza") are plain underlined text without an arrow.
* **Buttons:** almost none. The only button-like control is the outlined uppercase "ENVIAR" (12 × 32 px padding, 1 px border, 0.05 em tracking). Everything else is a text link or a full-area clickable block (cards, tiles).
* **Language switcher:** "ES" in the header opens a dropdown with "CA" and "EN". The menu overlay footer shows "CA ES EN", with the active one underlined.
* **Tables (Agenda):** no header row. Date `16 Oct 26` (day, three-letter Spanish month, two-digit year: Ene Feb Mar Abr May Jun Jul Ago Sep Oct Nov Dic). A small category line above (`Evento / Masterclass`, multiple categories joined with " / "). An UPPERCASE title. A right-hand CTA. Rows separated by 1 px rules.
* **Labels / categories:** small light text joined with " / ". Section eyebrows are rare; the giant title does that job.
* **Forms:** label above, `Nombre*` with the asterisk glued on. Underline-only input. Selects with `appearance: none` and a chevron. Checkbox legal copy at the small size. Submit is "ENVIAR".
* **Copy tone:** institutional, concise, Spain Spanish, addressing the reader as *tú* in imperatives ("Reserva tu plaza", "Solicita información"). Headings are one or two nouns in caps ("AGENDA", "OFERTA ACADÉMICA", "NOTICIAS"). The closing control is "Cerrar"; the opening one is "Menú".

---

## 6. Accessibility audit of the reference (what the build must improve)

| # | Issue on esdi.es | WCAG | Build rule |
|---|---|---|---|
| A1 | Meta text at 10–13.4 px desktop, 11.8 px mobile; weight 300 at small sizes | 1.4.4 / legibility | Floor of 14 px; 400 below 18 px (§2.5) |
| A2 | Hover grey `#a7a7a7` at 2.41:1 | 1.4.3 | Hover text `#6b6b6b` (5.33:1), or the underline convention instead of a colour shift |
| A3 | Accordion buttons use `focus:outline-none`; inputs have `outline: none`; no custom focus styles anywhere | 2.4.7 | 2 px solid black outline, 2 px offset (white on dark fills), via `:focus-visible` on every interactive element |
| A4 | Links with `href="#"` (intro) and `javascript:void(0)` (gallery) | 4.1.2 / 2.1.1 | Real links or buttons only |
| A5 | Hero video autoplays and loops > 5 s with no pause control | 2.2.2 | Pause/Play control on the hero collage; static under reduced motion |
| A6 | `prefers-reduced-motion` ignored (video, image trail) | 2.3.3 (AAA) / best practice | All GSAP motion gated through `gsap.matchMedia()` |
| A7 | Menu overlay: no Escape, no focus trap, background not `inert` | 2.1.2 / 2.4.3 | Dialog semantics, Escape closes, focus returns to the trigger, `inert` on the page |
| A8 | Agenda `<table>` without `<th>`, `<caption>` or `<time>` | 1.3.1 | Booking grid uses `th scope` and machine-readable `<time>` |
| A9 | Headings wrap `<p>` and hard `<br>` | 1.3.1 | Plain heading text; line breaks via layout |
| A10 | Legal links 12.8 px tall on mobile | 2.5.8 | ≥ 24 px targets (≥ 44 px for primary controls) |

Strengths worth keeping: skip link, labelled `nav` landmarks, `aria-expanded` and `aria-controls` on the menu toggle and accordions, `alt=""` on decorative award clones.

---

## 7. Implications for the TALLER build

### 7.1 ESDI component → app usage

| ESDI component | Use in the booking app |
|---|---|
| Fixed header (logo · Menú · ES) | Same, with a "TALLER" text wordmark in Roboto Condensed 900 |
| Hero video wordmark (M1) | **DOM/SVG reimplementation:** "TALLER" glyphs as separate SVG `<text>` layers, neutral placeholder photos placed *between* glyph layers, a GSAP timeline of zero-duration `set()` cuts on ESDI's 2-slot, ~1 s-offset rhythm, plus a pause control |
| h1 under the hero (`--text-300px`) | "RESERVAS" (or a similar short title) |
| Lead with image-reveal links (M5) | Short intro paragraph |
| Feature cards + accent hover (M2) | "Cómo funciona" (4 steps), same instant accent cycle |
| Label + ruled list (Awards) | Rules block: 1 h slots, L–V 08:00–19:00, max 2/week, 1/day, 4-week window. Image trail (M4) optional |
| **Agenda table** | **The booking grid** (week: rows = hours, columns = days; mobile: day tabs + stacked rows) and **"Mis reservas"** (date · franja · cancel link: a literal agenda row) |
| Outline button, underline inputs | Login (email OTP), confirmation dialog actions |
| Accordion | FAQ |
| Menu overlay (M9–M11) | Routes as FramerSans-style headings; CTA column with → arrows |
| Footer with giant wordmark | Same structure; "TALLER" wordmark + light two-line descriptor |

### 7.2 Hero lockup with a six-letter word

At ESDI's ratios (gap = 4.1 % of width, cap = 72.7 % of box height), "TALLER" at 1440 resolves to **font-size 375 px, cap 270 px, box 1365 × 371 (3.68 : 1)** (`73-hero-taller-lockup-preview-1440.png`). Keeping the 16:9 box would leave the letters at 35 % of box height and the lockup would read empty. Recommendation: **keep ESDI's ratios and let the box aspect follow the word**. At 390 the same rules give ≈ 94 px font-size and a ≈ 93 px-tall box.

### 7.3 Slot-state colour mapping

ESDI never uses accents semantically; they're **transient, position-cycled hover fills with black text**, and the grey #e2e4e7 is a *resting* surface. Two candidate mappings:

* **Option A (ESDI-faithful, recommended)**
  * available: white cell, 1 px black rules
  * hover / keyboard focus: **instant** fill in the weekday's accent, cycling like the cards (Mon green, Tue red, Wed blue, Thu yellow, Fri green)
  * booked by me: **black fill, white text** (ESDI's only "active" treatment, the button inversion)
  * booked (closed): **#e2e4e7 + 1 px diagonal hatch + strikethrough** "Ocupado"
  * past: white, text `#6b6b6b`, no hover
  * error (race lost): **#e65541** fill flash + message on red with black text
* **Option B (brief's default):** hover = yellow; mine = green; closed = #e2e4e7 hatch + strikethrough; error = red. Semantically clearer, but uses accents as persistent states, which ESDI never does, and green-for-mine would collide with Monday's green hover if the cycle were kept.

---

## 8. Screenshot index (`design/screenshots/`)

| File | What it shows |
|---|---|
| `00-initial-load-1440.png` | First viewport before consent was reset (hero, header) |
| `01-cookie-dialog-1440.png` | Complianz dialog (Aceptar / **Denegar** / Ver preferencias) |
| `10-home-full-{1440,1024,768,390}.jpg` | Full-page home at each breakpoint |
| `11-home-viewport-{…}.png` | First viewport at each breakpoint |
| `20-hero-video-frames-1440.jpg` | 24 frames across the 11.31 s loop: slot schedule and layering |
| `21-hero-transition-detail.jpg` | Hold periods at 50 ms resolution |
| `22-hero-cut-frame-by-frame.jpg` | The single-frame hard cut at t ≈ 0.97 → 1.00 s |
| `23-scroll-sequence-200px-1440.jpg` | 27 viewports, 0 → 5200 px: no scroll effects |
| `30-hover-oferta-card-{1..4}.png` | Instant accent fills green / red / blue / yellow |
| `31-hover-awards-image-trail.png` | GSAP cursor image trail (random scale, rotation, z) |
| `32-hover-project-tile-{1,4}.png` | Full-cover accent overlay + caption |
| `33-hover-intro-link-image.png` | 150 px image reveal beside a hovered inline link |
| `40-menu-open-1440.png`, `41-menu-hover-secondary-1440.png` | Overlay layout; #a7a7a7 hover on the CTA with → |
| `42-menu-open-{1024,768,390}.png` | Overlay reflow |
| `43-lang-dropdown-1440.png` | Language dropdown (the one shadow) |
| `50-grado-full-1440.jpg` | Inner page: title, lead, image strip, h2 + rule sections, key/value list, FAQ, form |
| `51-grado-form-1440.png` | Underline inputs, labels with *, outlined ENVIAR |
| `52-…`, `53-grado-faq-open-1440.png` | Accordion closed and open (+ / −) |
| `54-focus-ring-default.png` | Focused accordion button with no visible focus |
| `60–62-noticias-*.png` | News archive at 1440 and 390 |
| `70-font-comparison.png` | FramerSans versus display substitutes; Helvetica versus text substitutes |
| `71-hero-wordmark-substitute.jpg` | ESDI frame against Roboto Condensed 900 "ESDI" and "TALLER" |
| `72-corner-detail-E.png` | Corner treatment of E (rounded versus sharp) |
| `73-hero-taller-lockup-preview-1440.png` | "TALLER" lockup with ESDI's gap and cap ratios |

## 9. Reproducibility

* Accessibility snapshots: `a11y-snapshots/home-1440.yml`, `grado-en-diseno-1440.yml`, `noticias-1440.yml`.
* Raw computed styles and rects for 60 elements × 4 breakpoints: `measurements/measure-{1440,1024,768,390}.json`. Condensed table: `measurements/summary-by-breakpoint.txt`.
* Theme CSS and JS were read for analysis only and are **not** stored in the project.
