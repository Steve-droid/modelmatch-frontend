import { useState } from "react";
import { ArrowRight, ListChecks } from "lucide-react";

// E20: per-project review preferences — the review task only. Bounded free text the
// review agent appends to its system prompt under a "Project review preferences"
// heading; it FETCHES it from ModelMatch at run time (GET /agent-config), so editing
// it here changes the next build without touching the Jenkinsfile. Optional: an
// empty box means "no preferences" (null). The bound mirrors the API contract.
export const REVIEW_PREFERENCES_MAX = 2000;

export const REVIEW_PREFERENCES_PLACEHOLDER =
  "e.g. Flag any use of eval() or exec() as high. Treat request handlers that skip " +
  "input validation as high. Do not report import ordering or docstring style.";

export function ReviewPreferencesForm({
  initialValue = "",
  onSubmit,
  submitLabel = "Continue",
}: {
  initialValue?: string;
  onSubmit: (preferences: string | null) => Promise<void>;
  submitLabel?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = value.trim();
  const over = trimmed.length > REVIEW_PREFERENCES_MAX;
  const canSubmit = !submitting && !over;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed === "" ? null : trimmed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save the preferences.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/20 text-accent">
          <ListChecks size={15} />
        </span>
        <div className="leading-tight">
          <div className="text-lg font-semibold">Review preferences</div>
          <div className="text-sm text-faint">
            Optional. What the reviewer should flag, or leave alone, on this project. The
            agent reads them from ModelMatch on every run, so you can change them later
            without touching the pipeline.
          </div>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-muted">Preferences for the reviewer</span>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={REVIEW_PREFERENCES_PLACEHOLDER}
          aria-label="Review preferences"
          aria-invalid={over}
          rows={5}
          className="rounded-md border border-border bg-panel-2 px-3 py-2.5 text-sm leading-relaxed text-gray-100 placeholder:text-faint focus:border-accent/50 focus:outline-none"
        />
        <span className={`num self-end text-xs ${over ? "text-risk" : "text-faint"}`}>
          {trimmed.length} / {REVIEW_PREFERENCES_MAX}
        </span>
      </label>

      {error && (
        <div className="rounded-md border border-risk/40 bg-risk/10 px-3 py-2 text-sm text-risk">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="flex items-center justify-center gap-2 self-start rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {trimmed === "" ? "Skip for now" : submitLabel}
        <ArrowRight size={15} />
      </button>
    </form>
  );
}
