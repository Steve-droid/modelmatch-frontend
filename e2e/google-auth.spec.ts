import { test, expect, type Page } from "@playwright/test";
import { mockBackend } from "./mock-backend";

// Offline provider: exercises the real script loader, DOM button mount, fetch,
// nonce handoff, JWT storage and application navigation without a Google account.
async function mockGoogle(page: Page, status = 200) {
  await mockBackend(page);
  await page.route("**/auth/google/config", (route) => route.fulfill({ json: { enabled: true } }));
  await page.route("**/auth/google/challenge", (route) => route.fulfill({
    json: { clientId: "offline-client", nonce: "browser-nonce", challenge: "browser-challenge" },
  }));
  await page.route("https://accounts.google.com/gsi/client", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.google = {accounts: {id: {
      initialize(options) { this.options = options; },
      renderButton(host) {
        const button = document.createElement('button');
        button.textContent = 'Continue with Google';
        button.onclick = () => this.options.callback({credential: 'signed-for-' + this.options.nonce});
        host.appendChild(button);
      }
    }}};`,
  }));
  await page.route("**/auth/google", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      credential: "signed-for-browser-nonce", challenge: "browser-challenge",
    });
    expect(route.request().headers()["origin"]).toBe(new URL(page.url()).origin);
    await route.fulfill({ status, json: status === 200 ?
      { accessToken: "google-app-session", tokenType: "bearer" } :
      { detail: "An account already uses this email. Sign in with your existing method." },
    });
  });
}

test("Google login opens the workspace", async ({ page }) => {
  await mockGoogle(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("button", { name: "Set up a CI agent" }).first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("mm_token"))).toBe("google-app-session");
  expect(page.url()).not.toContain("credential");
});

test("Google registration works on mobile without overflowing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockGoogle(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("button", { name: "Set up a CI agent" }).first()).toBeVisible();
});

test("collision preserves password sign-in and retry", async ({ page }) => {
  await mockGoogle(page, 409);
  await page.goto("/");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("alert")).toContainText("existing method");
  await page.getByRole("button", { name: "Retry Google sign-in" }).click();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeEditable();
  expect(await page.evaluate(() => localStorage.getItem("mm_token"))).toBeNull();
});

test("unconfigured deployment never loads Google script", async ({ page }) => {
  await mockBackend(page);
  let googleLoaded = false;
  await page.route("https://accounts.google.com/**", async (route) => {
    googleLoaded = true;
    await route.abort();
  });
  await page.route("**/auth/google/config", (route) => route.fulfill({ json: { enabled: false } }));
  await page.goto("/");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);
  expect(googleLoaded).toBe(false);
});

test("both auth screens link to the public privacy policy", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy.html");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await page.getByRole("link", { name: "Privacy policy" }).click();
  await expect(page.getByRole("heading", { name: "Privacy policy", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Retention and deletion requests" })).toBeVisible();
  await page.getByRole("link", { name: "Back to Modicum" }).click();
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("privacy is readable without JavaScript, auth or third-party requests", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== new URL(baseURL!).origin) externalRequests.push(request.url());
  });
  const response = await page.goto(new URL("/privacy.html", baseURL!).href);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Privacy policy · Modicum");
  await expect(page.getByRole("heading", { name: "Privacy policy", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Modicum" })).toBeVisible();
  expect(externalRequests).toEqual([]);
  await context.close();
});
