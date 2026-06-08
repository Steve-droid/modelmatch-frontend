import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, ShieldAlert, Terminal } from "lucide-react";
import type { CiSetup } from "../../types/ci";
import { getCiSetup } from "../../api/ci";
import { ApiError } from "../../api/client";

// Fetches and shows the Jenkins stage snippet + the per-project ingest token. The
// token is mint-once: shown clearly "copy now" when present, explained as already
// minted when null. "Go to dashboard" advances to the new project's dashboard.
export function CiSetupView({
  projectId,
  onDone,
  onUnauthorized,
}: {
  projectId: number;
  onDone: () => void;
  onUnauthorized?: () => void;
}) {
  const [setup, setSetup] = useState<CiSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GET /ci-setup is MINT-ONCE (the plaintext token is returned only on the first
  // call), so it must fire exactly once per project — not twice. A projectId-keyed
  // ref guards against React StrictMode's double-invoke (and any incidental remount)
  // burning the token before we can show it.
  const fetchedFor = useRef<number | null>(null);
  useEffect(() => {
    if (fetchedFor.current === projectId) return;
    fetchedFor.current = projectId;
    setLoading(true);
    setError(null);
    getCiSetup(projectId)
      .then(setSetup)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) onUnauthorized?.();
        else if (e instanceof ApiError) setError(e.message);
        else setError("Could not reach the backend.");
      })
      .finally(() => setLoading(false));
  }, [projectId, onUnauthorized]);

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-signal/15 text-signal">
          <Terminal size={15} />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Add this stage to your pipeline</div>
          <div className="text-xs text-faint">
            Runs the CI code-review agent and ingests each run's savings.
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={14} className="animate-spin" />
          Loading setup…
        </div>
      )}
      {error && !loading && (
        <div className="rounded-md border border-risk/40 bg-risk/10 px-3 py-2 text-sm text-risk">
          {error}
        </div>
      )}

      {setup && !loading && (
        <>
          {/* the mint-once token */}
          {setup.token ? (
            <div className="rounded-md border border-unrated/40 bg-unrated/10 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-unrated">
                <ShieldAlert size={13} />
                CI token — shown once. Copy it now; it can't be retrieved again.
              </div>
              <code className="num mt-1 block break-all text-sm text-gray-100">
                {setup.token}
              </code>
            </div>
          ) : (
            <div className="rounded-md border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
              CI token was already minted for this project and can't be shown again —
              rotate it from the project settings to issue a new one.
            </div>
          )}

          {/* the snippet */}
          <div>
            <div className="mb-1 text-xs font-medium text-muted">Jenkins stage</div>
            <pre className="max-h-72 overflow-auto rounded-md border border-border bg-panel-2 p-3 text-xs leading-relaxed text-gray-200">
              <code>{setup.snippet}</code>
            </pre>
          </div>

          <dl className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
            <div className="flex gap-1.5">
              <dt className="text-faint">Image:</dt>
              <dd className="num truncate text-signal">{setup.imageRef}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-faint">Ingest URL:</dt>
              <dd className="num truncate text-gray-300">{setup.ciRunsUrl}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={onDone}
            className="flex items-center justify-center gap-2 self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Go to dashboard
            <ArrowRight size={15} />
          </button>
        </>
      )}
    </div>
  );
}
