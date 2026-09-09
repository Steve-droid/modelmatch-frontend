import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { RecommenderForm } from "../onboarding/RecommenderForm";
import { RecommendationView } from "../onboarding/RecommendationView";
import { ApiError } from "../../api/client";
import { recommendationFixture } from "../../test/fixtures";

vi.mock("../../api/recommend", () => ({
  postRecommendation: vi.fn(),
}));
import { postRecommendation } from "../../api/recommend";

beforeEach(() => {
  vi.mocked(postRecommendation).mockReset();
});

// The view is persistence-agnostic now (S15d): it emits the chosen pick via onSubmit;
// the parent creates (onboarding) or PATCHes (edit). These assert the pick payload.
const okSubmit = () => vi.fn().mockResolvedValue(undefined);

describe("RecommenderForm", () => {
  it("submits the structured form and hands the result up", async () => {
    vi.mocked(postRecommendation).mockResolvedValue(recommendationFixture);
    const onResult = vi.fn();
    render(<RecommenderForm onResult={onResult} />);

    fireEvent.click(screen.getByRole("button", { name: /get recommendation/i }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(recommendationFixture, "ci_review"));
    // default form state → ci_review, budget high, latency "any" → null on the wire
    expect(postRecommendation).toHaveBeenCalledWith({
      taskTypes: ["ci_review"],
      budgetSensitivity: "high",
      latencyNeed: null,
    });
  });

  // The "Agent speed" control relabels the latency options, but the backend payload
  // contract is null/"low"/"medium"/"high" — prove each label maps to its wire value.
  it.each([
    ["Any", null],
    ["Fast", "low"],
    ["Balanced", "medium"],
    ["Quality-first", "high"],
  ] as const)(
    'agent-speed "%s" sends latencyNeed %j',
    async (label, wireValue) => {
      vi.mocked(postRecommendation).mockResolvedValue(recommendationFixture);
      render(<RecommenderForm onResult={vi.fn()} />);

      fireEvent.click(screen.getByRole("button", { name: label }));
      fireEvent.click(screen.getByRole("button", { name: /get recommendation/i }));

      await waitFor(() =>
        expect(postRecommendation).toHaveBeenCalledWith({
          taskTypes: ["ci_review"],
          budgetSensitivity: "high",
          latencyNeed: wireValue,
        }),
      );
    },
  );

  // P38c: the task is chosen, not fixed. Each task is measured by ONE benchmark, so
  // the selector both sets the payload and tells the user what the ranking will be
  // based on — a score is meaningless without the thing that produced it.
  it("offers both tasks and names the benchmark each is ranked on", () => {
    render(<RecommenderForm onResult={vi.fn()} />);

    expect(screen.getByRole("button", { name: /PR code review/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Security analysis/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Ranked on CodeReviewBench \(Jun 2026 snapshot\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ranked on RealVuln v2.1/)).toBeInTheDocument();
  });

  it("defaults to PR code review", async () => {
    vi.mocked(postRecommendation).mockResolvedValue(recommendationFixture);
    render(<RecommenderForm onResult={vi.fn()} />);

    expect(screen.getByRole("button", { name: /PR code review/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /Security analysis/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("sends the selected task, and only ever one", async () => {
    vi.mocked(postRecommendation).mockResolvedValue(recommendationFixture);
    render(<RecommenderForm onResult={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Security analysis/i }));
    fireEvent.click(screen.getByRole("button", { name: /get recommendation/i }));

    await waitFor(() =>
      expect(postRecommendation).toHaveBeenCalledWith({
        taskTypes: ["security_analysis"],
        budgetSensitivity: "high",
        latencyNeed: null,
      }),
    );
    // exactly one task — two would span two benchmarks, which the backend rejects
    // (422) because their scores share no scale
    const sent = vi.mocked(postRecommendation).mock.calls[0][0];
    expect(sent.taskTypes).toHaveLength(1);
  });

  it("is single-select: choosing the other task replaces the first", async () => {
    vi.mocked(postRecommendation).mockResolvedValue(recommendationFixture);
    render(<RecommenderForm onResult={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Security analysis/i }));
    fireEvent.click(screen.getByRole("button", { name: /PR code review/i }));
    fireEvent.click(screen.getByRole("button", { name: /get recommendation/i }));

    await waitFor(() =>
      expect(postRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({ taskTypes: ["ci_review"] }),
      ),
    );
  });

  it("shows an error when the recommendation request fails", async () => {
    vi.mocked(postRecommendation).mockRejectedValue(new ApiError(422, "No catalog rows match"));
    render(<RecommenderForm onResult={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /get recommendation/i }));
    expect(await screen.findByText("No catalog rows match")).toBeInTheDocument();
  });

  it("bubbles a 401 up via onUnauthorized", async () => {
    vi.mocked(postRecommendation).mockRejectedValue(new ApiError(401, "expired"));
    const onUnauthorized = vi.fn();
    render(<RecommenderForm onResult={vi.fn()} onUnauthorized={onUnauthorized} />);
    fireEvent.click(screen.getByRole("button", { name: /get recommendation/i }));
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled());
  });
});

describe("RecommendationView", () => {
  it("renders the suggestion, baseline, comparability group and shortlist", () => {
    render(<RecommendationView result={recommendationFixture} onSubmit={okSubmit()} />);
    expect(screen.getByText(/scored on the same benchmark, CodeReviewBench/i)).toBeInTheDocument();
    expect(screen.getByText("Suggested")).toBeInTheDocument();
    expect(screen.getByText("Nova 2 Lite")).toBeInTheDocument(); // the other shortlist option
    expect(screen.getByText(/Claude Sonnet 4.5/)).toBeInTheDocument(); // baseline
  });

  it("emits the suggested option + baseline by default", async () => {
    const onSubmit = okSubmit();
    render(<RecommendationView result={recommendationFixture} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "acme-api" } });
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "acme-api",
        selectedOptionId: 11, // suggested
        baselineModelId: 9, // baseline.modelId
      }),
    );
  });

  it("uses the chosen shortlist option in the emitted pick", async () => {
    const onSubmit = okSubmit();
    render(<RecommendationView result={recommendationFixture} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText("Nova 2 Lite")); // select the non-suggested option
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "acme-api" } });
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "acme-api",
        selectedOptionId: 12, // the chosen Nova option
        baselineModelId: 9,
      }),
    );
  });

  it("drops the 'costed against' baseline line when the pick IS the baseline (E20)", () => {
    // the baseline is a scored, runnable row and may sit in the shortlist itself
    const result = {
      ...recommendationFixture,
      shortlist: [
        ...recommendationFixture.shortlist,
        {
          ...recommendationFixture.shortlist[0],
          recommendationOptionId: 13,
          rank: 3,
          model: "Claude Sonnet 4.5",
          modelId: recommendationFixture.baseline.modelId,
          costPerMtok: "8.000000",
        },
      ],
    };
    render(<RecommendationView result={result} onSubmit={okSubmit()} />);
    expect(screen.getByText(/Baseline \(costed, not run\)/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Claude Sonnet 4.5/ }));
    expect(screen.queryByText(/Baseline \(costed, not run\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/measured against/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Nova 2 Lite/ }));
    expect(screen.getByText(/Baseline \(costed, not run\)/)).toBeInTheDocument();
  });

  it("supports an edit label + a prefilled name (re-pick mode)", () => {
    render(
      <RecommendationView
        result={recommendationFixture}
        onSubmit={okSubmit()}
        submitLabel="Save changes"
        initialName="existing-project"
      />,
    );
    expect(screen.getByLabelText("Project name")).toHaveValue("existing-project");
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("bubbles a 401 up via onUnauthorized", async () => {
    const onUnauthorized = vi.fn();
    render(
      <RecommendationView
        result={recommendationFixture}
        onSubmit={vi.fn().mockRejectedValue(new ApiError(401, "expired"))}
        onUnauthorized={onUnauthorized}
      />,
    );
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled());
  });

  it("offers every ranked option — runnable is the backend's call, not a vendor allowlist", async () => {
    // Regression: this view used to re-filter the shortlist against a hardcoded
    // vendor allowlist ("anthropic" | "google" | "amazon"). That was a SECOND source
    // of truth for "runnable", and it went stale the moment a new provider was
    // enabled — it hid DeepSeek V4 Flash, the TOP-ranked security pick, and silently
    // promoted the runner-up (Gemini 3.5 Flash) in its place. The backend already
    // restricts the pick to models with an enabled agent_runtime_config, so the
    // shortlist is offered as given.
    const deepseek = {
      ...recommendationFixture.suggested,
      recommendationOptionId: 31,
      model: "DeepSeek V4 Flash",
      vendor: "DeepSeek",
    };
    const gemini = {
      ...recommendationFixture.suggested,
      recommendationOptionId: 32,
      model: "Gemini 3.5 Flash",
      vendor: "Google",
    };
    const result = {
      ...recommendationFixture,
      suggested: deepseek,
      shortlist: [deepseek, gemini],
    };
    const onSubmit = okSubmit();
    render(<RecommendationView result={result} onSubmit={onSubmit} />);

    // the unfamiliar vendor is offered, not hidden
    expect(screen.getByText("DeepSeek V4 Flash")).toBeInTheDocument();
    expect(screen.getByText("Gemini 3.5 Flash")).toBeInTheDocument();
    expect(screen.queryByText(/data-only option.*hidden/i)).not.toBeInTheDocument();

    // and it defaults to the SUGGESTED option, not the first familiar vendor
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "acme-api" } });
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "acme-api",
        selectedOptionId: 31, // DeepSeek — the top-ranked pick
        baselineModelId: recommendationFixture.baseline.modelId,
      }),
    );
  });

  it("names the benchmark plainly and does not explain the internal ranked/candidate filter", () => {
    // The user picks a model; how many catalog rows were filtered out on the way is
    // our bookkeeping, not their decision. The counts stay in the API response for
    // operators and the chat, and off this screen.
    const result = {
      ...recommendationFixture,
      comparabilityGroup: {
        benchmark: "RealVuln",
        metric: "f3_score",
        rankedCount: 3,
        candidateCount: 16,
      },
    };
    render(<RecommendationView result={result} onSubmit={okSubmit()} />);

    expect(
      screen.getByText(/scored on the same benchmark, RealVuln/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Ranked 3 of 16/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/f3_score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/comparability/i)).not.toBeInTheDocument();
  });
});
