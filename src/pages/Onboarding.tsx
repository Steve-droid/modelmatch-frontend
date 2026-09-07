import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import markUrl from "../assets/brand/modelmatch-mark.svg";
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
import { runtimeHintFromRecommendationOption } from "../components/onboarding/jenkinsRuntime";

type Step = "recommend" | "jenkins" | "cisetup";
const STEPS: { key: Step; label: string }[] = [
  { key: "recommend", label: "Recommend" },
  { key: "jenkins", label: "Connect Jenkins" },
  { key: "cisetup", label: "CI setup" },
];

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
  const [draft, setDraft] = useState<CreateProjectInput | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  // What the user typed at the Jenkins step, so stepping back and forward again
  // doesn't hand them empty fields.
  const [jenkins, setJenkins] = useState({ baseUrl: "", jobName: "" });

  const activeIndex = STEPS.findIndex((s) => s.key === step);

  // A step is reachable once the work it depends on exists: the pick unlocks the
  // Jenkins step, and creating + connecting the project unlocks CI setup. This is what
  // makes the stepper navigable in BOTH directions instead of a one-way road.
  const reachable: Record<Step, boolean> = {
    recommend: true,
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
      const project = await createProject(draft!);
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
    setStep("jenkins");
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-border bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onHome}
              disabled={!onHome}
              aria-label="Home"
              className="flex items-center gap-3 rounded-md transition-opacity hover:opacity-80 disabled:cursor-default disabled:hover:opacity-100"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-panel-2">
                <img src={markUrl} alt="ModelMatch" className="h-4 w-4" />
              </span>
              <span className="font-semibold tracking-tight">ModelMatch</span>
            </button>
            <span className="text-xs text-faint">New CI-Agent</span>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 rounded-md border border-border bg-panel px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-gray-100"
            >
              <ArrowLeft size={13} />
              Back to dashboard
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Stepper
          activeIndex={activeIndex}
          reachable={reachable}
          onStep={setStep}
        />

        {step === "recommend" &&
          (result === null ? (
            <RecommenderForm onResult={setResult} onUnauthorized={onUnauthorized} />
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
  activeIndex,
  reachable,
  onStep,
}: {
  activeIndex: number;
  reachable: Record<Step, boolean>;
  onStep: (step: Step) => void;
}) {
  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map((s, i) => {
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
              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium transition-colors ${
                active
                  ? "border-accent/50 bg-accent/15 text-gray-100"
                  : done
                    ? "border-banked/40 bg-banked/10 text-banked hover:border-banked"
                    : reachable[s.key]
                      ? "border-border bg-panel-2 text-muted hover:text-gray-100"
                      : "cursor-not-allowed border-border bg-panel-2 text-faint"
              }`}
            >
              <span className="num">{done ? <Check size={13} /> : i + 1}</span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <span className={`h-px w-4 ${done ? "bg-banked/40" : "bg-border"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
