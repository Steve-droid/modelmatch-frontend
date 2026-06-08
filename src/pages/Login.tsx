import { useState } from "react";
import { Coins, Loader2, LogIn } from "lucide-react";
import { login } from "../api/auth";
import { ApiError, setToken } from "../api/client";

// Sign-in screen. Exchanges email + password for a JWT, persists it, then hands off
// to the dashboard. Compact dark card in the Command-Center language — not a landing
// page. Replaces the out-of-band setToken bootstrap used through S14.
export function Login({ onAuthed }: { onAuthed: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim() !== "" && password !== "" && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const { accessToken } = await login(email.trim(), password);
      setToken(accessToken);
      onAuthed();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401)
        setError("Invalid email or password.");
      else if (err instanceof ApiError) setError(err.message);
      else setError("Could not reach the backend.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4">
      <div className="card w-full max-w-sm">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/20 text-accent">
            <Coins size={17} />
          </span>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">ModelMatch</div>
            <div className="text-xs text-faint">Sign in to your savings dashboard</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-gray-100 placeholder:text-faint focus:border-accent/50 focus:outline-none"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-gray-100 placeholder:text-faint focus:border-accent/50 focus:outline-none"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="rounded-md border border-risk/40 bg-risk/10 px-3 py-2 text-sm text-risk">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-1 flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <LogIn size={15} />
            )}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
