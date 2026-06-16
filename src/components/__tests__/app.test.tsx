import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { App } from "../../App";
import { ApiError, clearToken, setToken } from "../../api/client";
import { VALUE_PROP } from "../../lib/valueProp";
import { projectsFixture, savingsFixture, chatHistoryFixture } from "../../test/fixtures";

vi.mock("../../api/projects", () => ({ listProjects: vi.fn(), createProject: vi.fn() }));
import { listProjects } from "../../api/projects";
vi.mock("../../api/savings", () => ({
  getSavings: vi.fn(),
  getRunFindings: vi.fn().mockResolvedValue({ runId: 0, findings: [] }),
}));
import { getSavings } from "../../api/savings";
vi.mock("../../api/chat", () => ({ getChatHistory: vi.fn(), postChat: vi.fn() }));
import { getChatHistory } from "../../api/chat";
// The signed-out screens call the real login/register; stub them so the routing tests
// can drive the auth toggle + onAuthed hand-off without a backend.
vi.mock("../../api/auth", () => ({ login: vi.fn(), register: vi.fn() }));
import { login, register } from "../../api/auth";

beforeEach(() => {
  clearToken();
  // App now restores its phase from window.history.state (so a reload stays on the
  // dashboard). jsdom persists that across tests in a file, so reset it to mimic a fresh
  // page load — otherwise one test's navigation leaks into the next.
  window.history.replaceState(null, "", "/");
  vi.mocked(listProjects).mockReset();
  vi.mocked(getSavings).mockReset();
  vi.mocked(getChatHistory).mockReset();
  vi.mocked(login).mockReset();
  vi.mocked(register).mockReset();
});

describe("App routing", () => {
  it("shows Login when there is no token", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("lands on the home hub (value prop) after sign-in", async () => {
    setToken("jwt");
    vi.mocked(listProjects).mockResolvedValue(projectsFixture);
    render(<App />);
    // the home hero shows the value prop headline
    expect(await screen.findByRole("heading", { name: VALUE_PROP.headline })).toBeInTheDocument();
  });

  it("home → View my agents lands on the dashboard", async () => {
    setToken("jwt");
    vi.mocked(listProjects).mockResolvedValue(projectsFixture);
    vi.mocked(getSavings).mockResolvedValue(savingsFixture);
    vi.mocked(getChatHistory).mockResolvedValue(chatHistoryFixture);
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /view my ci-agents/i }));
    // the dashboard's agent switcher is the tell
    expect(await screen.findByLabelText("Select CI-Agent")).toBeInTheDocument();
  });

  it("a new user (0 agents) is nudged to create their first agent → onboarding", async () => {
    setToken("jwt");
    vi.mocked(listProjects).mockResolvedValue([]);
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /create your first ci-agent/i }));
    expect(await screen.findByText(/Set up your code-review agent/)).toBeInTheDocument();
  });

  it("the dashboard logo returns to the home hub", async () => {
    setToken("jwt");
    vi.mocked(listProjects).mockResolvedValue(projectsFixture);
    vi.mocked(getSavings).mockResolvedValue(savingsFixture);
    vi.mocked(getChatHistory).mockResolvedValue(chatHistoryFixture);
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /view my ci-agents/i }));
    await screen.findByLabelText("Select CI-Agent");
    fireEvent.click(screen.getByRole("button", { name: /^home$/i }));
    expect(await screen.findByRole("heading", { name: VALUE_PROP.headline })).toBeInTheDocument();
  });

  it("returns to Login when the projects probe 401s", async () => {
    setToken("jwt");
    vi.mocked(listProjects).mockRejectedValue(new ApiError(401, "expired"));
    render(<App />);
    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});

describe("App auth-view toggle", () => {
  function fillRegister(email: string, password: string) {
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: password },
    });
  }

  it("the Login 'Sign up' link switches to the Register view", () => {
    render(<App />);
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    // Register is the only auth screen with a confirm-password field + Create account.
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("Register's onAuthed runs the SAME authed → home/project-probe flow as Login", async () => {
    // register → auto-login resolves a token → onAuthed → the projects probe → home hub,
    // exactly like the Login path.
    vi.mocked(register).mockResolvedValue({ id: 1, email: "new@example.com" });
    vi.mocked(login).mockResolvedValue({ accessToken: "jwt-reg", tokenType: "bearer" });
    vi.mocked(listProjects).mockResolvedValue(projectsFixture);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    fillRegister("new@example.com", "hunter2");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByRole("heading", { name: VALUE_PROP.headline }),
    ).toBeInTheDocument();
    expect(listProjects).toHaveBeenCalled();
  });

  it("Register's 'Sign in' link toggles back to the Login view", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});
