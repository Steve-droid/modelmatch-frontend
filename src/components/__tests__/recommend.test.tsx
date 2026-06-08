import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { RecommenderForm } from "../onboarding/RecommenderForm";
import { RecommendationView } from "../onboarding/RecommendationView";
import { ApiError } from "../../api/client";
import {
  recommendationFixture,
  prefillFixture,
  createdProjectFixture,
} from "../../test/fixtures";

vi.mock("../../api/recommend", () => ({
  postPrefill: vi.fn(),
  postRecommendation: vi.fn(),
}));
import { postPrefill, postRecommendation } from "../../api/recommend";

vi.mock("../../api/projects", () => ({ createProject: vi.fn() }));
import { createProject } from "../../api/projects";

beforeEach(() => {
  vi.mocked(postPrefill).mockReset();
  vi.mocked(postRecommendation).mockReset();
  vi.mocked(createProject).mockReset();
});

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

  it("applies prefill suggestions and shows the matched terms", async () => {
    vi.mocked(postPrefill).mockResolvedValue(prefillFixture);
    vi.mocked(postRecommendation).mockResolvedValue(recommendationFixture);
    render(<RecommenderForm onResult={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Describe your use case"), {
      target: { value: "cheap fast coding agent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /prefill/i }));

    expect(await screen.findByText(/Matched: agent, cheap, fast/)).toBeInTheDocument();
    // prefill applies budget + latency only; task type stays ci_review (S15b scope)
    fireEvent.click(screen.getByRole("button", { name: /get recommendation/i }));
    await waitFor(() =>
      expect(postRecommendation).toHaveBeenCalledWith({
        taskTypes: ["ci_review"],
        budgetSensitivity: "high",
        latencyNeed: "low",
      }),
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
    render(<RecommendationView result={recommendationFixture} onCreated={vi.fn()} />);
    expect(screen.getByText(/Compared like-for-like within CodeReviewBench/)).toBeInTheDocument();
    expect(screen.getByText("Suggested")).toBeInTheDocument();
    expect(screen.getByText("Nova 2 Lite")).toBeInTheDocument(); // the other shortlist option
    expect(screen.getByText(/Claude Sonnet 4.5/)).toBeInTheDocument(); // baseline
  });

  it("creates a project from the suggested option + baseline by default", async () => {
    vi.mocked(createProject).mockResolvedValue(createdProjectFixture);
    const onCreated = vi.fn();
    render(<RecommendationView result={recommendationFixture} onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "acme-api" } });
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(createdProjectFixture));
    expect(createProject).toHaveBeenCalledWith({
      name: "acme-api",
      selectedOptionId: 11, // suggested
      baselineModelId: 9, // baseline.modelId
    });
  });

  it("uses the chosen shortlist option in the create payload", async () => {
    vi.mocked(createProject).mockResolvedValue(createdProjectFixture);
    render(<RecommendationView result={recommendationFixture} onCreated={vi.fn()} />);

    fireEvent.click(screen.getByText("Nova 2 Lite")); // select the non-suggested option
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "acme-api" } });
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith({
        name: "acme-api",
        selectedOptionId: 12, // the chosen Nova option
        baselineModelId: 9,
      }),
    );
  });

  it("bubbles a 401 up via onUnauthorized", async () => {
    vi.mocked(createProject).mockRejectedValue(new ApiError(401, "expired"));
    const onUnauthorized = vi.fn();
    render(
      <RecommendationView
        result={recommendationFixture}
        onCreated={vi.fn()}
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
    vi.mocked(createProject).mockResolvedValue(createdProjectFixture);
    const onCreated = vi.fn();
    render(<RecommendationView result={result} onCreated={onCreated} />);

    // OpenAI is not offered; the runnable Anthropic option is
    expect(screen.queryByText("GPT-5 Mini")).not.toBeInTheDocument();
    expect(screen.getByText("Claude Haiku 4.5")).toBeInTheDocument();
    expect(screen.getByText(/data-only option.*hidden/i)).toBeInTheDocument();

    // creating defaults to the runnable option, never the filtered-out OpenAI one
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "acme-api" } });
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));
    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith({
        name: "acme-api",
        selectedOptionId: 22, // the runnable Anthropic option
        baselineModelId: recommendationFixture.baseline.modelId,
      }),
    );
  });
});
