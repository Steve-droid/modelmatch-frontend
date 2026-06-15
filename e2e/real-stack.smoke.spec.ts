import { test, expect } from "@playwright/test";

// OPTIONAL real-stack smoke (fork 1 = "Both"): the same happy path, but against a REAL
// backend (compose Postgres + FastAPI app on :8000) instead of route mocks. It closes
// the loop the hermetic happy path only simulates — the genuine recommender, project
// creation, Jenkins connect, mint-once CI token, and the REAL per-project
// `POST /ci-runs` ingest — then asserts the dashboard reflects the ingested run.
//
// It deliberately costs $0: the ci-run is a *mocked* agent result (deterministic
// savings, no LLM), and it asserts only the server-seeded chat opener — it never asks a
// live question (which would spend Bedrock tokens).
//
// SELF-SKIPS when http://localhost:8000 is unreachable or unseeded, so it's a no-op in
// plain CI and only runs when a backend is already up. To run it fully:
//   1) cd modelmatch-backend && docker compose up -d        # Postgres + app on :8000
//   2) uv run python -c "from app.db import SessionLocal; from app.catalog.seed import load_seed; s=SessionLocal(); load_seed(s); s.commit()"
//   3) cd ../modelmatch-frontend && npx playwright test --project=real-stack
//
// CI CONTRACT: the P17 Jenkins E2E stage sets E2E_REQUIRE_BACKEND=true. With that flag an
// unreachable backend or an unseeded catalog is a HARD FAILURE, not a skip — the required
// pipeline gate must never go green by silently skipping. Locally (flag unset) it still
// self-skips so the optional smoke is a no-op without a running stack.

const API = process.env.E2E_API_BASE ?? "http://localhost:8000";
// When set by CI, the preconditions below fail instead of skip.
const REQUIRE_BACKEND = process.env.E2E_REQUIRE_BACKEND === "true";
const CREDS = { email: `e2e+${Date.now()}@example.com`, password: "e2e-smoke-pw-123456" };

// A mocked agent result — the shape the CI-Agent POSTs to /ci-runs. Deterministic; the
// savings engine prices it on the project's SELECTED model vs baseline (no LLM).
function agentResult(buildId: string) {
  return {
    jenkinsBuildId: buildId,
    model: "claude-haiku-4-5",
    tokensIn: 1200,
    tokensOut: 340,
    gate: "pass",
    gateReason: null,
    findings: [
      {
        severity: "high",
        category: "security",
        file: "app/db.py",
        line: 12,
        message: "Possible SQL injection in query builder",
      },
    ],
  };
}

test("real backend: onboard a CI-Agent → ingest a real CI run → dashboard reflects it", async ({
  page,
  request,
}) => {
  // --- skip cleanly unless a backend is up ---
  let up = false;
  try {
    up = (await request.get(`${API}/healthz`, { timeout: 2000 })).ok();
  } catch {
    // unreachable backend → `up` stays false and the test self-skips below.
  }
  if (REQUIRE_BACKEND) {
    expect(
      up,
      `E2E_REQUIRE_BACKEND set but backend not reachable at ${API}`,
    ).toBeTruthy();
  } else {
    test.skip(!up, `backend not reachable at ${API} — bring up compose + seed the catalog`);
  }

  // --- register a fresh user via the API ---
  const reg = await request.post(`${API}/auth/register`, { data: CREDS });
  expect([201, 409]).toContain(reg.status()); // 409 if a rerun reused the email

  // --- PREFLIGHT the seed state via the API, BEFORE any UI action. If the catalog
  //     isn't seeded we skip here; once the UI flow starts, a missing recommendation is
  //     a real failure (it would mask a frontend/API bug otherwise). ---
  const tokenResp = await request.post(`${API}/auth/login`, { data: CREDS });
  expect(tokenResp.ok(), "API login for preflight").toBeTruthy();
  const accessToken = (await tokenResp.json()).accessToken as string;
  const preflight = await request.post(`${API}/recommendations`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { taskTypes: ["ci_review"], budgetSensitivity: "high" },
  });
  const shortlist =
    preflight.status() === 201 ? ((await preflight.json())?.shortlist ?? []) : [];
  if (REQUIRE_BACKEND) {
    expect(
      shortlist.length,
      `E2E_REQUIRE_BACKEND set but catalog not seeded at ${API} (recommend → ${preflight.status()})`,
    ).toBeGreaterThan(0);
  } else {
    test.skip(
      shortlist.length === 0,
      `catalog not seeded at ${API} (recommend → ${preflight.status()}) — run load_seed first`,
    );
  }

  // --- sign in through the UI ---
  await page.goto("/");
  await page.getByLabel("Email").fill(CREDS.email);
  await page.getByLabel("Password").fill(CREDS.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // --- home → create a CI-Agent ---
  await page.getByRole("button", { name: "Create a new CI-Agent" }).click();
  await expect(page.getByText("Set up your code-review agent")).toBeVisible();

  // --- recommend (ci_review, High). Seeding was preflighted → this MUST appear now. ---
  await page.getByRole("button", { name: "High", exact: true }).click();
  await page.getByRole("button", { name: "Get recommendation" }).click();
  await expect(page.getByText("Recommended model")).toBeVisible();

  // --- pick (suggested pre-selected) → name → Continue (defer-create) ---
  const projectName = `e2e-smoke-${Date.now()}`;
  await page.getByLabel("Project name").fill(projectName);
  await page.getByRole("button", { name: "Continue" }).click();

  // --- Jenkins step → Continue creates the project + connects ---
  await page.getByLabel("Jenkins base URL").fill("https://jenkins.example.com");
  await page.getByLabel("Job name").fill(`${projectName}/main`);
  await page.getByRole("button", { name: "Continue" }).click();

  // --- CI setup: capture the mint-once token + the real ingest URL from the UI ---
  await expect(page.getByText(/CI token — shown once/)).toBeVisible();
  const token = (await page.locator("code.break-all").first().innerText()).trim();
  expect(token.length).toBeGreaterThan(0);

  const ingestUrlText = await page
    .locator("dd")
    .filter({ hasText: "/ci-runs" })
    .innerText();
  const ciRunsUrl = ingestUrlText.match(/https?:\/\/\S+\/projects\/\d+\/ci-runs/)?.[0];
  expect(ciRunsUrl, "ingest URL visible in CI-setup").toBeTruthy();

  // --- the REAL ingest: POST a mocked CI run authed by the per-project token ---
  const buildId = String(Date.now());
  const ingest = await request.post(ciRunsUrl!, {
    headers: { "X-CI-Token": token },
    data: agentResult(buildId),
  });
  expect(ingest.ok(), `ci-run ingest -> ${ingest.status()}`).toBeTruthy();

  // --- dashboard reflects the ingested run + the server-seeded chat opener ---
  await page.getByRole("button", { name: "Go to dashboard" }).click();
  await expect(page.getByText("Cumulative saved")).toBeVisible();
  await expect(page.getByRole("heading", { name: "CI runs" })).toBeVisible();
  await expect(page.getByText(new RegExp(`build ${buildId}`))).toBeVisible();

  const chat = page.getByRole("region", { name: "Grounded chat" });
  await expect(chat.getByText(/Loading conversation/)).toHaveCount(0, { timeout: 7000 });
  // opener is server-seeded (no LLM); assert a message bubble rendered, don't ask a
  // live question (that would spend Bedrock tokens).
  await expect(chat.getByText("ModelMatch").first()).toBeVisible();
});
