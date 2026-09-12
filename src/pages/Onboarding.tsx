import { BRAND_NAME } from "../lib/brand";
import { useState } from "react";
import { ArrowLeft, Check, House } from "lucide-react";
import markUrl from "../assets/brand/driftplain-mark.svg";
import type { RecommendationResult } from "../types/recommend";
import {
  createProject,
  updateProject,
  type CreateProjectInput,
} from "../api/projects";
import { connectJenkins } from "../api/jenkins";
import { RecommenderForm } from "../components/onboarding/RecommenderForm";
import { RecommendationView } from "../components/onboarding/RecommendationView";
import { JenkinsConnectForm } from "../components/onboarding/JenkinsConnectForm";
import { CiSetupView } from "../components/onboarding/CiSetupView";
import { ReviewPreferencesForm } from "../components/onboarding/ReviewPreferencesForm";
import { runtimeHintFromRecommendationOption } from "../components/onboarding/jenkinsRuntime";

type Step = "recommend" | "preferences" | "jenkins" | "cisetup";
// Labels name what the USER does at each step, not what the system does — "Recommend"
// read as an instruction to the user, who is the one being recommended TO. The `key`
// stays "recommend" because it is internal routing, not copy.
//
// E20: the review task has one extra step (review preferences) after the pick; a
// security project goes straight from the pick to Jenkins — preferences only shape
// the review prompt, and the API returns null for a security project anyway.
const ALL_STEPS: { key: Step; label: string }[] = [
  { key: "recommend", label: "Pick model" },
  { key: "preferences", label: "Review preferences" },
  { key: "jenkins", label: "Connect Jenkins" },
  { key: "cisetup", label: "CI setup" },
];
const REVIEW_TASK = "ci_review";

function stepsFor(taskType: string): { key: Step; label: string }[] {
  return taskType === REVIEW_TASK
    ? ALL_STEPS
    : ALL_STEPS.filter((s) => s.key !== "preferences");
}

