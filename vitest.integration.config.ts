/// <reference types="vitest" />
// Integration test tier (P17): Vitest + RTL + MSW, no containers. Run as its own
// pipeline stage (`npm run test:integration`), separate from the unit/component suite
// (`npm test`). The only differences from vite.config.ts are the include glob and the
// extra MSW setup file that stands up / tears down the mock HTTP server.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts", "./src/integration/msw.setup.ts"],
    include: ["src/integration/**/*.int.{test,spec}.{ts,tsx}"],
  },
});
