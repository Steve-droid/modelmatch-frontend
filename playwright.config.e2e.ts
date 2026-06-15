import { defineConfig, devices } from "@playwright/test";

// E2E config for the throwaway compose stack (P17). Unlike playwright.config.ts (which
// boots a Vite dev server and mocks the backend for the hermetic happy path), this runs
// the `real-stack` spec against the REAL frontend IMAGE (nginx on :8080) wired to the
// real backend + Postgres from docker-compose.yaml. There is NO webServer here — the
// pipeline brings the compose stack up before this runs and tears it down (`down -v`)
// after. Fake-LLM only (the compose backend defaults LLM_CLIENT=fake) — never e2e-live.
const FE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e",
  // Real DB round-trips + a freshly-started nginx/gunicorn stack — give it more room
  // than the hermetic happy path.
  timeout: 60_000,
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
      name: "real-stack",
      testMatch: /real-stack\.smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
