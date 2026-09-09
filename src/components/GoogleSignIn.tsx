import { useEffect, useRef, useState } from "react";
import { ApiError, setToken } from "../api/client";
import { googleChallenge, googleConfig, googleLogin, loadGoogleIdentity } from "../api/google";

/** Google's own accessible button; credentials/challenges live only in this mount. */
export function GoogleSignIn({ onAuthed }: { onAuthed: () => void }) {
  const button = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let submitting = false;
    let refresh: ReturnType<typeof setTimeout> | undefined;
    const host = button.current;
    async function prepare() {
      try {
        const { enabled } = await googleConfig();
        if (cancelled || !enabled) return;
        setVisible(true);
        const identity = await loadGoogleIdentity();
        if (cancelled) return;
        const state = await googleChallenge();
        if (cancelled || !host) return;
        identity.initialize({
          client_id: state.clientId,
          nonce: state.nonce,
          auto_select: false,
          callback: async ({ credential }) => {
            if (cancelled || submitting) return;
            submitting = true;
            clearTimeout(refresh);
            setBusy(true);
            setError(null);
            try {
              const { accessToken } = await googleLogin(credential, state.challenge);
              if (!cancelled) {
                setToken(accessToken);
                onAuthed();
              }
            } catch (err) {
              if (!cancelled) {
                host.replaceChildren();
                setError(err instanceof ApiError ? err.message : "Could not complete Google sign-in. Please try again.");
              }
            } finally {
              if (!cancelled) setBusy(false);
            }
          },
        });
        host.replaceChildren();
        identity.renderButton(host, { type: "standard", theme: "outline", size: "large", text: "continue_with" });
        // Refresh before the five-minute backend deadline when the form sits idle.
        refresh = setTimeout(() => setAttempt((n) => n + 1), 240000);
      } catch {
        if (!cancelled) {
          setVisible(true);
          setError("Google sign-in is unavailable. You can still use email and password.");
        }
      }
    }
    void prepare();
    return () => {
      cancelled = true;
      clearTimeout(refresh);
      host?.replaceChildren();
    };
  }, [onAuthed, attempt]);

  return (
    <div className={visible ? "mb-6" : "hidden"}>
      <div ref={button} className={busy ? "pointer-events-none flex justify-center opacity-50" : "flex justify-center"} />
      {busy && <p role="status" className="mt-3 text-center text-sm text-muted">Signing in with Google…</p>}
      {error && (
        <div className="mt-3 text-center text-sm text-muted">
          <p role="alert">{error}</p>
          <button type="button" className="mt-2 text-accent" onClick={() => {
            setError(null);
            setAttempt((n) => n + 1);
          }}>Retry Google sign-in</button>
        </div>
      )}
      <div className="mt-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />or use email<span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
