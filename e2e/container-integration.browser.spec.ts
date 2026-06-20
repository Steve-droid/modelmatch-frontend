// P31 Container Integration — thin BROWSER-side smoke for the FE pipeline.
//
// What this is NOT: a full happy path (that's real-stack.smoke.spec.ts on
// playwright.config.e2e.ts) — DO NOT bloat this into login flows, recommend, etc.
//
// What this IS: the tiny client-side complement to ci/integration-smoke.sh. The curl
// smoke proves nginx serves the SPA + /config.js + CORS at the wire level, but it
// cannot prove the SPA actually BOOTSTRAPS in a browser using window.__APP_CONFIG__,
// nor that the SPA's own browser context can reach the configured backend. This spec
// loads / once, asserts the runtime-generated config object is shaped + pointed
// correctly, and does ONE fetch(/readyz) from inside the page so the same browser
// origin + CORS path the SPA uses at runtime is exercised end-to-end.
//
// Anything heavier belongs in the E2E stage, not here.
import { test, expect } from "@playwright/test";

const API = process.env.E2E_API_BASE;
if (!API) throw new Error("E2E_API_BASE is required (the backend URL /config.js embedded)");

test("SPA bootstraps with /config.js and reaches the configured backend from the page", async ({ page }) => {
  // Surface page-side bundle errors so a broken FE image fails loudly instead of going
  // green on a silent runtime exception. Filter only `pageerror` (uncaught JS errors).
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  // Navigate to the FE root and wait for the SPA's network/script work to settle.
  // The nginx-served index.html loads /config.js BEFORE the main bundle, so by the
  // time `domcontentloaded` fires window.__APP_CONFIG__ MUST be defined.
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // 1. /config.js exposed window.__APP_CONFIG__ with the intended API base URL.
  const cfg = await page.evaluate(() => (window as unknown as { __APP_CONFIG__?: { apiBaseUrl?: string } }).__APP_CONFIG__);
  expect(cfg, "window.__APP_CONFIG__ should be defined by /config.js").toBeTruthy();
  expect(cfg!.apiBaseUrl, "apiBaseUrl in window.__APP_CONFIG__").toBe(API);

  // 2. From the PAGE CONTEXT, fetch /readyz on the configured backend. This is the
  // canonical SPA → backend hop: same origin, same CORS, same browser. If CORS/network
  // is wrong, the in-page fetch throws or returns a non-200 — anything beyond a simple
  // smoke would not catch a regression that a happy-path test wouldn't already catch.
  const ready = await page.evaluate(async (apiBase: string) => {
    const r = await fetch(`${apiBase}/readyz`);
    return { status: r.status, body: await r.json() };
  }, API);
  expect(ready.status).toBe(200);
  expect(ready.body).toMatchObject({ status: "ready", db: "ok" });

  expect(pageErrors, "no uncaught page errors during bootstrap").toEqual([]);
});
