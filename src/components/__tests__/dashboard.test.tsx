import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { KpiCard } from "../KpiCard";
import { QualityPill } from "../StatusBadge";
import { RunsTable } from "../RunsTable";
import { buildAreaData } from "../SavingsAreaChart";
import { formatUSD } from "../../lib/format";
import {
  savingsFixture,
  overspendFixture,
  overspendSeriesPoint,
  projectsFixture,
  chatHistoryFixture,
} from "../../test/fixtures";

// getRunFindings is called from RunsTable on row click; stub it so imports resolve.
vi.mock("../../api/savings", () => ({
  getSavings: vi.fn(),
  getRunFindings: vi.fn().mockResolvedValue({ runId: 0, findings: [] }),
}));
import { getSavings } from "../../api/savings";

// The Dashboard now loads the project list (switcher) and mounts the chat panel;
// stub both so it can render savings without real network calls.
vi.mock("../../api/projects", () => ({ listProjects: vi.fn() }));
import { listProjects } from "../../api/projects";
vi.mock("../../api/chat", () => ({
  getChatHistory: vi.fn(),
  postChat: vi.fn(),
}));
import { getChatHistory } from "../../api/chat";

describe("formatUSD", () => {
  it("uses finer precision below a dollar, 2dp above", () => {
    expect(formatUSD("0.005800")).toBe("$0.0058");
    expect(formatUSD("12.5")).toBe("$12.50");
    expect(formatUSD(null)).toBe("—");
  });

  it("places the sign before the $ for overspend (negative)", () => {
    expect(formatUSD("-0.010000")).toBe("-$0.0100");
  });
});

describe("buildAreaData (chart transform)", () => {
  it("splits a normal run into a green gain, no loss", () => {
    const [p] = buildAreaData([savingsFixture.series[0]]); // savings 0.02, actual 0.01
    expect(p.floor).toBe(0.01); // min(actual, baseline) = actual
    expect(p.gain).toBeCloseTo(0.02); // the savings band
    expect(p.loss).toBe(0);
  });

  it("surfaces overspend as a red loss, never clamped away", () => {
    const [p] = buildAreaData([overspendSeriesPoint]); // actual 0.04 > baseline 0.03
    expect(p.savings).toBeCloseTo(-0.01); // signed, NOT clamped to 0
    expect(p.floor).toBe(0.03); // min = baseline
    expect(p.gain).toBe(0); // no savings
    expect(p.loss).toBeCloseTo(0.01); // the overspend band
  });
});

describe("KpiCard", () => {
  it("renders the label and a ready value", () => {
    render(<KpiCard label="Cumulative saved" value="$0.0450" />);
    expect(screen.getByText("Cumulative saved")).toBeInTheDocument();
    expect(screen.getByText("$0.0450")).toBeInTheDocument();
  });
});

describe("QualityPill", () => {
  it("labels the three quality states distinctly", () => {
    const { rerender } = render(<QualityPill qualityOk={true} />);
    expect(screen.getByText("Banked")).toBeInTheDocument();
    rerender(<QualityPill qualityOk={false} />);
    expect(screen.getByText("Quality risk")).toBeInTheDocument();
    rerender(<QualityPill qualityOk={null} />);
    expect(screen.getByText("Unrated")).toBeInTheDocument();
  });
});

describe("RunsTable", () => {
  it("shows every run, flagging the quality-risk one (never silently dropped)", () => {
    render(<RunsTable projectId={1} runs={savingsFixture.runs} />);
    expect(screen.getByText("101")).toBeInTheDocument();
    expect(screen.getByText("102")).toBeInTheDocument();
    expect(screen.getByText("103")).toBeInTheDocument();
    expect(screen.getByText("Quality risk")).toBeInTheDocument();
    expect(screen.getByText("Unrated")).toBeInTheDocument();
  });

  it("renders an overspend run's savings in red, not green", () => {
    render(<RunsTable projectId={1} runs={overspendFixture.runs} />);
    const cell = screen.getByText("-$0.0100");
    expect(cell.className).toContain("text-risk");
    expect(cell.className).not.toContain("text-banked");
  });
});

describe("Dashboard (overspend)", () => {
  it("labels a net overspend in red copy, not green 'saved'", async () => {
    vi.mocked(getSavings).mockResolvedValue(overspendFixture);
    vi.mocked(listProjects).mockResolvedValue(projectsFixture);
    vi.mocked(getChatHistory).mockResolvedValue(chatHistoryFixture);
    const { Dashboard } = await import("../../pages/Dashboard");
    render(<Dashboard />);
    await screen.findByText("Net overspend");
    // count-up settles on the final frame → poll for the settled value
    const value = await screen.findByText("-$0.0100");
    expect(value.className).toContain("text-risk");
  });

  it("clears the previous project's numbers when switching projects", async () => {
    // Project 1 resolves; project 2 stays pending so we can observe the gap.
    vi.mocked(getSavings)
      .mockResolvedValueOnce(savingsFixture) // project 1 ($0.0450 saved)
      .mockReturnValueOnce(new Promise(() => {})); // project 2 — never resolves
    vi.mocked(listProjects).mockResolvedValue(projectsFixture);
    vi.mocked(getChatHistory).mockResolvedValue(chatHistoryFixture);
    const { Dashboard } = await import("../../pages/Dashboard");
    render(<Dashboard />);

    // project 1's savings panel is on screen (stable label, not the animated number)
    await screen.findByText("Cumulative saved");

    // switch to project 2 (savings still loading)
    fireEvent.change(screen.getByLabelText("Select project"), { target: { value: "2" } });

    // project 1's numbers must disappear immediately — not linger under project 2
    await waitFor(() =>
      expect(screen.queryByText("Cumulative saved")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Loading savings…")).toBeInTheDocument();
  });
});
