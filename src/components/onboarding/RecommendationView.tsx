import { useState } from "react";
import { Check, Loader2, Layers, Trophy } from "lucide-react";
import type {
  RecommendationOption,
  RecommendationResult,
} from "../../types/recommend";
import type { CreateProjectInput } from "../../api/projects";
import { ApiError } from "../../api/client";

function perMtok(value: string | null): string {
  if (value === null) return "unpriced";
  const n = Number(value);
  if (Number.isNaN(n)) return "unpriced";
  return `$${n.toFixed(2)}/Mtok`;
}


// Shows the ranked result: comparability group, the selectable shortlist (suggested
// pre-selected), the baseline, and a name → submit step. The submit is caller-owned
// (onSubmit) so this view serves both onboarding (defer-create: stash the pick, no API
// yet) and edit/re-pick (PATCH the existing project). The pick payload = chosen option
// + baseline model id + name; the persistence/advance is the parent's job.
export function RecommendationView({
  result,
  onSubmit,
  onUnauthorized,
  submitLabel = "Create project",
  initialName = "",
  initialSelectedOptionId,
}: {
  result: RecommendationResult;
  onSubmit: (pick: CreateProjectInput) => Promise<void>;
  onUnauthorized?: () => void;
  submitLabel?: string;
  initialName?: string;
  /** Preselect a previously chosen option (stepping back into this screen). */
  initialSelectedOptionId?: number;
}) {
  const { baseline, comparabilityGroup, shortlist, suggested } = result;

  // Every ranked option is runnable: the backend restricts the pick to models with an
  // enabled agent_runtime_config (RECOMMEND_ONLY_RUNNABLE) and reports the narrowing
  // as rankedCount vs candidateCount. This view used to re-filter by a hardcoded
  // vendor allowlist, which was a SECOND source of truth for "runnable" and went
  // stale the moment a new provider was enabled — it hid DeepSeek V4 Flash, the
  // top-ranked security pick, and silently promoted the runner-up in its place.
  // Whether a model can run is a property of the catalog, not of its vendor's name.
  const selectable = shortlist;
  const defaultId = suggested.recommendationOptionId;

  // A pick the caller is restoring wins over the suggestion, but only if it is still
  // one of the selectable options.
  const restored =
    initialSelectedOptionId != null &&
    selectable.some((o) => o.recommendationOptionId === initialSelectedOptionId)
      ? initialSelectedOptionId
      : undefined;
  const [selectedId, setSelectedId] = useState<number | undefined>(
    restored ?? defaultId,
  );
  const [name, setName] = useState(initialName);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = name.trim() !== "" && selectedId != null && !creating;
  // The shortlist may contain the baseline itself (it is a scored, runnable row).
  // Picking it means there is nothing to measure savings against, so the "costed
  // against" line is dropped rather than promising a comparison that cannot exist.
  const pickIsBaseline =
    selectable.find((o) => o.recommendationOptionId === selectedId)?.modelId ===
    baseline.modelId;

  async function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        selectedOptionId: selectedId,
        baselineModelId: baseline.modelId,
      });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 401) onUnauthorized?.();
      else if (e instanceof ApiError) setError(e.message);
      else setError("Could not reach the backend.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="card flex flex-col gap-5 p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-banked/15 text-banked">
          <Trophy size={15} />
        </span>
        <div className="leading-tight">
          <div className="text-lg font-semibold">Recommended model</div>
          {comparabilityGroup && (
            <div className="flex items-center gap-1 text-sm text-faint">
              <Layers size={12} />
              Every model here is scored on the same benchmark,{" "}
              {comparabilityGroup.benchmark}
            </div>
          )}
        </div>
      </div>

      {/* shortlist (runnable-only; selectable; suggested badged) */}
      {selectable.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {selectable.map((opt) => (
            <OptionRow
              key={opt.recommendationOptionId}
              option={opt}
              selected={opt.recommendationOptionId === selectedId}
              suggested={opt.recommendationOptionId === suggested.recommendationOptionId}
              onSelect={() => setSelectedId(opt.recommendationOptionId)}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-unrated/40 bg-unrated/10 px-3 py-2 text-sm text-unrated">
          No model matched. Try different inputs.
        </div>
      )}

      {/* baseline — hidden when the pick IS the baseline (nothing to compare against) */}
      {!pickIsBaseline && (
        <div className="rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm">
          <span className="font-medium text-muted">Baseline (costed, not run): </span>
          <span className="text-gray-200">{baseline.model}</span>
          <span className="text-faint"> · {baseline.vendor} · </span>
          <span className="num text-signal">{perMtok(baseline.costPerMtok)}</span>
          <span className="text-faint">
            , the expensive default your savings are measured against.
          </span>
        </div>
      )}

      {/* name + create */}
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <label className="text-sm font-medium text-muted">Project name</label>
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. acme-api"
            aria-label="Project name"
            className="min-w-0 flex-1 field-input"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate}
            className="primary-action shrink-0"
          >
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {submitLabel}
          </button>
        </div>
        {error && (
          <div className="rounded-xl border border-risk/40 bg-risk/10 px-3 py-2 text-sm text-risk">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function OptionRow({
  option,
  selected,
  suggested,
  onSelect,
}: {
  option: RecommendationOption;
  selected: boolean;
  suggested: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
          selected
            ? "border-accent/50 bg-accent/10"
            : "border-border bg-panel-2 hover:border-border"
        }`}
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
            selected ? "border-accent bg-accent text-white" : "border-faint"
          }`}
        >
          {selected && <Check size={11} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-base font-medium text-gray-100">
              {option.model}
            </span>
            {suggested && (
              <span className="rounded bg-banked/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-banked">
                Suggested
              </span>
            )}
          </span>
          <span className="text-sm text-faint">{option.vendor}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="num block text-base text-signal">
            {perMtok(option.costPerMtok)}
          </span>
          <span className="num block text-xs text-faint">
            rank {Number(option.rankScore).toFixed(3)}
          </span>
        </span>
      </button>
    </li>
  );
}
