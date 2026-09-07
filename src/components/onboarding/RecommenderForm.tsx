import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type {
  BudgetSensitivity,
  LatencyNeed,
  RecommendationResult,
} from "../../types/recommend";
import { postRecommendation } from "../../api/recommend";
import { ApiError } from "../../api/client";

// The two tasks the CI agent can perform. Each is measured by ONE benchmark and one
// metric (a hard backend invariant), so the benchmark is shown with the task rather
// than buried in the result — it is what the recommendation will be ranked on, and a
// score only means something next to the thing that produced it. Exactly one task is
// selected; the form sends it as `taskTypes: [task]`.
//
// `agentic_coding` is deliberately absent: those catalog rows exist for breadth and
// are never recommended over, because the product does not run an autonomous coding
// agent in anyone's CI.
const TASKS: {
  value: string;
  label: string;
  benchmark: string;
  blurb: string;
}[] = [
  {
    value: "ci_review",
    label: "PR code review",
    benchmark: "CodeReviewBench (Jun 2026 snapshot)",
    blurb: "One call per pull request: reviews the diff for quality and security issues.",
  },
  {
    value: "security_analysis",
    label: "Security analysis",
    benchmark: "RealVuln v2.1",
    blurb: "An agentic scan of the whole checkout; a critical finding fails the build.",
  },
];

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
  const [task, setTask] = useState<string>(TASKS[0].value);
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
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await postRecommendation({
        // Exactly one task: rows from two benchmarks have no comparable ranking, and
        // the backend rejects a mixed request rather than guessing.
        taskTypes: [task],
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
          <div className="text-lg font-semibold">Set up your CI agent</div>
          <div className="text-sm text-faint">
            ModelMatch recommends a cost-effective model for the job, then proves it's good
            enough by counting the savings against a premium baseline. No LLM in the ranking.
          </div>
        </div>
      </div>

      {/* task — single-select. Each option names the benchmark it will be ranked on. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted">Task</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TASKS.map((t) => {
            const selected = task === t.value;
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setTask(t.value)}
                className={`flex flex-col gap-1 rounded-md border p-3 text-left transition-colors ${
                  selected
                    ? "border-accent/60 bg-accent/10"
                    : "border-border bg-panel-2 hover:border-border/80"
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    selected ? "text-gray-100" : "text-muted"
                  }`}
                >
                  {t.label}
                </span>
                <span className="text-xs text-faint">{t.blurb}</span>
                <span className="mt-0.5 text-xs font-medium text-muted">
                  Ranked on {t.benchmark}
                </span>
              </button>
            );
          })}
        </div>
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
        disabled={submitting}
        className="flex items-center justify-center gap-2 self-start rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
      <span className="text-sm font-medium text-muted">{label}</span>
      <div className="flex min-h-[2.75rem] items-stretch rounded-md border border-border bg-panel-2 p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex min-w-0 flex-1 items-center justify-center rounded px-3 py-2.5 text-center text-sm font-medium leading-tight transition-colors ${
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
