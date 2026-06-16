import { useState } from "react";
import { KeyRound, Loader2, Plug } from "lucide-react";
import type { JenkinsConnectInput } from "../../types/ci";
import { ApiError } from "../../api/client";
import type { JenkinsRuntimeHint } from "./jenkinsRuntime";

// Mirror the backend's AnyHttpUrl gate (app/schemas/jenkins.py): a real http(s) URL
// with a host. http is allowed (not HTTPS-only); "aaa" fails (URL() throws) and so
// must not advance. Kept in the FE purely to block the step early with an inline hint
// — the backend stays the source of truth (it 422s anything that slips through).
export function isValidJenkinsUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname !== "";
  } catch {
    return false;
  }
}

// Jenkins SETUP — metadata only (base URL + job name). ModelMatch does not collect or
// store the provider key or a Jenkins API token; those live in Jenkins credentials.
// The submit is caller-owned (onSubmit) so this serves onboarding's defer-create
// (create-then-connect) and editing an existing connection alike. Continue is blocked
// until the URL is a valid http(s) URL + the job name is non-empty.
export function JenkinsConnectForm({
  onSubmit,
  onUnauthorized,
  initialBaseUrl = "",
  initialJobName = "",
  submitLabel = "Continue",
  runtimeHint = null,
}: {
  onSubmit: (input: JenkinsConnectInput) => Promise<void>;
  onUnauthorized?: () => void;
  initialBaseUrl?: string;
  initialJobName?: string;
  submitLabel?: string;
  runtimeHint?: JenkinsRuntimeHint | null;
}) {
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [jobName, setJobName] = useState(initialJobName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlValid = isValidJenkinsUrl(baseUrl);
  // Only nag about a bad URL once the user has typed something — no error on an
  // untouched empty field.
  const showUrlHint = baseUrl.trim() !== "" && !urlValid;
  const canSubmit = urlValid && jobName.trim() !== "" && !submitting;
  const copy = copyForRuntime(runtimeHint);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ baseUrl: baseUrl.trim(), jobName: jobName.trim() });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) onUnauthorized?.();
      else if (err instanceof ApiError) setError(err.message);
      else setError("Could not reach the backend.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-signal/15 text-signal">
          <Plug size={15} />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Point ModelMatch at your Jenkins</div>
          <div className="text-xs text-faint">
            {copy.intro}
          </div>
        </div>
      </div>

      <Field label="Jenkins base URL">
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://jenkins.example.com"
          aria-label="Jenkins base URL"
          aria-invalid={showUrlHint}
          className={inputCls}
        />
        {showUrlHint && (
          <span className="text-xs text-risk">
            Enter a valid URL, e.g. http://jenkins.example.com
          </span>
        )}
      </Field>
      <Field label="Job name">
        <input
          value={jobName}
          onChange={(e) => setJobName(e.target.value)}
          placeholder="acme-api/main"
          aria-label="Job name"
          className={inputCls}
        />
      </Field>

      {/* credentials the user creates in Jenkins — ModelMatch never receives them */}
      <div className="rounded-md border border-border bg-panel-2 px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <KeyRound size={13} className="text-signal" />
          {copy.heading}
        </div>
        <ul className="mt-2 flex flex-col gap-1.5">
          {copy.credentials.map((c) => (
            <li key={c.id} className="text-xs">
              <code className="num text-gray-100">{c.id}</code>
              <span className="text-faint"> — {c.desc}</span>
            </li>
          ))}
        </ul>
        {copy.note && (
          <div className="mt-2 rounded-md border border-border bg-panel px-2.5 py-2 text-xs text-faint">
            {copy.note}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-risk/40 bg-risk/10 px-3 py-2 text-sm text-risk">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="flex items-center justify-center gap-2 self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? <Loader2 size={15} className="animate-spin" /> : <Plug size={15} />}
        {submitLabel}
      </button>
    </form>
  );
}

const inputCls =
  "rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-gray-100 placeholder:text-faint focus:border-accent/50 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function copyForRuntime(runtimeHint: JenkinsRuntimeHint | null): {
  intro: string;
  heading: string;
  credentials: { id: string; desc: string }[];
  note: string | null;
} {
  const ciToken = {
    id: "modelmatch-ci-token",
    desc: "the CI ingest token shown on the next step",
  };

  if (!runtimeHint) {
    return {
      intro:
        "ModelMatch only needs the job's location — runtime auth stays in Jenkins or AWS, not in ModelMatch.",
      heading: 'In Jenkins, add these runtime requirements:',
      credentials: [
        {
          id: "modelmatch-model-api-key",
          desc: "only for models that use an API key; Bedrock/AWS IAM models do not need it",
        },
        ciToken,
      ],
      note:
        "API-key runtimes bind this credential into the CI container on the next step. Bedrock runtimes skip it and use the Jenkins node's AWS IAM identity instead.",
    };
  }

  if (runtimeHint.authMode === "aws_iam") {
    const model = runtimeHint.modelLabel ?? "this Bedrock model";
    return {
      intro:
        "ModelMatch only needs the job's location — Bedrock access stays on the Jenkins node's AWS IAM identity.",
      heading: 'In Jenkins, add this "Secret text" credential:',
      credentials: [ciToken],
      note: `${model} runs through ${runtimeHint.providerLabel}. Do not add modelmatch-model-api-key for this runtime; the Jenkins node or agent needs AWS IAM access for Bedrock instead.`,
    };
  }

  return {
    intro:
      "ModelMatch only needs the job's location — your provider key stays in Jenkins.",
    heading: 'In Jenkins, add these "Secret text" credentials:',
    credentials: [
      {
        id: "modelmatch-model-api-key",
        desc: `your ${runtimeHint.providerLabel} API key — the CI stage binds it as ${runtimeHint.credentialEnvVar}`,
      },
      ciToken,
    ],
    note: null,
  };
}
