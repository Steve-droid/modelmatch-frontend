import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type {
  BudgetSensitivity,
  LatencyNeed,
  RecommendationResult,
} from "../../types/recommend";
import { postRecommendation } from "../../api/recommend";
import { ApiError } from "../../api/client";

// S15b onboarding is scoped to ci_review — the product's proof path (the agent
// reviews PR diffs), where the catalog + baseline (Sonnet-class) are sound. Other
// task types (e.g. agentic_coding) are hidden until their catalog/baseline story is
// corrected backend-side, so the task is shown as a fixed pill, not a selector. The
// recommender itself still supports them; the form always sends ["ci_review"].
const BUDGETS: { value: BudgetSensitivity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

// "Agent speed" preference → backend `latencyNeed` payload. The visible labels are
// user-facing; the wire values (null/"low"/"medium"/"high") are the backend contract.
const LATENCIES: { value: LatencyNeed | "any"; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "low", label: "Fast" },
  { value: "medium", label: "Balanced" },
  { value: "high", label: "Quality-first" },
];

// Structured recommender form. Submits to POST /recommendations and hands the ranked
// result up via onResult. No LLM on this path.
export function RecommenderForm({
  onResult,
  onUnauthorized,
}: {
  onResult: (r: RecommendationResult) => void;
  onUnauthorized?: () => void;
}) {
  // Fixed for now (onboarding is scoped to ci_review); kept as state so the payload
  // contract stays explicit and the recommender can re-expose task choice later.
  const [taskTypes] = useState<string[]>(["ci_review"]);
  const [budget, setBudget] = useState<BudgetSensitivity>("high");
  const [latency, setLatency] = useState<LatencyNeed | "any">("any");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleApiError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) onUnauthorized?.();
    else if (e instanceof ApiError) setError(e.message);
    else setError("Could not reach the backend.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (taskTypes.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await postRecommendation({
        taskTypes,
        budgetSensitivity: budget,
        latencyNeed: latency === "any" ? null : latency,
      });
      onResult(result);
    } catch (e) {
      handleApiError(e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/20 text-accent">
          <Sparkles size={15} />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Set up your code-review agent</div>
          <div className="text-xs text-faint">
            ModelMatch recommends a cost-effective model to review your pull requests in CI,
            then proves it's good enough by counting the savings against a premium baseline —
            no LLM in the ranking.
          </div>
        </div>
      </div>

      {/* task — fixed to CI code review (not selectable); shown as a static pill */}
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-muted">Task</span>
        <span className="rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 font-medium text-gray-200">
          Code-quality &amp; security review
        </span>
      </div>

      {/* budget + latency — two segmented controls aligned on the same baseline.
          Agent speed (4 options) gets a wider column so its labels fit on one line. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1.35fr] sm:items-start">
        <Segmented
          label="Budget sensitivity"
          options={BUDGETS}
          value={budget}
          onChange={(v) => setBudget(v as BudgetSensitivity)}
        />
        <Segmented
          label="CI-Agent speed"
          options={LATENCIES}
          value={latency}
          onChange={(v) => setLatency(v as LatencyNeed | "any")}
        />
      </div>

      {error && (
        <div className="rounded-md border border-risk/40 bg-risk/10 px-3 py-2 text-sm text-risk">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={taskTypes.length === 0 || submitting}
        className="flex items-center justify-center gap-2 self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        Get recommendation
      </button>
    </form>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="flex min-h-[2.25rem] items-stretch rounded-md border border-border bg-panel-2 p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex min-w-0 flex-1 items-center justify-center rounded px-2 text-center text-xs font-medium leading-tight transition-colors ${
              value === o.value
                ? "bg-panel text-gray-100"
                : "text-muted hover:text-gray-200"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
