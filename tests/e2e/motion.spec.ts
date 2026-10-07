import { expect, test, type Page } from "@playwright/test";
import { HERO_LOOP_SECONDS, HERO_SHOTS } from "../../src/components/home/hero-shots";

/**
 * Check 9: motion matches the spec table in design/esdi-analysis.md §4.3
 * (M1–M14), and reduced motion turns it off. Timings are sampled every
 * animation frame in the page, so this must run headless (unthrottled rAF).
 */
test.use({ viewport: { width: 1440, height: 900 } });

const FRAME_TOLERANCE_MS = 60;

interface Cut {
  t: number;
  left: string;
  right: string;
}

/** Records every change of the visible hero shots for `ms` milliseconds. */
function sampleHero(page: Page, ms: number) {
  return page.evaluate(
    (duration) =>
      new Promise<{ cuts: Cut[]; partialFrames: number; visibleCounts: number[] }>((resolve) => {
        const shots = [...document.querySelectorAll<SVGElement>("[data-shot]")];
        const t0 = performance.now();
        const cuts: Cut[] = [];
        const counts = new Set<number>();
        let prev = "";
        let partialFrames = 0;
        const tick = () => {
          const t = performance.now() - t0;
          const visible = shots
            .filter((s) => {
              const cs = getComputedStyle(s);
              const o = parseFloat(cs.opacity);
              if (o > 0.001 && o < 0.999) partialFrames++;
              return cs.visibility !== "hidden" && o > 0.5;
            })
            .map((s) => s.dataset.shot ?? "");
          counts.add(visible.length);
          const left = visible.filter((id) => id.startsWith("l")).join(",");
          const right = visible.filter((id) => id.startsWith("r")).join(",");
          if (`${left}|${right}` !== prev) {
            cuts.push({ t, left, right });
            prev = `${left}|${right}`;
          }
          if (t < duration) requestAnimationFrame(tick);
          else resolve({ cuts, partialFrames, visibleCounts: [...counts] });
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
}

/** Per slot: [shot id, ms on screen] for every shot seen both entering and leaving. */
function holds(cuts: Cut[], slot: "left" | "right") {
  const changes: Array<{ t: number; id: string }> = [];
  for (const c of cuts) if (changes.at(-1)?.id !== c[slot]) changes.push({ t: c.t, id: c[slot] });
  const out: Array<[string, number]> = [];
  for (let i = 1; i < changes.length - 1; i++) out.push([changes[i]!.id, changes[i + 1]!.t - changes[i]!.t]);
  return { changes, holds: out };
}

/** Samples a property of an element every frame for `ms` after running `trigger`. */
function sampleAfter(page: Page, trigger: string, ms: number) {
  return page.evaluate(
    ({ trigger, ms }) =>
      new Promise<Array<{ t: number; overlay: number; content: number; y: number; open: boolean }>>((resolve) => {
        const out: Array<{ t: number; overlay: number; content: number; y: number; open: boolean }> = [];
        const t0 = performance.now();
        (document.querySelector(trigger) as HTMLElement).click();
        const tick = () => {
          const t = performance.now() - t0;
          const dialog = document.querySelector("dialog");
          const content = dialog?.querySelector<HTMLElement>(":scope > div > div:last-child");
          const y = content ? new DOMMatrix(getComputedStyle(content).transform).m42 : 0;
          out.push({
            t,
            overlay: dialog ? parseFloat(getComputedStyle(dialog).opacity) : 0,
            content: content ? parseFloat(getComputedStyle(content).opacity) : 0,
            y,
            open: Boolean(dialog?.open),
          });
          if (t < ms) requestAnimationFrame(tick);
          else resolve(out);
        };
        requestAnimationFrame(tick);
      }),
    { trigger, ms },
  );
}

const at = <T extends { t: number }>(samples: T[], ms: number) => samples.find((s) => s.t >= ms) ?? samples.at(-1)!;

test.describe("motion allowed", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("M1 hero: hard cuts, one shot per slot, hold times and 11.3 s loop", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const { cuts, partialFrames, visibleCounts } = await sampleHero(page, 24_000);

    expect(partialFrames, "no fades: every frame is fully on or off").toBe(0);
    expect(visibleCounts, "exactly one shot per slot at all times").toEqual([2]);

    const expected = new Map(HERO_SHOTS.map((s) => [s.id, (s.out - s.in) * 1000]));
    for (const slot of ["left", "right"] as const) {
      const { changes, holds: seen } = holds(cuts, slot);
      expect(seen.length, `${slot} slot cut several times`).toBeGreaterThanOrEqual(5);
      for (const [id, ms] of seen) expect(Math.abs(ms - expected.get(id)!), `${id} held ${Math.round(ms)} ms`).toBeLessThanOrEqual(FRAME_TOLERANCE_MS);
      // Same shot entering twice = one loop.
      const firstId = changes[1]!.id;
      const entries = changes.filter((c) => c.id === firstId).map((c) => c.t);
      expect(entries.length).toBeGreaterThanOrEqual(2);
      expect(Math.abs(entries[1]! - entries[0]! - HERO_LOOP_SECONDS * 1000)).toBeLessThanOrEqual(FRAME_TOLERANCE_MS);
    }
  });

  test("M1 pause control stops and resumes the loop (WCAG 2.2.2)", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Pausar animación" }).click();
    const paused = await sampleHero(page, 3_000);
    expect(paused.cuts).toHaveLength(1);
    await page.getByRole("button", { name: "Reanudar animación" }).click();
    const resumed = await sampleHero(page, 3_000);
    expect(resumed.cuts.length).toBeGreaterThan(1);
  });

  test("M2 feature cards switch to the position accent instantly", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const cards = page.locator("#como-funciona li a");
    const accents = ["rgb(105, 170, 150)", "rgb(230, 85, 65)", "rgb(120, 150, 200)", "rgb(250, 220, 50)"];
    for (const [i, accent] of accents.entries()) {
      const card = cards.nth(i);
      await expect(card).toHaveCSS("background-color", "rgb(226, 228, 231)");
      await card.hover();
      // No transition: the very first read after hover already has the accent.
      const now = await card.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, duration: getComputedStyle(el).transitionDuration }));
      expect(now).toEqual({ bg: accent, duration: "0s" });
    }
  });

  test("M5 intro link reveals its image instantly; M6 underline drops on hover", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const link = page.locator("[data-reveal-root] a").first();
    await expect(link).toHaveCSS("text-decoration-line", "underline");
    await link.hover();
    await expect(link).toHaveCSS("text-decoration-line", "none");
    const img = page.locator("[data-reveal-root] span[aria-hidden='true'] img");
    await expect(img).toBeVisible();
    const box = await page.locator("[data-reveal-root] span[aria-hidden='true']").evaluate((el) => ({
      left: getComputedStyle(el).left,
      width: el.getBoundingClientRect().width,
    }));
    expect(box).toEqual({ left: "200px", width: 150 });
    await page.mouse.move(5, 5);
    await expect(img).toHaveCount(0);
  });

  test("M8 outline button inverts in 200 ms with the standard curve", async ({ page }) => {
    // The confirm dialog of the sample board (no backend needed) holds an outline button.
    await page.goto("/dev/reservar", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Pulsa para reservar/ }).first().click();
    const button = page.locator("dialog[open]").getByRole("button", { name: "Confirmar reserva" });
    await expect(button).toBeVisible();
    await page.waitForTimeout(500); // let the overlay finish opening
    const t = await button.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { property: cs.transitionProperty, duration: cs.transitionDuration, easing: cs.transitionTimingFunction };
    });
    expect(t.property).toContain("background-color");
    expect(t.duration.split(",").every((d) => d.trim() === "0.2s")).toBe(true);
    expect(t.easing).toContain("cubic-bezier(0.4, 0, 0.2, 1)");
    await button.hover();
    await expect(button).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await expect(button).toHaveCSS("color", "rgb(255, 255, 255)");
  });

  test("M9/M10 menu overlay: 250 ms fade, content +100 ms rise; 200 ms close", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Menú" }).evaluate((b) => b.setAttribute("data-qa-menu", ""));
    const open = await sampleAfter(page, "[data-qa-menu]", 600);

    expect(at(open, 30).overlay).toBeLessThan(0.5);
    expect(at(open, 350).overlay).toBe(1);
    // Overlay mid-way, content not started yet (100 ms delay).
    expect(at(open, 60).content).toBeLessThan(0.05);
    const mid = at(open, 230);
    expect(mid.content).toBeGreaterThan(0.2);
    expect(mid.content).toBeLessThan(1);
    expect(mid.y).toBeGreaterThan(0);
    expect(mid.y).toBeLessThan(10);
    const end = at(open, 450);
    expect(end).toMatchObject({ content: 1, y: 0, open: true });
    // No per-item stagger: every link is fully visible as soon as the content is.
    const linkOpacities = await page.locator("dialog[open] a").evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
    expect(new Set(linkOpacities)).toEqual(new Set(["1"]));

    await page.locator("dialog[open]").getByRole("button", { name: "Cerrar" }).evaluate((b) => b.setAttribute("data-qa-close", ""));
    const close = await sampleAfter(page, "[data-qa-close]", 400);
    expect(at(close, 100).overlay).toBeGreaterThan(0.3);
    expect(at(close, 100).overlay).toBeLessThan(1);
    expect(at(close, 300).open).toBe(false);
  });

  test("M11 menu links: instant hover colour", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Menú" }).click();
    const link = page.locator("dialog[open] nav a, dialog[open] ul a").first();
    await expect(link).toBeVisible();
    const before = await link.evaluate((el) => getComputedStyle(el).color);
    await link.hover();
    const after = await link.evaluate((el) => ({ color: getComputedStyle(el).color, duration: getComputedStyle(el).transitionDuration }));
    expect(after.duration).toBe("0s");
    expect(after.color).not.toBe(before);
  });

  test("M12 FAQ accordion: 350 ms grid-rows with the standard curve", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const button = page.locator("#preguntas button[aria-expanded]").first();
    const panel = page.locator("#preguntas [role=region]").first();
    await expect(panel).toHaveCSS("transition-duration", "0.35s");
    await expect(panel).toHaveCSS("transition-timing-function", "cubic-bezier(0.4, 0, 0.2, 1)");
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(panel).not.toHaveAttribute("inert");
  });

  test("M4 image trail: spawn every >80 px, hold 1.5 s, fade 0.4 s, removed", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const section = page.locator("#normas");
    await section.scrollIntoViewIfNeeded();
    const box = (await section.boundingBox())!;
    const y = box.y + Math.min(box.height / 2, 300);
    await page.mouse.move(box.x + 40, y);
    await page.mouse.move(box.x + 40 + 50, y); // 50 px: no new image
    await page.mouse.move(box.x + 40 + 50 + 90, y); // > 80 px: new image
    const layer = section.locator("[aria-hidden='true'].pointer-events-none").last();
    await expect(layer.locator("img")).toHaveCount(2);
    await page.waitForTimeout(1_000);
    await expect(layer.locator("img")).toHaveCount(2);
    await page.waitForTimeout(1_200); // 1.5 s hold + 0.4 s fade
    await expect(layer.locator("img")).toHaveCount(0);
  });

  test("M14 in-page anchors scroll smoothly", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveCSS("scroll-behavior", "smooth");
  });
});

test.describe("reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("hero is a static composition and the pause control is hidden", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const { cuts } = await sampleHero(page, 4_000);
    expect(cuts).toHaveLength(1);
    expect(cuts[0]).toMatchObject({ left: "l1", right: "r1" });
    await expect(page.getByRole("button", { name: "Pausar animación" })).toBeHidden();
  });

  test("menu opens and closes without animation", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Menú" }).evaluate((b) => b.setAttribute("data-qa-menu", ""));
    const open = await sampleAfter(page, "[data-qa-menu]", 120);
    expect(open[0]).toMatchObject({ overlay: 1, content: 1, y: 0, open: true });
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  });

  test("accordion, smooth scroll and image trail are off", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("#preguntas [role=region]").first()).toHaveCSS("transition-property", "none");
    await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
    const section = page.locator("#normas");
    await section.scrollIntoViewIfNeeded();
    const box = (await section.boundingBox())!;
    for (let x = 40; x < 600; x += 90) await page.mouse.move(box.x + x, box.y + 200);
    await expect(section.locator("img")).toHaveCount(0);
  });
});
