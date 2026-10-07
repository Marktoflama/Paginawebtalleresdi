import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * Phase 4 QA suite (tests/e2e). Runs headless so requestAnimationFrame isn't
 * throttled (the motion checks time GSAP frame by frame).
 *
 * Uses the installed Google Chrome by default. PW_CHANNEL=msedge switches to
 * Edge; PW_CHANNEL=chromium uses Playwright's own build (`npx playwright install chromium`).
 * Specs that need Supabase skip themselves until .env.local is filled in.
 */
const channel = process.env.PW_CHANNEL ?? "chrome";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    channel: channel === "chromium" ? undefined : channel,
    headless: true,
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    trace: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
