import { expect, test, type Page } from "@playwright/test";

/** Check 8: no horizontal scroll at the four reference widths. */
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

// Protected routes redirect to /acceso (or 404 for /admin) when signed out; they're
// still worth loading so the redirect target is measured at every width.
const PATHS = ["/", "/acceso", "/acceso/codigo", "/privacidad", "/dev/reservar", "/no-existe", "/reservar", "/mis-reservas", "/admin"];

async function overflow(page: Page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const offenders: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      const r = el.getBoundingClientRect();
      if (!r.width || (r.right <= de.clientWidth + 1 && r.left >= -1)) continue;
      if (getComputedStyle(el).position === "fixed" || el.closest("dialog:not([open]), .sr-only, [aria-hidden='true']")) continue;
      offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} → ${Math.round(r.right)}px`);
      if (offenders.length >= 3) break;
    }
    return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, offenders };
  });
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}px`, () => {
    test.use({ viewport });

    for (const path of PATHS) {
      test(`no horizontal scroll on ${path}`, async ({ page }) => {
        await page.goto(path, { waitUntil: "networkidle" });
        const m = await overflow(page);
        expect(m.scrollWidth, m.offenders.join(" | ")).toBeLessThanOrEqual(m.clientWidth);
      });
    }

    test("no horizontal scroll with the menu open", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Menú" }).click();
      const dialog = page.locator("dialog[open]");
      await expect(dialog).toBeVisible();
      const m = await dialog.evaluate((d) => ({ scrollWidth: d.scrollWidth, clientWidth: d.clientWidth }));
      expect(m.scrollWidth).toBeLessThanOrEqual(m.clientWidth);
    });
  });
}
