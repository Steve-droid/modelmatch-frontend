import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { Login } from "../../pages/Login";
import { ApiError, getToken } from "../../api/client";

vi.mock("../../api/auth", () => ({ login: vi.fn() }));
import { login } from "../../api/auth";

beforeEach(() => {
  localStorage.clear();
  vi.mocked(login).mockReset();
});

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
}

describe("Login", () => {
  it("stores the token and signals onAuthed on success", async () => {
    vi.mocked(login).mockResolvedValue({ accessToken: "jwt-123", tokenType: "bearer" });
    const onAuthed = vi.fn();
    render(<Login onAuthed={onAuthed} onRegister={vi.fn()} />);

    fill("steve@example.com", "hunter2");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(onAuthed).toHaveBeenCalled());
    expect(login).toHaveBeenCalledWith("steve@example.com", "hunter2");
    expect(getToken()).toBe("jwt-123");
  });

  it("shows a friendly message on bad credentials (401), no token stored", async () => {
    vi.mocked(login).mockRejectedValue(new ApiError(401, "Invalid email or password"));
    const onAuthed = vi.fn();
    render(<Login onAuthed={onAuthed} onRegister={vi.fn()} />);

    fill("steve@example.com", "wrong");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
    expect(onAuthed).not.toHaveBeenCalled();
    expect(getToken()).toBeNull();
  });

  it("keeps Sign in disabled until both fields are filled", () => {
    render(<Login onAuthed={vi.fn()} onRegister={vi.fn()} />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
    fill("a@b.com", "");
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
    fill("a@b.com", "pw");
    expect(screen.getByRole("button", { name: /sign in/i })).toBeEnabled();
  });
});
