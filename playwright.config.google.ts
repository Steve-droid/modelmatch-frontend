import { defineConfig, devices } from "@playwright/test";

// An isolated server so this slice never reuses another session's Vite checkout.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /google-auth\.spec\.ts/,
  use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:5318" },
  webServer: {
    command: "npm run dev -- --port 5318 --strictPort",
    url: "http://localhost:5318", reuseExistingServer: false,
  },
});
