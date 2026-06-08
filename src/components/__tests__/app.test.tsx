import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { App } from "../../App";
import { ApiError, clearToken, setToken } from "../../api/client";
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
  vi.mocked(listProjects).mockReset();
  vi.mocked(getSavings).mockReset();
  vi.mocked(getChatHistory).mockReset();
});

describe("App routing", () => {
  it("shows Login when there is no token", () => {
    render(<App />);
    expect(screen.getByText("Sign in to your savings dashboard")).toBeInTheDocument();
  });

  it("lands on onboarding when the signed-in user has no projects", async () => {
    setToken("jwt");
    vi.mocked(listProjects).mockResolvedValue([]);
    render(<App />);
    expect(await screen.findByText(/Find a cost-effective model/)).toBeInTheDocument();
  });

  it("lands on the dashboard when the user already has projects", async () => {
    setToken("jwt");
    vi.mocked(listProjects).mockResolvedValue(projectsFixture);
    vi.mocked(getSavings).mockResolvedValue(savingsFixture);
    vi.mocked(getChatHistory).mockResolvedValue(chatHistoryFixture);
    render(<App />);
    // the dashboard's project switcher is the tell
    expect(await screen.findByLabelText("Select project")).toBeInTheDocument();
  });

  it("returns to Login when the projects probe 401s", async () => {
    setToken("jwt");
    vi.mocked(listProjects).mockRejectedValue(new ApiError(401, "expired"));
    render(<App />);
    expect(await screen.findByText("Sign in to your savings dashboard")).toBeInTheDocument();
  });
});
