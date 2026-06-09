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

beforeEach(() => {
  clearToken();
  // App now restores its phase from window.history.state (so a reload stays on the
  // dashboard). jsdom persists that across tests in a file, so reset it to mimic a fresh
  // page load — otherwise one test's navigation leaks into the next.
  window.history.replaceState(null, "", "/");
  vi.mocked(listProjects).mockReset();
  vi.mocked(getSavings).mockReset();
  vi.mocked(getChatHistory).mockReset();
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
