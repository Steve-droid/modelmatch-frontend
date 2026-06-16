import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { login, register } from "../api/auth";
import { ApiError, setToken } from "../api/client";
import markUrl from "../assets/brand/modelmatch-mark.svg";
import { VALUE_PROP } from "../lib/valueProp";

// Sign-up screen. Creates the account, then logs in to obtain a JWT (register itself
// returns the new user, not a token) and hands off to the app — same auto-land as Login.
// Mirrors the Login card in the Command-Center language; onSignIn returns to the Login
// page for an existing account.
export function Register({
  onAuthed,
  onSignIn,
}: {
  onAuthed: () => void;
  onSignIn: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  // The account was created but the chained auto-login failed — a recoverable state the
  // user can resolve by signing in (distinct from a register failure, where there's no
  // account yet). Renders a reassuring notice + a "Go to sign in" affordance.
  const [registeredNeedsLogin, setRegisteredNeedsLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordsMatch = confirm === "" || password === confirm;
  const canSubmit =
    email.trim() !== "" && password !== "" && password === confirm && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setRegisteredNeedsLogin(false);
    let registered = false;
    try {
      await register(email.trim(), password);
      registered = true;
      // Register returns { id, email } — no token. Log in to obtain the JWT, then
      // persist it and land exactly like the Login flow (auto sign-in after sign-up).
      const { accessToken } = await login(email.trim(), password);
      setToken(accessToken);
      onAuthed();
    } catch (err: unknown) {
      // The account WAS created but the auto-login step failed — don't make it look like
      // sign-up failed; reassure the user and point them at sign-in.
      if (registered) {
        setRegisteredNeedsLogin(true);
      } else if (err instanceof ApiError && err.status === 409)
        setError("That email is already registered. Try signing in instead.");
      else if (err instanceof ApiError && err.status === 422)
        setError("Please enter a valid email and password.");
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
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-panel-2">
            <img src={markUrl} alt="ModelMatch" className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">ModelMatch</div>
            <div className="text-xs text-faint">{VALUE_PROP.headline}</div>
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-gray-100 placeholder:text-faint focus:border-accent/50 focus:outline-none"
              placeholder="••••••••"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-gray-100 placeholder:text-faint focus:border-accent/50 focus:outline-none"
              placeholder="••••••••"
            />
          </label>

          {!passwordsMatch && (
            <div className="text-xs text-unrated">Passwords don't match.</div>
          )}

          {error && (
            <div className="rounded-md border border-risk/40 bg-risk/10 px-3 py-2 text-sm text-risk">
              {error}
            </div>
          )}

          {registeredNeedsLogin && (
            <div className="rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-muted">
              Your account was created, but we couldn't sign you in automatically.{" "}
              <button
                type="button"
                onClick={onSignIn}
                className="font-medium text-accent transition-opacity hover:opacity-90"
              >
                Go to sign in
              </button>
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
              <UserPlus size={15} />
            )}
            Create account
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-muted">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSignIn}
            className="font-medium text-accent transition-opacity hover:opacity-90"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
