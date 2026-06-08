import { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import type {
  BudgetSensitivity,
  LatencyNeed,
  RecommendationResult,
} from "../../types/recommend";
import { postPrefill, postRecommendation } from "../../api/recommend";
import { ApiError } from "../../api/client";

// S15b onboarding is scoped to ci_review — the product's proof path (the agent
// reviews PR diffs), where the catalog + baseline (Sonnet-class) are sound. Other
// task types (e.g. agentic_coding) are hidden until their catalog/baseline story is
// corrected backend-side. The recommender itself still supports them.
const TASK_TYPES = [{ value: "ci_review", label: "CI code review" }];
const BUDGETS: BudgetSensitivity[] = ["low", "medium", "high"];
const LATENCIES: (LatencyNeed | "any")[] = ["any", "low", "medium", "high"];

// Structured recommender form (+ an optional free-text prefill box that suggests
// fields the user confirms). Submits to POST /recommendations and hands the ranked
// result up via onResult. No LLM on this path.
export function RecommenderForm({
  onResult,
  onUnauthorized,
}: {
  onResult: (r: RecommendationResult) => void;
  onUnauthorized?: () => void;
}) {
  const [taskTypes, setTaskTypes] = useState<string[]>(["ci_review"]);
  const [budget, setBudget] = useState<BudgetSensitivity>("high");
  const [latency, setLatency] = useState<LatencyNeed | "any">("any");

  const [prefillText, setPrefillText] = useState("");
  const [prefilling, setPrefilling] = useState(false);
  const [matchedTerms, setMatchedTerms] = useState<string[] | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTask(value: string) {
    setTaskTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  }

  function handleApiError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) onUnauthorized?.();
    else if (e instanceof ApiError) setError(e.message);
    else setError("Could not reach the backend.");
  }

  async function handlePrefill() {
    if (!prefillText.trim() || prefilling) return;
    setPrefilling(true);
    setError(null);
    try {
      const res = await postPrefill(prefillText.trim());
      // Only budget + latency are applied — task type is fixed to ci_review for S15b,
      // so we don't let free text switch it to a hidden/unsupported task.
      if (res.budgetSensitivity) setBudget(res.budgetSensitivity);
      setLatency(res.latencyNeed ?? "any");
      setMatchedTerms(res.matchedTerms);
    } catch (e) {
      handleApiError(e);
    } finally {
      setPrefilling(false);
    }
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
          <div className="text-sm font-semibold">Find a cost-effective model</div>
          <div className="text-xs text-faint">
            Deterministic ranking over the benchmark catalog — no LLM in the pick.
          </div>
        </div>
      </div>

      {/* free-text prefill */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted">
          Describe your use case <span className="text-faint">(optional)</span>
        </label>
        <div className="flex gap-2">
          <input
            value={prefillText}
            onChange={(e) => setPrefillText(e.target.value)}
            placeholder="e.g. cheap code review agent for our CI"
            aria-label="Describe your use case"
            className="flex-1 rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-gray-100 placeholder:text-faint focus:border-accent/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={handlePrefill}
            disabled={!prefillText.trim() || prefilling}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-panel-2 px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-gray-100 disabled:opacity-40"
          >
            {prefilling ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
            Prefill
          </button>
        </div>
        {matchedTerms && (
          <p className="text-xs text-faint">
            {matchedTerms.length
              ? `Matched: ${matchedTerms.join(", ")} — confirm or edit below.`
              : "No keywords matched — fill the fields manually."}
          </p>
        )}
      </div>

      {/* task types */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-medium text-muted">Task types</legend>
        <div className="flex flex-wrap gap-2">
          {TASK_TYPES.map((o) => {
            const on = taskTypes.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggleTask(o.value)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  on
                    ? "border-accent/50 bg-accent/15 text-gray-100"
                    : "border-border bg-panel-2 text-muted hover:text-gray-200"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* budget + latency */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Segmented
          label="Budget sensitivity"
          options={BUDGETS.map((b) => ({ value: b, label: b }))}
          value={budget}
          onChange={(v) => setBudget(v as BudgetSensitivity)}
        />
        <Segmented
          label="Latency need"
          options={LATENCIES.map((l) => ({ value: l, label: l === "any" ? "Any" : l }))}
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
      <div className="flex items-center rounded-md border border-border bg-panel-2 p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded px-2 py-1 text-xs font-medium capitalize transition-colors ${
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
