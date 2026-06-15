// Integration: the real fetch client (src/api/client.ts) against a mock HTTP server.
// This is the network-level tier — no module mocks. It pins the client's contract:
// base-URL composition, Bearer-token injection, JSON (de)serialization, and the
// ApiError mapping (status + the backend's `detail`).
import { describe, expect, it, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "./msw.setup";
import { apiGet, apiPost, apiDelete, setToken, clearToken } from "../api/client";

// jsdom has no window.__APP_CONFIG__ and no VITE_API_BASE_URL, so config.ts falls back
// to this default — the address MSW intercepts.
const BASE = "http://localhost:8000";

beforeEach(() => localStorage.clear());

describe("api client over MSW (integration)", () => {
  it("GET resolves typed JSON and attaches the Bearer token", async () => {
    let seenAuth: string | null = null;
    server.use(
      http.get(`${BASE}/projects`, ({ request }) => {
        seenAuth = request.headers.get("authorization");
        return HttpResponse.json([{ id: 1, name: "demo" }]);
      }),
    );
    setToken("jwt-abc");

    const out = await apiGet<{ id: number; name: string }[]>("/projects");

    expect(out).toEqual([{ id: 1, name: "demo" }]);
    expect(seenAuth).toBe("Bearer jwt-abc");
  });

  it("GET without a token sends no Authorization header", async () => {
    let hasAuth = true;
    server.use(
      http.get(`${BASE}/healthz`, ({ request }) => {
        hasAuth = request.headers.has("authorization");
        return HttpResponse.json({ ok: true });
      }),
    );
    clearToken();

    await apiGet("/healthz");

    expect(hasAuth).toBe(false);
  });

  it("POST serializes the body as JSON with a Content-Type header", async () => {
    let body: unknown = null;
    let contentType: string | null = null;
    server.use(
      http.post(`${BASE}/recommendations`, async ({ request }) => {
        contentType = request.headers.get("content-type");
        body = await request.json();
        return HttpResponse.json({ shortlist: [] }, { status: 201 });
      }),
    );

    const res = await apiPost<{ shortlist: unknown[] }>("/recommendations", {
      taskTypes: ["ci_review"],
      budgetSensitivity: "high",
    });

    expect(res).toEqual({ shortlist: [] });
    expect(contentType).toContain("application/json");
    expect(body).toEqual({ taskTypes: ["ci_review"], budgetSensitivity: "high" });
  });

  it("maps a non-2xx response to ApiError carrying status + backend detail", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ detail: "Invalid email or password" }, { status: 401 }),
      ),
    );

    await expect(
      apiPost("/auth/login", { email: "a@b.c", password: "x" }),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Invalid email or password",
    });
  });

  it("falls back to status text when the error body is not JSON", async () => {
    server.use(
      http.get(`${BASE}/boom`, () =>
        HttpResponse.text("upstream exploded", {
          status: 502,
          statusText: "Bad Gateway",
        }),
      ),
    );

    await expect(apiGet("/boom")).rejects.toMatchObject({ status: 502 });
  });

  it("DELETE accepts a 204 No Content body and resolves void", async () => {
    server.use(
      http.delete(`${BASE}/projects/1`, () => new HttpResponse(null, { status: 204 })),
    );

    await expect(apiDelete("/projects/1")).resolves.toBeUndefined();
  });
});
