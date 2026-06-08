import { useState } from "react";
import { KeyRound, Loader2, Plug } from "lucide-react";
import type { JenkinsConnection } from "../../types/ci";
import { connectJenkins } from "../../api/jenkins";
import { ApiError } from "../../api/client";

// The two Jenkins "Secret text" credentials the USER creates in Jenkins — the agent
// reads them at runtime. ModelMatch never sees the provider key; it only mints the
// CI token (shown on the next step). Keep these ids in sync with the agent snippet.
const CRED_IDS = [
  {
    id: "modelmatch-model-api-key",
    desc: "your provider API key (BYOK) — the agent reads it; ModelMatch never sees it",
  },
  {
    id: "modelmatch-ci-token",
    desc: "the CI ingest token shown on the next step",
  },
];

// Jenkins SETUP — metadata only (base URL + job name). ModelMatch does not collect or
// store the provider key or a Jenkins API token; those live in Jenkins credentials.
export function JenkinsConnectForm({
  projectId,
  onConnected,
  onUnauthorized,
}: {
  projectId: number;
  onConnected: (conn: JenkinsConnection) => void;
  onUnauthorized?: () => void;
}) {
  const [baseUrl, setBaseUrl] = useState("");
  const [jobName, setJobName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = baseUrl.trim() !== "" && jobName.trim() !== "" && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const conn = await connectJenkins(projectId, {
        baseUrl: baseUrl.trim(),
        jobName: jobName.trim(),
      });
      onConnected(conn);
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
            ModelMatch only needs the job's location — your provider key stays in Jenkins.
          </div>
        </div>
      </div>

      <Field label="Jenkins base URL">
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://jenkins.example.com"
          aria-label="Jenkins base URL"
          className={inputCls}
        />
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
          In Jenkins, add these "Secret text" credentials:
        </div>
        <ul className="mt-2 flex flex-col gap-1.5">
          {CRED_IDS.map((c) => (
            <li key={c.id} className="text-xs">
              <code className="num text-gray-100">{c.id}</code>
              <span className="text-faint"> — {c.desc}</span>
            </li>
          ))}
        </ul>
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
        Continue
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
