---
version: alpha
name: ESDI-Inspired-design-analysis
description: An inspired interpretation of the esdi.es (Escola Superior de Disseny, Barcelona/Sabadell) design language. A full-bleed Swiss-editorial system of pure black on white, with giant condensed uppercase display type locked to viewport width, light Helvetica text, 1px black rules as the only structure, zero radius and zero shadow, four flat accent fills (green, red, blue, yellow) that appear only as instant hover blocks with black text, and a stop-motion "hard cut" motion grammar. Measured with Playwright on 2026-10-07; proprietary fonts replaced by free substitutes. Not an official ESDI asset.

colors:
  primary: "#000000"
  on-primary: "#ffffff"
  ink: "#000000"
  canvas: "#ffffff"
  surface: "#e2e4e7"
  hairline: "#000000"
  accent-green: "#69aa96"
  accent-red: "#e65541"
  accent-blue: "#7896c8"
  accent-yellow: "#fadc32"
  muted: "#6b6b6b"
  muted-reference: "#a7a7a7"
  focus-ring: "#000000"
  focus-ring-on-ink: "#ffffff"

typography:
  wordmark-hero:
    fontFamily: '"Roboto Condensed", "Arial Narrow", sans-serif'
    fontSize: "fit-to-width (cap height = 72.7% of lockup box, inter-letter gap = 4.1% of box width)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: 0
    textTransform: uppercase
  wordmark-sm:
    fontFamily: '"Roboto Condensed", "Arial Narrow", sans-serif'
    fontSize: 44px
    fontWeight: 900
    lineHeight: 1
    letterSpacing: 0
    textTransform: uppercase
  display-xxl:
    fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif'
    fontSize: "clamp(7.128rem, 0rem + 14.849vw, 19.674rem)"
    fontWeight: 700
    lineHeight: 0.83
    letterSpacing: "clamp(-0.375rem, -0.5rem + 0.213vw, -0.125rem)"
    textTransform: uppercase
  display-xxl-mobile:
    fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif'
    fontSize: "clamp(2.576rem, 0rem + 14.212vw, 6.813rem)"
    fontWeight: 700
    lineHeight: 0.83
    letterSpacing: -0.03em
    textTransform: uppercase
  display-lg:
    fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif'
    fontSize: "clamp(3.063rem, 0.613rem + 3.063vw, 5.819rem)"
    fontWeight: 700
    lineHeight: 0.8774
    letterSpacing: -0.01em
    textTransform: uppercase
  display-lg-mobile:
    fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif'
    fontSize: "clamp(1.709rem, 0.059rem + 8.803vw, 4.279rem)"
    fontWeight: 700
    lineHeight: 0.8774
    letterSpacing: -0.015em
    textTransform: uppercase
  display-md:
    fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif'
    fontSize: "clamp(1.532rem, 1.123rem + 0.851vw, 2.144rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: -0.015em
    textTransform: uppercase
  lead:
    fontFamily: '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "clamp(1.333rem, 0rem + 2.778vw, 3.681rem)"
    fontWeight: 300
    lineHeight: 0.99
  lead-mobile:
    fontFamily: '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "clamp(0.981rem, 0rem + 5.411vw, 2.594rem)"
    fontWeight: 300
    lineHeight: 0.99
  body-lg:
    fontFamily: '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "clamp(1.375rem, 1.041rem + 0.695vw, 1.875rem)"
    fontWeight: 300
    lineHeight: 0.99
  body-copy:
    fontFamily: '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "clamp(1.375rem, 1.041rem + 0.695vw, 1.875rem)"
    fontWeight: 300
    lineHeight: 1.16
  body-lg-mobile:
    fontFamily: '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "clamp(1.125rem, 1.005rem + 0.641vw, 1.313rem)"
    fontWeight: 300
    lineHeight: 1.05
  body-sm:
    fontFamily: '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "clamp(0.875rem, 0.276rem + 0.935vw, 1.563rem)"
    fontWeight: 400
    lineHeight: 1
  caption:
    fontFamily: '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "clamp(0.875rem, 0.657rem + 0.34vw, 1rem)"
    fontWeight: 400
    lineHeight: 1.1
  caption-mobile:
    fontFamily: '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.1
  legal:
    fontFamily: '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "clamp(0.875rem, 0.744rem + 0.213vw, 1rem)"
    fontWeight: 400
    lineHeight: 1
  nav:
    fontFamily: '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "clamp(1.375rem, 1.041rem + 0.695vw, 1.875rem)"
    fontWeight: 300
    lineHeight: 1.5
  nav-mobile:
    fontFamily: '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "clamp(0.875rem, 0rem + 4.762vw, 2.283rem)"
    fontWeight: 300
    lineHeight: 1.5
  button:
    fontFamily: '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "clamp(0.875rem, 0.276rem + 0.935vw, 1.563rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 0.05em
    textTransform: uppercase
  data-time:
    fontFamily: '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "clamp(0.875rem, 0.276rem + 0.935vw, 1.563rem)"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "tnum"

