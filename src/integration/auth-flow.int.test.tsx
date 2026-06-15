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
import { getToken } from "../api/client";

const BASE = "http://localhost:8000";

beforeEach(() => localStorage.clear());

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
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
    render(<Login onAuthed={onAuthed} />);

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
    render(<Login onAuthed={onAuthed} />);

    fill("steve@example.com", "wrong");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
    expect(onAuthed).not.toHaveBeenCalled();
    expect(getToken()).toBeNull();
  });
});
