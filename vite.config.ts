/// <reference types="vitest" />
import { defineConfig } from "vite";
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
  },
});