rounded:
  none: 0px

spacing:
  unit: 4px
  gutter: 30px
  gutter-mobile: 16px
  header-y: 8px
  header-height: 56px
  body-offset: 82px
  section: 90px
  section-mobile: 45px
  section-sm: 55px
  section-sm-mobile: 25px
  title-rule: 35px
  title-pad: 24px
  grid-top: 12px
  row-y: 14px
  row-y-mobile: 16px
  cell-bottom: 20px
  card-pad: 16px
  card-pad-mobile: 8px
  col-gap: 1vw
  col-gap-mobile: 10px
  nav-gap: 40px
  menu-gap: 32px
  menu-cta-gap: 35px
  button-x: 32px
  button-y: 12px
  footer-block: 20px

components:
  site-header:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.nav}"
    height: "{spacing.header-height}"
    padding: "{spacing.header-y} {spacing.gutter}"
    position: fixed
  header-wordmark:
    textColor: "{colors.ink}"
    typography: "{typography.wordmark-sm}"
  hero-lockup:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.wordmark-hero}"
    padding: "0 {spacing.gutter}"
  hero-image-slot:
    rounded: "{rounded.none}"
    zIndex: "between glyph layers"
  page-title:
    textColor: "{colors.ink}"
    typography: "{typography.display-xxl}"
    marginLeft: "-0.75vw"
    paddingBottom: "{spacing.title-pad}"
  section-subtitle:
    textColor: "{colors.ink}"
    typography: "{typography.display-lg}"
    paddingBottom: "{spacing.title-pad}"
  section-rule:
    borderColor: "{colors.hairline}"
    borderTop: 1px
    padding: "16px 0"
  lead-paragraph:
    textColor: "{colors.ink}"
    typography: "{typography.lead}"
  link-inline:
    textColor: "{colors.ink}"
    textDecoration: "underline 1px, offset 3px; removed on hover"
  link-reveal:
    textColor: "{colors.ink}"
    textDecoration: "none; underline (or 1px border-bottom) appears on hover"
  feature-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    titleTypography: "{typography.display-lg}"
    bodyTypography: "{typography.body-copy}"
    rounded: "{rounded.none}"
    padding: "{spacing.card-pad}"
  feature-card-hover-1:
    backgroundColor: "{colors.accent-green}"
    textColor: "{colors.ink}"
  feature-card-hover-2:
    backgroundColor: "{colors.accent-red}"
    textColor: "{colors.ink}"
  feature-card-hover-3:
    backgroundColor: "{colors.accent-blue}"
    textColor: "{colors.ink}"
  feature-card-hover-4:
    backgroundColor: "{colors.accent-yellow}"
    textColor: "{colors.ink}"
  ruled-list:
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.body-lg}"
    rowPadding: "{spacing.row-y} 0"
  gallery-tile:
    rounded: "{rounded.none}"
    overlayOpacity: "0 → 1 on hover"
    captionTypography: "{typography.body-lg}"
  agenda-table:
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    dateTypography: "{typography.body-sm}"
    categoryTypography: "{typography.caption}"
    titleTypography: "{typography.body-sm}"
    cellPadding: "{spacing.row-y} 0 {spacing.cell-bottom}"
    columns: "25% / auto / 25%"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    borderColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "{spacing.button-y} {spacing.button-x}"
  button-outline-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    borderColor: "{colors.primary}"
  text-input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    borderBottom: 1px
    typography: "{typography.body-lg}"
    rounded: "{rounded.none}"
    padding: "12px 0"
  form-label:
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    marginBottom: 12px
  checkbox:
    size: 16px
    borderColor: "{colors.ink}"
    rounded: "{rounded.none}"
  accordion-row:
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.body-lg}"
    textTransform: uppercase
    padding: "{spacing.row-y} 0"
    icon: "+ / − 20px, right-aligned"
  menu-overlay:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    padding: "80px {spacing.gutter} 16px"
    gap: "{spacing.menu-gap}"
  menu-heading:
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.display-md}"
    paddingBottom: 6px
  menu-sublink:
    textColor: "{colors.ink}"
    hoverTextColor: "{colors.muted}"
    typography: "{typography.body-lg}"
    paddingLeft: 16px
  menu-cta-link:
    textColor: "{colors.ink}"
    hoverTextColor: "{colors.muted}"
    borderColor: "{colors.hairline}"
    typography: "{typography.display-md}"
    icon: "→ internal / ↗ external, 32px, right-aligned"
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.body-lg}"
    padding: "{spacing.footer-block} {spacing.gutter}"
  footer-wordmark:
    textColor: "{colors.ink}"
    typography: "{typography.wordmark-hero}"
    descriptorTypography: "{typography.lead}"
  footer-legal:
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.legal}"
    padding: "12px 0"
  focus-visible:
    outline: "2px solid {colors.focus-ring}"
    outlineOffset: 2px
    onInk: "2px solid {colors.focus-ring-on-ink}"

  # ─── Examples (illustrative) for the TALLER booking app ───
  ex-slot-available:
    description: "Bookable 1-hour slot. Agenda-table cell: white, 1px black rules, time in data-time."
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.data-time}"
    rounded: "{rounded.none}"
  ex-slot-hover:
    description: "Hover / keyboard focus. INSTANT (0ms) fill in the weekday accent, cycling like feature cards: Mon green, Tue red, Wed blue, Thu yellow, Fri green. Black text."
    backgroundColor: "{colors.accent-green} | {colors.accent-red} | {colors.accent-blue} | {colors.accent-yellow}"
    textColor: "{colors.ink}"
  ex-slot-mine:
    description: "Booked by the current student. ESDI's only 'active' treatment: black/white inversion (= button-outline-hover)."
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  ex-slot-closed:
    description: "Booked by someone else. Resting surface grey + 1px diagonal ink hatch + strikethrough label 'Ocupado'."
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    pattern: "repeating-linear-gradient(135deg, #000 0 1px, transparent 1px 8px)"
  ex-slot-past:
    description: "Past slot: not interactive."
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted}"
  ex-slot-error:
    description: "Race lost / rule violation flash + inline message block."
    backgroundColor: "{colors.accent-red}"
    textColor: "{colors.ink}"
  ex-dialog:
    description: "Confirmation dialog. Menu-overlay grammar: white, 1px black frame, no radius, no shadow; fade 250ms in / 200ms out."
    backgroundColor: "{colors.canvas}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.none}"
    padding: "{spacing.gutter}"
    titleTypography: "{typography.display-lg}"
  ex-status-row:
    description: "Inline status (success/info/error). A full-width ruled row with an accent fill and black text, never a floating card with a shadow."
    backgroundColor: "{colors.accent-green} | {colors.accent-red} | {colors.accent-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    padding: "{spacing.row-y} {spacing.card-pad}"
  ex-auth-form:
    description: "Sign-in with email OTP: label + underline input + button-outline 'ENVIAR', on the canvas (no card chrome)."
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.none}"

