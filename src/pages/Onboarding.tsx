import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import markUrl from "../assets/brand/modelmatch-mark.svg";
import type { RecommendationResult } from "../types/recommend";
import { createProject, type CreateProjectInput } from "../api/projects";
import { connectJenkins } from "../api/jenkins";
import { RecommenderForm } from "../components/onboarding/RecommenderForm";
import { RecommendationView } from "../components/onboarding/RecommendationView";
import { JenkinsConnectForm } from "../components/onboarding/JenkinsConnectForm";
import { CiSetupView } from "../components/onboarding/CiSetupView";

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
  onUnauthorized,
}: {
  onDone: (projectId: number) => void;
  onCancel?: () => void;
  onUnauthorized?: () => void;
}) {
  const [step, setStep] = useState<Step>("recommend");
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [draft, setDraft] = useState<CreateProjectInput | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);

  const activeIndex = STEPS.findIndex((s) => s.key === step);

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
    setStep("cisetup");
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-border bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-panel-2">
              <img src={markUrl} alt="ModelMatch" className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-tight">ModelMatch</span>
            <span className="text-xs text-faint">New project</span>
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

      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
        <Stepper activeIndex={activeIndex} />

        {step === "recommend" &&
          (result === null ? (
            <RecommenderForm onResult={setResult} onUnauthorized={onUnauthorized} />
          ) : (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setResult(null)}
                className="flex items-center gap-1.5 self-start text-xs font-medium text-muted transition-colors hover:text-gray-100"
              >
                <ArrowLeft size={13} />
                Refine inputs
              </button>
              <RecommendationView
                result={result}
                onUnauthorized={onUnauthorized}
                submitLabel="Continue"
                onSubmit={async (pick) => {
                  setDraft(pick); // defer-create: hold the pick, create at Jenkins step
                  setStep("jenkins");
                }}
              />
            </div>
          ))}

        {step === "jenkins" && draft != null && (
          <JenkinsConnectForm
            onUnauthorized={onUnauthorized}
            onSubmit={handleConnect}
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

function Stepper({ activeIndex }: { activeIndex: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium ${
                active
                  ? "border-accent/50 bg-accent/15 text-gray-100"
                  : done
                    ? "border-banked/40 bg-banked/10 text-banked"
                    : "border-border bg-panel-2 text-faint"
              }`}
            >
              <span className="num">{done ? <Check size={12} /> : i + 1}</span>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className={`h-px w-4 ${done ? "bg-banked/40" : "bg-border"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
