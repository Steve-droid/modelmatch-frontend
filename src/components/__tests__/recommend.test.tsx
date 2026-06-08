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

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(recommendationFixture));
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
    expect(screen.getByText(/Compared like-for-like within CodeReviewBench/)).toBeInTheDocument();
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

  it("excludes data-only providers (OpenAI) from the selectable options", async () => {
    // Suggested is OpenAI (data-only, no CI adapter); the only runnable option is Anthropic.
    const openAiSuggested = {
      ...recommendationFixture.suggested,
      recommendationOptionId: 21,
      model: "GPT-5 Mini",
      vendor: "OpenAI",
    };
    const runnable = {
      ...recommendationFixture.suggested,
      recommendationOptionId: 22,
      model: "Claude Haiku 4.5",
      vendor: "Anthropic",
    };
    const result = {
      ...recommendationFixture,
      suggested: openAiSuggested,
      shortlist: [openAiSuggested, runnable],
    };
    const onSubmit = okSubmit();
    render(<RecommendationView result={result} onSubmit={onSubmit} />);

    // OpenAI is not offered; the runnable Anthropic option is
    expect(screen.queryByText("GPT-5 Mini")).not.toBeInTheDocument();
    expect(screen.getByText("Claude Haiku 4.5")).toBeInTheDocument();
    expect(screen.getByText(/data-only option.*hidden/i)).toBeInTheDocument();

    // defaults to the runnable option, never the filtered-out OpenAI one
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "acme-api" } });
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "acme-api",
        selectedOptionId: 22, // the runnable Anthropic option
        baselineModelId: recommendationFixture.baseline.modelId,
      }),
    );
  });
});
