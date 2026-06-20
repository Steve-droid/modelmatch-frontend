// Playwright config for the P31 Container Integration browser smoke (FE pipeline).
//
// Distinct from playwright.config.e2e.ts (the heavier real-stack happy path that's the
// E2E gate) so the boundary smoke stays cheap + fast and never accidentally pulls in
// the full happy-path spec. There is NO webServer — the pipeline brings the throwaway
// compose stack up before this runs (./ci/e2e-stack.sh up) and tears it down -v after.
import { defineConfig, devices } from "@playwright/test";

const FE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e",
  // A two-API-hop smoke; cap modest so a hung backend fails fast rather than dragging
  // the stage to the 30-min job timeout.
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: FE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "container-integration",
      testMatch: /container-integration\.browser\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
