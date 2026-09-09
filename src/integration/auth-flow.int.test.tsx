// Integration: the Login page driven through the REAL fetch stack against MSW.
// The unit test for Login (src/components/__tests__/login.test.tsx) `vi.mock`s
// api/auth; here nothing is mocked below the network — render → submit → real
// login() → apiPost → fetch → MSW. It proves the page wiring AND the client layer
// behave together end-to-end (token persistence on 200, friendly error on 401).
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "./msw.setup";
import { Login } from "../pages/Login";
import { Register } from "../pages/Register";
import { getToken } from "../api/client";

const BASE = "http://localhost:8000";

beforeEach(() => {
  localStorage.clear();
  server.use(http.get(`${BASE}/auth/google/config`, () => HttpResponse.json({ enabled: false })));
});

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
}

function fillRegister(email: string, password: string) {
  fill(email, password);
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: password },
  });
}

describe("Login flow over MSW (integration)", () => {
  it("submits credentials, stores the JWT from the real response, and signals onAuthed", async () => {
    let received: unknown = null;
    server.use(
      http.post(`${BASE}/auth/login`, async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ accessToken: "jwt-xyz", tokenType: "bearer" });
      }),
    );
    const onAuthed = vi.fn();
    render(<Login onAuthed={onAuthed} onRegister={vi.fn()} />);

    fill("steve@example.com", "hunter2");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(onAuthed).toHaveBeenCalled());
    expect(received).toEqual({ email: "steve@example.com", password: "hunter2" });
    expect(getToken()).toBe("jwt-xyz");
  });

  it("surfaces a friendly message on a real 401 and stores no token", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ detail: "Invalid email or password" }, { status: 401 }),
      ),
    );
    const onAuthed = vi.fn();
    render(<Login onAuthed={onAuthed} onRegister={vi.fn()} />);

    fill("steve@example.com", "wrong");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
    expect(onAuthed).not.toHaveBeenCalled();
    expect(getToken()).toBeNull();
  });
});

describe("Register flow over MSW (integration)", () => {
  it("registers, auto-logs-in off the real token response, and signals onAuthed", async () => {
    let registerBody: unknown = null;
    server.use(
      http.post(`${BASE}/auth/register`, async ({ request }) => {
        registerBody = await request.json();
        // Register returns the created user (id + email), NOT a token.
        return HttpResponse.json({ id: 42, email: "new@example.com" }, { status: 201 });
      }),
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ accessToken: "jwt-reg", tokenType: "bearer" }),
      ),
    );
    const onAuthed = vi.fn();
    render(<Register onAuthed={onAuthed} onSignIn={vi.fn()} />);

    fillRegister("new@example.com", "hunter2");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(onAuthed).toHaveBeenCalled());
    expect(registerBody).toEqual({ email: "new@example.com", password: "hunter2" });
    expect(getToken()).toBe("jwt-reg");
  });

  it("surfaces a friendly message on a real 409 (email taken) and stores no token", async () => {
    server.use(
      http.post(`${BASE}/auth/register`, () =>
        HttpResponse.json({ detail: "Email already registered" }, { status: 409 }),
      ),
    );
    const onAuthed = vi.fn();
    render(<Register onAuthed={onAuthed} onSignIn={vi.fn()} />);

    fillRegister("taken@example.com", "hunter2");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/already registered/i)).toBeInTheDocument();
    expect(onAuthed).not.toHaveBeenCalled();
    expect(getToken()).toBeNull();
  });

  it("surfaces a validation message on a real 422 and stores no token", async () => {
    server.use(
      http.post(`${BASE}/auth/register`, () =>
        HttpResponse.json(
          { detail: [{ type: "value_error", loc: ["body", "email"], msg: "invalid" }] },
          { status: 422 },
        ),
      ),
    );
    const onAuthed = vi.fn();
    render(<Register onAuthed={onAuthed} onSignIn={vi.fn()} />);

    fillRegister("bad@example.com", "hunter2");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/valid email and password/i)).toBeInTheDocument();
    expect(onAuthed).not.toHaveBeenCalled();
    expect(getToken()).toBeNull();
  });
});
