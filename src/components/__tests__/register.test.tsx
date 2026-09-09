vi.mock("../GoogleSignIn", () => ({ GoogleSignIn: () => null }));
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { Register } from "../../pages/Register";
import { ApiError, getToken } from "../../api/client";

// Register creates the account (register) then logs in to get a token (login) — mock both.
vi.mock("../../api/auth", () => ({ register: vi.fn(), login: vi.fn() }));
import { login, register } from "../../api/auth";

beforeEach(() => {
  localStorage.clear();
  vi.mocked(register).mockReset();
  vi.mocked(login).mockReset();
});

function fill(email: string, password: string, confirm = password) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: confirm },
  });
}

describe("Register", () => {
  it("registers, auto-logs-in, stores the token and signals onAuthed on success", async () => {
    vi.mocked(register).mockResolvedValue({ id: 7, email: "steve@example.com" });
    vi.mocked(login).mockResolvedValue({ accessToken: "jwt-123", tokenType: "bearer" });
    const onAuthed = vi.fn();
    render(<Register onAuthed={onAuthed} onSignIn={vi.fn()} />);

    fill("steve@example.com", "hunter2");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(onAuthed).toHaveBeenCalled());
    expect(register).toHaveBeenCalledWith("steve@example.com", "hunter2");
    expect(login).toHaveBeenCalledWith("steve@example.com", "hunter2");
    expect(getToken()).toBe("jwt-123");
  });

  it("shows a friendly message when the email is already registered (409)", async () => {
    vi.mocked(register).mockRejectedValue(new ApiError(409, "Email already registered"));
    const onAuthed = vi.fn();
    render(<Register onAuthed={onAuthed} onSignIn={vi.fn()} />);

    fill("taken@example.com", "hunter2");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/already registered/i),
    ).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
    expect(onAuthed).not.toHaveBeenCalled();
    expect(getToken()).toBeNull();
  });

  it("shows a validation message on 422 and stores no token", async () => {
    vi.mocked(register).mockRejectedValue(
      new ApiError(422, "Unprocessable Entity"),
    );
    const onAuthed = vi.fn();
    render(<Register onAuthed={onAuthed} onSignIn={vi.fn()} />);

    fill("bad@example.com", "short");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/valid email and password/i),
    ).toBeInTheDocument();
    expect(register).toHaveBeenCalledWith("bad@example.com", "short");
    expect(login).not.toHaveBeenCalled();
    expect(onAuthed).not.toHaveBeenCalled();
    expect(getToken()).toBeNull();
  });

  it("reassures (account created) when register succeeds but the auto-login fails", async () => {
    vi.mocked(register).mockResolvedValue({ id: 9, email: "new@example.com" });
    vi.mocked(login).mockRejectedValue(new ApiError(401, "Invalid email or password"));
    const onAuthed = vi.fn();
    const onSignIn = vi.fn();
    render(<Register onAuthed={onAuthed} onSignIn={onSignIn} />);

    fill("new@example.com", "hunter2");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    // Distinct, reassuring message — NOT a generic failure — plus a way back to sign-in.
    expect(await screen.findByText(/account was created/i)).toBeInTheDocument();
    expect(register).toHaveBeenCalledWith("new@example.com", "hunter2");
    expect(login).toHaveBeenCalledWith("new@example.com", "hunter2");
    expect(onAuthed).not.toHaveBeenCalled();
    expect(getToken()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /go to sign in/i }));
    expect(onSignIn).toHaveBeenCalled();
  });

  it("keeps Create account disabled until fields are filled and passwords match", () => {
    render(<Register onAuthed={vi.fn()} onSignIn={vi.fn()} />);
    const btn = () => screen.getByRole("button", { name: /create account/i });
    expect(btn()).toBeDisabled();
    fill("a@b.com", "pw1", "pw2");
    expect(btn()).toBeDisabled();
    expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    fill("a@b.com", "pw1", "pw1");
    expect(btn()).toBeEnabled();
  });
});
