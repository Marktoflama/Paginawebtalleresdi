import { expect, test } from "@playwright/test";

/**
 * Check 1 (UI layers): alumno@gmail.com is rejected in the browser before
 * anything is sent AND by the server action (JavaScript disabled);
 * alumno@esdi.edu.es passes both. The third layer (Auth hook + database
 * trigger) is covered by tests/integration/booking.test.ts.
 * The form only renders once Supabase is configured.
 */
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.goto("/acceso");
  test.skip((await page.locator("#email").count()) === 0, "Access form hidden: Supabase isn't configured in .env.local");
});

test("the browser rejects alumno@gmail.com without sending anything", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await page.fill("#email", "alumno@gmail.com");
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.locator("#email-error")).toHaveText("Solo se admiten correos @esdi.edu.es.");
  await expect(page.locator("#email")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#email")).toBeFocused();
  expect(posts).toEqual([]);
});

test("the server rejects alumno@gmail.com even without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/acceso");
  await page.fill("#email", "alumno@gmail.com");
  await page.click("button[type=submit]");
  await expect(page.locator("#email-error")).toHaveText("Solo se admiten correos @esdi.edu.es.");
  await context.close();
});

test("alumno@esdi.edu.es passes the browser check (request blocked: no real email)", async ({ page }) => {
  // Block the server action so no magic link goes to a possibly real address.
  await page.route("**/acceso**", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
  await page.fill("#email", "alumno@esdi.edu.es");
  const sent = page.waitForRequest((r) => r.method() === "POST");
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  expect((await sent).postData() ?? "").toContain("alumno@esdi.edu.es");
  await expect(page.locator("#email-error")).toHaveCount(0);
});

/** Opt-in: E2E_EMAIL_TO=<an @esdi.edu.es inbox you own> sends a real link through your SMTP. */
test("a real @esdi.edu.es inbox is accepted by the server and Supabase", async ({ page }) => {
  const to = process.env.E2E_EMAIL_TO?.trim();
  test.skip(!to, "Set E2E_EMAIL_TO to an inbox you own to send a real magic link");
  await page.fill("#email", to!);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page).toHaveURL(/\/acceso\/codigo/, { timeout: 15_000 });
  await expect(page.locator("#code")).toBeVisible();
});