---


## Overview

ESDI's site reads like a design school's printed poster series, rebuilt as a website. Everything is pure black on pure white. Every section opens with a **giant condensed uppercase title** that is sized in viewport units, so "RECONOCIMIENTOS" or "OFERTA ACADÉMICA" spans the content width at any desktop size. Light, quiet Helvetica carries all the information underneath. Structure comes from **1px black rules**, nothing else: no cards with shadows, no rounded corners, no tinted panels apart from one resting grey. Colour arrives only when you touch something: a card snaps to green, red, blue or yellow, or a gallery photo is replaced by a flat accent block with a caption.

Motion follows the same attitude. The hero is a stop-motion collage: a static black wordmark with photographs that **hard-cut** in and out, slotted between the letterforms in z-order. Nothing glides on scroll. The few eased movements (menu fade, tile overlay, button inversion, accordion) are short, 200–350 ms, and never bounce.

The layout is **full-bleed**: no max-width container, 30px side gutters (16px on mobile), a 4-column grid, and a 90px (45px mobile) gap between sections.

## Colors

### Brand & Accent
- **Ink** (`{colors.ink}` / `{colors.primary}`: `#000000`): all text, every rule, wordmarks, button borders and the hover fill of buttons. Never softened to a near-black.
- **Accent Green** (`{colors.accent-green}`: `#69aa96`), **Accent Red** (`{colors.accent-red}`: `#e65541`), **Accent Blue** (`{colors.accent-blue}`: `#7896c8`), **Accent Yellow** (`{colors.accent-yellow}`: `#fadc32`): flat area fills that appear **on hover**, cycling by position (green → red → blue → yellow for cards; blue → yellow → green → red for gallery tiles).

