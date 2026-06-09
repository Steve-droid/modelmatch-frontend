import { test, expect, type Page } from "@playwright/test";
import { mockBackend } from "./mock-backend";

// The S17 happy path: drive the REAL frontend end-to-end against a fully mocked backend
// (route interception). Login → home hub → "Create a new CI-Agent" → recommend
// (ci_review) → pick → defer-create at the Jenkins step → CI-setup token → dashboard
// (seeded by a mocked CI run) → grounded chat opener → ask one grounded question.
//
// User-facing labels are "CI-Agent" (the data/API stay `project`); the flow is
// defer-create (the project is created at the Jenkins step's Continue, not the pick).

const CREDS = { email: "demo@example.com", password: "modelmatch-demo-2026" };

async function signIn(page: Page) {
  await page.getByLabel("Email").fill(CREDS.email);
  await page.getByLabel("Password").fill(CREDS.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("login → home → create a CI-Agent → dashboard → grounded chat", async ({ page }) => {
  const mock = await mockBackend(page);
  await page.goto("/");

  // --- login → lands on the home hub (not straight to the dashboard) ---
  await signIn(page);
  const createCta = page.getByRole("button", { name: "Create a new CI-Agent" });
  await expect(createCta).toBeVisible();

  // --- home → onboarding (drive the real CTA, not a deep link) ---
  await createCta.click();
  await expect(page.getByText("Set up your code-review agent")).toBeVisible();

  // --- recommender (ci_review, budget-sensitivity High → Nova suggested) ---
  await page.getByRole("button", { name: "High", exact: true }).click();
  await page.getByRole("button", { name: "Get recommendation" }).click();

  // suggested option is pre-selected; the Nova suggestion + Sonnet baseline render
  await expect(page.getByText("Recommended model")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Nova 2 Lite/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByText("Claude Sonnet 4.5")).toBeVisible();

  // --- pick → Continue (defer-create: no project created yet) ---
  await page.getByLabel("Project name").fill("acme-api");
  await page.getByRole("button", { name: "Continue" }).click();

  // --- Jenkins step → Continue creates the project, then connects ---
  await expect(page.getByText("Point ModelMatch at your Jenkins")).toBeVisible();
  await page.getByLabel("Jenkins base URL").fill("https://jenkins.example.com");
  await page.getByLabel("Job name").fill("acme-api/main");
  await page.getByRole("button", { name: "Continue" }).click();

  // --- CI setup: the mint-once token is shown; go to the dashboard ---
  await expect(page.getByText("mmci_e2e_one_time_token")).toBeVisible();
  await page.getByRole("button", { name: "Go to dashboard" }).click();

  // --- dashboard: the mocked CI run seeds the KPIs / chart / runs table ---
  await expect(page.getByText("Cumulative saved")).toBeVisible();
  await expect(page.getByRole("heading", { name: "CI runs" })).toBeVisible(); // runs table
  await expect(page.getByText(/build 101/)).toBeVisible(); // the seeded run's table row

  // --- grounded chat: the server-seeded "explain my spend" opener renders ---
  const chat = page.getByRole("region", { name: "Grounded chat" });
  await expect(chat.getByText(/You've banked \$0\.045/)).toBeVisible();

  // --- ask one grounded question → answer + retrieval trace ---
  await chat.getByLabel("Ask a question").fill("What model am I running?");
  await chat.getByLabel("Ask a question").press("Enter");
  await expect(chat.getByText("What model am I running?")).toBeVisible(); // the user turn
  await expect(chat.getByText(/You're running Nova 2 Lite/)).toBeVisible(); // the answer

  // the retrieval trace is a collapsible disclosure — expand it and check a source
  const trace = chat.getByRole("button", { name: /Grounded on 2 sources/ });
  await expect(trace).toBeVisible();
  await trace.click();
  await expect(chat.getByText(/Nova 2 Lite · review_score/)).toBeVisible();

  // fail-closed: no unexpected API call + every critical payload was well-formed
  expect(mock.errors, mock.errors.join("\n")).toHaveLength(0);
});

test("home navigation: View my CI-Agents → dashboard, logo → home, browser Back", async ({
  page,
}) => {
  // Start with one existing agent so the hub offers "View my CI-Agents".
  const mock = await mockBackend(page);
  // Force the GET /projects probe to report an existing agent by pre-creating one.
  await page.route(/^https?:\/\/localhost:8000\/projects$/, async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 7,
            name: "acme-api",
            userId: 1,
            selectedOptionId: 11,
            selectedOptionModel: "Nova 2 Lite",
            baselineModelId: 9,
            baselineModel: "Claude Sonnet 4.5",
            baselineVendor: "Anthropic",
            setupComplete: true,
          },
        ]),
      });
    return route.fallback();
  });

  await page.goto("/");
  await signIn(page);

  // hub → dashboard via "View my CI-Agents"
  await page.getByRole("button", { name: /View my CI-Agents/ }).click();
  await expect(page.getByText("Cumulative saved")).toBeVisible();

  // dashboard logo (aria "Home") → back to the hub
  await page.getByRole("button", { name: "Home" }).click();
  await expect(page.getByRole("button", { name: "Create a new CI-Agent" })).toBeVisible();

  // browser Back from the hub-after-dashboard returns to the dashboard (history nav)
  await page.goBack();
  await expect(page.getByText("Cumulative saved")).toBeVisible();

  expect(mock.errors, mock.errors.join("\n")).toHaveLength(0);
});
