// ESLint flat config (ESLint 10) for the React 19 + TS + Vite frontend.
// Runs as the pipeline's static gate alongside `tsc --noEmit` (P17). Errors fail the
// build; type-checking is left to `npm run typecheck` so lint stays fast (no typed
// linting / no parserOptions.project).
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Build output + vendored + test artifacts are never linted.
  {
    ignores: [
      "dist/",
      "coverage/",
      "node_modules/",
      "playwright-report/",
      "test-results/",
    ],
  },

  // Application + test source — runs in the browser / jsdom.
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // react-hooks v7 ships compiler-aware advisory rules. `set-state-in-effect` is a
      // performance hint (cascading-render warning), not a correctness rule, and it
      // fires on intentional, tested patterns here (e.g. clearing stale data on a
      // project switch). Keep it visible as a warning; the correctness rules
      // (rules-of-hooks, exhaustive-deps) stay hard errors.
      "react-hooks/set-state-in-effect": "warn",
    },
  },

  // Playwright specs + tooling configs — run under Node.
  {
    files: [
      "e2e/**/*.ts",
      "*.config.{ts,js}",
      "postcss.config.js",
      "tailwind.config.js",
    ],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node, ...globals.browser },
    },
  },
);