### Surface
- **Canvas** (`{colors.canvas}`: `#ffffff`): page, header, menu overlay, dialogs.
- **Surface** (`{colors.surface}`: `#e2e4e7`): the single resting fill, used for feature cards (and for closed slots in the booking app).
- **Hairline** (`{colors.hairline}`: `#000000`): 1px rules. ESDI's hairline is black, not grey.

### Text
- **Ink** (`#000000`) for everything, including text on any accent fill.
- **On Primary** (`{colors.on-primary}`: `#ffffff`): only on an ink fill (hovered button, "booked by me" slot).
- **Muted** (`{colors.muted}`: `#6b6b6b`, 5.33:1): hover colour for menu links and the text of past or disabled items. ESDI's original `{colors.muted-reference}` `#a7a7a7` fails AA (2.41:1) and must not be used for text.

### Semantic
ESDI has no semantic palette. When the app needs one, reuse the accents as **fills with black text** (success → green, error → red, notice → yellow). Never use accent-coloured text or borders.

### Contrast (WCAG 2.x)
| Pair | Ratio | |
|---|---|---|
| ink on canvas | 21:1 | AA/AAA |
| ink on surface | 16.5:1 | AA/AAA |
| ink on yellow / blue / green / red | 15.4 / 7.0 / 7.8 / 5.7:1 | AA |
| white on red / blue / green | 3.7 / 3.0 / 2.7:1 | **fail** |
| muted on canvas | 5.33:1 | AA |
| muted-reference on canvas | 2.41:1 | **fail** |

## Typography