// The new-project onboarding flow: recommend → pick → connect Jenkins → CI snippet →
// dashboard. DEFER-CREATE: the project is NOT created at the pick step — the pick is
// held as a draft and the project is created at the Jenkins step's Continue (once the
// URL/job are valid), so abandoning the wizard early never leaves an orphaned empty
// project. If the connect (or later CI-setup) fails *after* create, the project is
// kept (projectId is set) and a retry just re-connects — no auto-delete. Reachable on
// first login (no projects) or via "New project" (onCancel returns to the dashboard).
export function Onboarding({
  onDone,
  onCancel,
  onHome,
  onUnauthorized,
}: {
  onDone: (projectId: number) => void;
  onCancel?: () => void;
  onHome?: () => void;
  onUnauthorized?: () => void;
}) {
  const [step, setStep] = useState<Step>("recommend");
  const [result, setResult] = useState<RecommendationResult | null>(null);
  // The task the recommendation was ranked on — the project is created WITH it (the
  // backend rejects a pick/task mismatch), and it decides whether the preferences
  // step exists. Defaults to review, the recommender form's default task.
  const [taskType, setTaskType] = useState<string>(REVIEW_TASK);
  const [draft, setDraft] = useState<CreateProjectInput | null>(null);
  const [reviewPreferences, setReviewPreferences] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  // What the user typed at the Jenkins step, so stepping back and forward again
  // doesn't hand them empty fields.
  const [jenkins, setJenkins] = useState({ baseUrl: "", jobName: "" });

  const steps = stepsFor(taskType);
  const activeIndex = steps.findIndex((s) => s.key === step);

  // A step is reachable once the work it depends on exists: the pick unlocks the
  // preferences (review) / Jenkins step, and creating + connecting the project
  // unlocks CI setup. This is what makes the stepper navigable in BOTH directions
  // instead of a one-way road.
  const reachable: Record<Step, boolean> = {
    recommend: true,
    preferences: draft != null,
    jenkins: draft != null,
    cisetup: projectId != null,
  };
  const selectedOption =
    result?.shortlist.find((opt) => opt.recommendationOptionId === draft?.selectedOptionId) ??
    null;
  const runtimeHint = runtimeHintFromRecommendationOption(selectedOption);

  // Jenkins-step Continue: create the project now (once, if not already created) then
  // connect it. Errors propagate to JenkinsConnectForm's inline error/401 handling; a
  // partial success (created, connect failed) leaves projectId set so retry re-connects
  // the same project instead of creating a second one.
  async function handleConnect(input: { baseUrl: string; jobName: string }) {
    let pid = projectId;
    if (pid == null) {
      const project = await createProject({
        ...draft!,
        taskType,
        reviewPreferences: taskType === REVIEW_TASK ? reviewPreferences : null,
      });
      pid = project.id;
      setProjectId(pid);
    }
    await connectJenkins(pid, input);
    setJenkins(input);
    setStep("cisetup");
  }

  // The pick step's submit. Before the project exists this just stashes the draft
  // (defer-create). If the user stepped BACK here after the project was created, the
  // same action has to persist the new pick instead, a PATCH like the dashboard's
  // re-pick, or the change would silently not stick.
  async function handlePick(pick: CreateProjectInput) {
    setDraft(pick);
    if (projectId != null) {
      await updateProject(projectId, {
        name: pick.name,
        selectedOptionId: pick.selectedOptionId,
        baselineModelId: pick.baselineModelId,
      });
    }
    setStep(taskType === REVIEW_TASK ? "preferences" : "jenkins");
  }

  // The preferences step's submit (review task only). Before the project exists this
  // just stashes the text (defer-create, same as the pick); once it exists, a PATCH
  // persists the change so the agent's next run sees it.
  async function handlePreferences(prefs: string | null) {
    setReviewPreferences(prefs);
    if (projectId != null) {
      await updateProject(projectId, { reviewPreferences: prefs });
    }
    setStep("jenkins");
  }

  // A fresh recommendation (possibly on the other task) resets the task-bound state.
  function handleResult(r: RecommendationResult, task: string) {
    setResult(r);
    setTaskType(task);
    if (task !== REVIEW_TASK) setReviewPreferences(null);
  }

  return (
    <div className="workspace-page min-h-full">
      <header className="workspace-header sticky top-0 z-10 border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onHome}
              disabled={!onHome}
              aria-label="Home"
              className="flex items-center gap-3 rounded-md transition-opacity hover:opacity-80 disabled:cursor-default disabled:hover:opacity-100"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-panel">
                <img src={markUrl} alt={BRAND_NAME} className="h-4 w-4" />
              </span>
              <span className="font-semibold tracking-tight">{BRAND_NAME}</span>
            </button>
            <span className="hidden text-xs text-muted sm:inline">Agent setup</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onHome && (
              <button type="button" onClick={onHome} className="compact-action">
                <House size={13} />
                Back to home
              </button>
            )}
            {onCancel && (
              <button type="button" onClick={onCancel} className="compact-action">
                <ArrowLeft size={13} />
                Back to dashboard
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
        <Stepper
          steps={steps}
          activeIndex={activeIndex}
          reachable={reachable}
          onStep={setStep}
        />

        {step === "recommend" &&
          (result === null ? (
            <RecommenderForm onResult={handleResult} onUnauthorized={onUnauthorized} />
          ) : (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setResult(null)}
                className="flex items-center gap-1.5 self-start text-sm font-medium text-muted transition-colors hover:text-gray-100"
              >
                <ArrowLeft size={13} />
                Refine inputs
              </button>
              <RecommendationView
                result={result}
                onUnauthorized={onUnauthorized}
                submitLabel="Continue"
                initialName={draft?.name ?? ""}
                initialSelectedOptionId={draft?.selectedOptionId}
                onSubmit={handlePick}
              />
            </div>
          ))}

        {step === "preferences" && draft != null && (
          <ReviewPreferencesForm
            key={projectId ?? "draft"}
            initialValue={reviewPreferences ?? ""}
            onSubmit={handlePreferences}
          />
        )}

        {step === "jenkins" && draft != null && (
          <JenkinsConnectForm
            onUnauthorized={onUnauthorized}
            onSubmit={handleConnect}
            runtimeHint={runtimeHint}
            initialBaseUrl={jenkins.baseUrl}
            initialJobName={jenkins.jobName}
          />
        )}

        {step === "cisetup" && projectId != null && (
          <CiSetupView
            projectId={projectId}
            onUnauthorized={onUnauthorized}
            onDone={() => onDone(projectId)}
          />
        )}
      </main>
    </div>
  );
}

// The wizard's navigation, not just its progress read-out: any step the user has
// already unlocked can be clicked, in either direction. Steps that aren't reachable
// yet stay disabled so nobody lands on a screen with nothing behind it.
function Stepper({
  steps,
  activeIndex,
  reachable,
  onStep,
}: {
  steps: { key: Step; label: string }[];
  activeIndex: number;
  reachable: Record<Step, boolean>;
  onStep: (step: Step) => void;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {steps.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        const canGo = reachable[s.key] && !active;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => canGo && onStep(s.key)}
              disabled={!canGo}
              aria-current={active ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${s.label}`}
              title={
                canGo
                  ? `Go to ${s.label}`
                  : active
                    ? undefined
                    : `${s.label} unlocks once you finish the previous step`
              }
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors sm:text-sm ${
                active
                  ? "border-accent/50 bg-accent/15 text-gray-100"
                  : done
                    ? "border-transparent bg-transparent text-banked hover:border-banked/30"
                    : reachable[s.key]
                      ? "border-transparent bg-transparent text-muted hover:bg-panel hover:text-gray-100"
                      : "cursor-not-allowed border-transparent bg-transparent text-muted"
              }`}
            >
              <span className={`num flex h-6 w-6 items-center justify-center rounded-full ${active ? "bg-accent text-white" : "border border-border"}`}>{done ? <Check size={13} /> : i + 1}</span>
              {s.label}
            </button>
            {i < steps.length - 1 && (
              <span className={`h-px w-4 ${done ? "bg-banked/40" : "bg-border"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
