import { defineConfig, devices } from "@playwright/test";

// E2E config. Two projects share one Chromium browser:
//   • happy-path  — the CI-able acceptance test. Drives the REAL frontend with the
//     backend fully mocked via page.route (hermetic, no DB, no LLM). Always runs.
//   • real-stack  — an OPTIONAL smoke against a REAL backend (compose Postgres + app).
//     It self-skips when http://localhost:8000 is unreachable, so it's a no-op in plain
//     CI and only "lights up" when a backend is already running.
//
// The Vite dev server is started automatically (webServer) and reused if already up.
const DEV_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  // The frontend is fully mocked in the happy path, so it's fast + deterministic; give
  // the optional real-stack smoke a little more room (real DB round-trips).
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: DEV_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "happy-path",
      testMatch: /(happy-path|google-auth|example-projects)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "real-stack",
      testMatch: /real-stack\.smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: DEV_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
