/// <reference types="vitest" />
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    // Vitest owns the unit/component tests under src/. The Playwright e2e specs live in
    // e2e/ and must NOT be collected by Vitest (they import @playwright/test).
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // The MSW integration tier (src/integration/*.int.test.*) is a SEPARATE stage with
    // its own config (vitest.integration.config.ts); keep it out of the unit run even
    // though its files also end in .test.tsx.
    exclude: [...configDefaults.exclude, "src/integration/**"],
  },
});