### Font Family
- **Display: Barlow Condensed 700**, substituting ESDI's proprietary *FramerSans 700*. Always uppercase. Sizes are **0.98 × ESDI's tokens**, which makes word widths match FramerSans to within ±0.1%, so giant titles fill and break exactly like the reference.
- **Wordmark: Roboto Condensed 900**, substituting the ESDI logo letterforms used in the hero video and the header and footer logos. Sharp corners; measured proportion error 2.2% against the hero frame.
- **Text: Inter Tight 300/400**, substituting *Helvetica Light 300*. Use 300 at ≥ 18px and 400 below 18px (ESDI's Windows visitors already see 400, because Arial has no light weight).

### Hierarchy
| Token | Use | @1440 | @1024 | @768 | @390 (mobile token) |
|---|---|---|---|---|---|
| `{typography.wordmark-hero}` | Hero lockup | fit-to-width | | | |
| `{typography.display-xxl}` / `-mobile` | Page and section titles (h1/h2) | 213.8 | 152.1 | 114.0 | 55.4 |
| `{typography.display-lg}` / `-mobile` | Sub-section titles, card titles (h2/h3) | 53.9 | 49.0 | 49.0 | 35.3 |
| `{typography.display-md}` | Menu headings and CTAs | 30.2 | 26.7 | 24.5 | (display-lg-mobile) |
| `{typography.lead}` / `-mobile` | Lead sentence, "Ver todo" | 40.0 | 28.4 | 21.3 | 21.1 |
| `{typography.body-lg}` / `-mobile` | Lists, labels, inputs, footer, captions | 26.7 | 23.8 | 22.0 | 18.6 |
| `{typography.body-copy}` | Multi-line paragraphs | 26.7 / lh 1.16 | | | |
| `{typography.body-sm}` / `{typography.data-time}` | Table cells, dates, times | 17.9 | 14.0 | 14.0 | 14.0 |
| `{typography.caption}` / `-mobile` | Categories, meta | 15.4 | 14.0 | 14.0 | 14.0 |
| `{typography.legal}` | Legal row, © | 15.0 | 14.1 | 14.0 | 14.0 |
| `{typography.nav}` / `-mobile` | Menú · ES · Cerrar | 26.7 | 23.8 | 22.0 | 18.6 |
| `{typography.button}` | Outline button | 17.9 | 14.0 | 14.0 | 14.0 |

### Principles
- Desktop tokens switch on at **768px**; below that, the `-mobile` tokens scale linearly with `vw` from a ~462px artboard.
- Display line-height is **0.83** for titles and **0.8774** for sub-titles. Light text sits at **0.99**, or **1.16** for paragraphs.
- Page titles get **negative tracking** (`clamp(-0.375rem, -0.5rem + 0.213vw, -0.125rem)`) and a **−0.75vw optical left shift** so the cap stems align with the 30px gutter.
- Uppercase is reserved for display type, agenda titles, accordion questions and the button. Everything else is sentence case.
- Never use bold Inter Tight for emphasis. Hierarchy is carried only by size and by switching family.

### Note on Font Substitutes
FramerSans and the ESDI logo face are proprietary and must not be downloaded. Barlow Condensed (display), Roboto Condensed (wordmark) and Inter Tight (text) are SIL OFL, self-hosted with `next/font`. Evidence: `design/screenshots/70-font-comparison.png`, `71-hero-wordmark-substitute.jpg`, `72-corner-detail-E.png`.

### Accessibility overrides (deviations from ESDI)
Text never goes below **14px** (ESDI drops to 10–12px). Weight is 400 below 18px. Hover text uses `{colors.muted}` instead of `#a7a7a7`.

## Layout

### Spacing System
Base unit `{spacing.unit}` (4px).

| Token | < 768 | ≥ 768 |
|---|---|---|
| Side gutter | `{spacing.gutter-mobile}` 16px | `{spacing.gutter}` 30px |
| Section gap | `{spacing.section-mobile}` 45px | `{spacing.section}` 90px |
| Small section gap | `{spacing.section-sm-mobile}` 25px | `{spacing.section-sm}` 55px |
| Title bottom padding | `{spacing.title-pad}` 24px | 24px |
| Grid top margin | `{spacing.grid-top}` 12px | 12px |
| Ruled-row padding | `{spacing.row-y-mobile}` 16px | `{spacing.row-y}` 14px |
| Card padding | `{spacing.card-pad-mobile}` 8px | `{spacing.card-pad}` 16px |
| Column gap (news, footer) | `{spacing.col-gap-mobile}` 10px | `{spacing.col-gap}` 1vw |

### Grid & Container
- **No max-width.** Content width is viewport − 2 × gutter at every size.
- **4 columns** for cards (zero gap, collapsed 1px borders), news and footer-legal (1vw gap). **8 columns** for the footer info block at ≥ 1024. **2 columns** for label + list blocks.
- Agenda / booking table columns: **25% / auto / 25%**.
- Header: fixed, white, `{spacing.header-height}` tall; the body is offset by `{spacing.body-offset}`.

### Whitespace Philosophy
Space between sections is large and constant (90px). Space inside components is tight: rules 14px apart, cards with 16px padding. The giant titles are the "air".

## Elevation & Depth
None. No shadows, no blur, no layered cards. Depth only appears in the hero, where photos interleave with glyph layers. (ESDI's language dropdown carries a Tailwind `shadow-lg`. That's the one inconsistency; replace it with a 1px ink frame.)

## Shapes

### Border Radius Scale
`{rounded.none}`: **0px everywhere**: buttons, inputs, checkboxes, cards, images, dialogs, focus rings.

### Photography Geometry
Rectangular crops, full-bleed inside their grid cell (`object-fit: cover`). Gallery uses 465:337 for small tiles; feature cards use 466:499 at ≥ 1280. News thumbnails keep their natural aspect. Hero photos range ≈ 150–260px wide at 1440, with mixed aspect ratios.

## Components

### Header (`{component.site-header}`)
Wordmark left (`{typography.wordmark-sm}`, cap ≈ 32px, equal to ESDI's 31.8px logo). On the right, "Menú" and "ES" in `{typography.nav}`, 40px apart. No icons, no hamburger glyph, no underline. It never hides on scroll.

### Hero lockup (`{component.hero-lockup}`)
One word, letters justified edge to edge across the content width. Inter-letter gap = **4.1% of width**; cap height = **72.7% of the box height**, vertically centred. With a six-letter word like "TALLER", keep these ratios and let the box aspect follow the word (≈ 3.68:1 at 1440: font-size 375px, cap 270px, box 1365×371). Render the glyphs as individual SVG `<text>` elements so photos can be placed **between glyph layers**. Photos stay inside the box and appear by hard cut (see Motion).

### Section titles
`{component.page-title}` (display-xxl) followed by content; `{component.section-subtitle}` (display-lg) followed by `{component.section-rule}` (1px top rule, 16px vertical padding, 2-column body).

### Feature cards (`{component.feature-card}`)
A 4-up grid of `{colors.surface}` blocks with collapsed 1px black borders. Display-lg title at the top-left, body-copy description pinned to the bottom (`margin-top: auto`, hidden below 768). The whole block is the link. On hover it fills **instantly** with `{component.feature-card-hover-1…4}` by position.

### Ruled list (`{component.ruled-list}`)
A 1px top rule on the container and a 1px bottom rule on each row except the last; 14px vertical padding. Used with a left-column label in a 2-column split.

### Agenda table (`{component.agenda-table}`)
No header fill. Date · (category caption above an UPPERCASE title) · right-hand CTA (underlined text link, no arrow). Below 768 the cells stack: date large, category absolutely positioned top-right, title, then CTA. **This is the template for the booking grid and for "Mis reservas".** In the app, add real `<th scope>` headers (visually the same small light text) and `<time>` elements.

### Gallery tiles (`{component.gallery-tile}`)
An asymmetric 4×2 grid. On hover an accent block covers the whole photo and a black caption (body-lg) appears at top-left with 12px padding.

### Links & buttons
- `{component.link-inline}`: underlined at rest, **underline removed on hover**.
- `{component.link-reveal}` (Ver todo, categories, menu socials and languages): no underline at rest, underline or 1px border-bottom on hover.
- `{component.menu-cta-link}`: display-md text on a 1px rule with a 32px arrow, **→ internal / ↗ external**.
- `{component.button-outline}`: the only button. Uppercase, 0.05em tracking, 12×32px padding, 1px ink border, inverts to `{component.button-outline-hover}` in 200ms.

### Inputs & Forms
`{component.form-label}` above `{component.text-input}`: transparent, **bottom border only**, 12px vertical padding, body-lg text. Required marker is a glued asterisk ("Correo*"). Selects use `appearance: none` with a chevron. `{component.checkbox}` is a 16px square with a 1px border. Errors appear as an `{component.ex-status-row}` in red under the field. Never a red border alone.

### Accordion (`{component.accordion-row}`)
A full-width button row, uppercase question, "+" on the right that turns into "−". 1px rule below; 350ms height animation.

### Navigation overlay (`{component.menu-overlay}`)
Full-screen white. Wordmark top-left and "Cerrar" top-right, both in the header positions. At ≥ 1280 it's a 4-column grid: categories over 2 columns (each a `{component.menu-heading}` with a 1px rule and indented `{component.menu-sublink}`s), an empty column, and a column of `{component.menu-cta-link}`s. Social abbreviations sit bottom-left; languages sit bottom-right with the active one underlined. Below 1280 it collapses to 1 column (2-column category list from 768); below 768 it scrolls.

### Footer (`{component.footer}`)
A 1px-framed strip (partner logos on ESDI; optional), then a link/info grid (8 columns at ≥ 1024, 2 below; underlined links), then the **giant footer wordmark** (`{component.footer-wordmark}`: wordmark + two-line light descriptor to its right), then `{component.footer-legal}` (1px top rule, 4 columns, © right-aligned).

### Examples (illustrative): booking app
`{component.ex-slot-available}`, `{component.ex-slot-hover}`, `{component.ex-slot-mine}`, `{component.ex-slot-closed}`, `{component.ex-slot-past}`, `{component.ex-slot-error}`, `{component.ex-dialog}`, `{component.ex-status-row}`, `{component.ex-auth-form}`. These are derived from ESDI's grammar (instant accent hover, ink inversion for "active", resting grey for "unavailable"), not observed on esdi.es.

## Motion

### Principles
1. **Cut, don't glide.** State changes are instant unless listed below.
2. **No scroll-driven motion**: no reveals, parallax, pinning or split-text. esdi.es has none (verified: no ScrollTrigger, empty GSAP global timeline, static transforms across a 27-step scroll capture).
3. Eased motions are short (200–350ms), never overshoot, and use `cubic-bezier(.4,0,.2,1)` (std), `ease-out` = `cubic-bezier(0,0,.58,1)` or `ease-in` = `cubic-bezier(.42,0,1,1)`.
4. **Reduced motion** (an improvement over ESDI): every animated element has a static equivalent. Hero → single still composition; image trail off; fades → instant.

### Spec
| ID | Element | Trigger | Animation | Duration | Easing | Delay / stagger |
|---|---|---|---|---|---|---|
| M1 | Hero collage | load, infinite loop | 2 photo slots; each photo appears and disappears by **hard cut** (zero-duration set) at a new position and size, z-ordered between glyphs | loop ≈ 11.3s; hold 1.8–2.4s; cut 0ms | steps / none | left and right slots offset ≈ 1s (≈ 1 cut/s) |
| M2 | Feature card | hover / focus-visible | background → accent by position | **0ms** | — | — |
| M3 | Gallery tile | hover / focus-visible | accent overlay opacity 0→1; caption opacity 0→1 | 300ms | std; caption `ease` | — |
| M4 | Image trail (optional) | pointer move over section, every > 80px | clone at cursor: scale 0.6–1.1, rotate ±30°, random z | appear 0ms; hold 1500ms; out 400ms (opacity 0, scale 0.5, rotate +15°) | `power2.inOut` | continuous |
| M5 | Inline image-reveal link | hover / focus | 150px image beside the link, vertically centred on it | 0ms | — | — |
| M6 | Inline link | hover | underline removed | 0ms | — | — |
| M7 | Reveal link | hover | underline / border appears | 0ms | — | — |
| M8 | Outline button | hover / focus-visible | invert to ink fill, white text | 200ms | std | — |
| M9 | Menu / dialog open | click | overlay opacity 0→1; content opacity 0→1 + translateY 10px→0 | 250ms; 300ms | ease-out; ease-out | content +100ms; **no stagger** |
| M10 | Menu / dialog close | click, Escape, backdrop | overlay opacity 1→0, then hidden | 200ms | ease-in | — |
| M11 | Menu links | hover | colour → `{colors.muted}` | 0ms | — | — |
| M12 | Accordion | click | height 0 ↔ auto; + ↔ − swap | 350ms | std | — |
| M13 | Slot booked elsewhere (realtime) | realtime event | cut to closed state | 0ms | — | — |

### GSAP implementation notes
- Use `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)` around M1, M4, M8–M10 and M12. In the reduce branch, use `gsap.set` final states.
- M1: `gsap.timeline({ repeat: -1 })` with `tl.set(img, { autoAlpha: 1, x, y, width, zIndex }, t)` / `tl.set(prev, { autoAlpha: 0 }, t)`. **No tweens with duration.** Use `ScrollTrigger.create({ trigger: hero, onToggle: s => s.isActive ? tl.play() : tl.pause() })` only to stop the loop off-screen (performance), not to animate anything. Add a visible pause/play control (WCAG 2.2.2).
- Register `CustomEase` curves `std = ".4,0,.2,1"`, `out = "0,0,.58,1"` and `in = ".42,0,1,1"` so GSAP timings match ESDI's CSS curves exactly.
- M2, M6, M7 and M11 are plain CSS state changes with no transition. M3 and M8 are CSS transitions. Don't route instant hovers through GSAP.

## Interaction & Copy
- Arrows: **→ internal**, **↗ external** (opens a new tab), only on menu CTA rows.
- Dates: `16 Oct 26` (day, three-letter Spanish month `Ene Feb Mar Abr May Jun Jul Ago Sep Oct Nov Dic`, two-digit year). Times `08:00–09:00` with tabular figures.
- Multiple categories are joined with " / ".
- Copy: Spain Spanish, short, institutional, addressing the reader as *tú* in imperatives ("Reserva tu plaza", "Solicita información"). Titles are one or two nouns in caps. Close = "Cerrar"; menu = "Menú".

## Do's and Don'ts

### Do
- Size page titles with `{typography.display-xxl}` (vw-locked) so they span the content width at every desktop size.
- Separate everything with 1px `{colors.hairline}` rules; open lists with a top rule and close rows with bottom rules.
- Keep accents as **flat fills with black text** that appear on interaction, cycling by position.
- Use the agenda-table pattern for any tabular or time-based data.
- Cut between states. Reserve easing for overlays, accordions and the button inversion.
- Keep every interactive element ≥ 14px text, with a visible `{component.focus-visible}` ring.

### Don't
- Don't round any corner or add any shadow, gradient or blur.
- Don't put white text on an accent (fails AA) or use accents for text or borders.
- Don't add scroll reveals, parallax, pinning, staggered fade-ups or split-text. ESDI has none.
- Don't use `#a7a7a7` for text, and don't add a grey hairline: rules are black.
- Don't constrain content to a centred max-width column.
- Don't introduce a filled primary button. The outline button that inverts on hover is the only button.
- Don't use bold or medium weights of the text face for emphasis.

## Responsive Behavior

### Breakpoints
| Name | Width | Key changes |
|---|---|---|
| mobile | < 640 | Mobile type tokens; 16px gutters; 2-col cards without descriptions; agenda rows stack; footer 2-col; menu 1-col scrolling |
| sm | 640–767 | Same as mobile (only `h2` card titles switch to desktop size) |
| md | 768–1023 | **Desktop type tokens**; 30px gutters; cards 2-col with descriptions; agenda becomes a table; news 4-col |
| lg | 1024–1279 | Cards 4-col; footer 8-col grid |
| xl | ≥ 1280 | Menu overlay 4-col grid; cards 466:499; page-title top padding 20px |

### Touch Targets
ESDI's header controls are 28–40px tall and its legal links 13px. The app requires **≥ 44px** for primary controls (slot cells, buttons, menu toggle) and **≥ 24px** for inline links (WCAG 2.5.8).

### Collapsing Strategy
- Feature grid: 4 → 2 columns at 1024.
- Agenda / booking table: table at ≥ 768; stacked rows below. **Booking grid on mobile becomes a single-day view with day tabs.**
- Footer: 8 → 2 columns at 1024; the wordmark lockup stays horizontal.
- Menu overlay: 4-col → 1-col at 1280; content scrolls on short screens.

### Image Behavior
Images fill their cell (`object-fit: cover`) and never carry a radius. Hero photos scale with the lockup box. No lazy-load animation: images simply appear.

## Iteration Guide
1. Work on one component at a time. Resolve every `{…}` reference against the front matter before writing CSS.
2. Implement the `--text-*` clamps verbatim as CSS custom properties. Never round them to fixed px.
3. New states get their own `ex-*` entry; don't bury variants in prose.
4. Before adding any animation, check the Motion spec. If it isn't listed, it should be a cut.
5. Verify every new colour pair against the contrast table. Accent + white is never allowed.

## Known Gaps
- FramerSans and the logo face are proprietary; substitutes are metric matches, not the originals.
- Hero cut schedule is reconstructed from 0.45s sampling (±0.2s) plus one frame-accurate cut; image positions are approximate (±10px at 1440).
- Splide slider and the sticky sub-nav pills were analysed from source code only (not mounted on the captured pages).
- ESDI has no error, success, dialog, toast or empty-state patterns. The `ex-*` booking components are derived from its grammar.
- No dark mode on esdi.es; none is specified here.
