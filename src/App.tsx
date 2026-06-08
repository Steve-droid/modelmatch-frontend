import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError, clearToken, getToken } from "./api/client";
import { listProjects } from "./api/projects";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { Onboarding } from "./pages/Onboarding";

type Phase = "loading" | "home" | "onboarding" | "dashboard";

// Top-level auth + navigation gate (no router yet). Token presence picks Login vs the
// app; once signed in, the user lands on the home hub (phase "home"), which routes into
// the dashboard or the create-agent flow. The hub's empty-state nudge needs the agent
// (project) count, so the sign-in probe records it. A 401 anywhere clears the token →
// Login. ("Agent" is the user-facing name for a project running the CI code-review
// agent — the data/types/API stay `project`.)
export function App() {
  const [authed, setAuthed] = useState(() => getToken() !== null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [agentCount, setAgentCount] = useState(0);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  const handleUnauthorized = useCallback(() => {
    clearToken();
    setAuthed(false);
  }, []);

  // Navigate between phases AND record it in browser history, so the browser Back/
  // Forward buttons move through the app (e.g. dashboard → home) instead of leaving the
  // site entirely. No router yet — this is the minimal history integration.
  const go = useCallback((next: Phase) => {
    setPhase(next);
    window.history.pushState({ mmPhase: next }, "");
  }, []);

  // Restore the phase when the user presses Back/Forward.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const p = (e.state as { mmPhase?: Phase } | null)?.mmPhase;
      if (p) setPhase(p);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // On sign-in, probe projects for the hub's empty-state nudge, then land on the home
  // hub (the default post-login landing).
  useEffect(() => {
    if (!authed) return;
    let live = true;
    setPhase("loading");
    listProjects()
      .then((list) => {
        if (!live) return;
        setAgentCount(list.length);
        // Landing entry — replace (not push) so Back from home leaves the app cleanly.
        window.history.replaceState({ mmPhase: "home" }, "");
        setPhase("home");
      })
      .catch((e: unknown) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 401) handleUnauthorized();
        else {
          // Couldn't reach the backend — still land on the hub (0 agents); the
          // dashboard/onboarding will surface the real error if the user enters them.
          setAgentCount(0);
          window.history.replaceState({ mmPhase: "home" }, "");
          setPhase("home");
        }
      });
    return () => {
      live = false;
    };
  }, [authed, handleUnauthorized]);

  if (!authed) return <Login onAuthed={() => setAuthed(true)} />;

  if (phase === "loading") {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-muted">
        <Loader2 size={16} className="mr-2 animate-spin" />
        Loading…
      </div>
    );
  }

  if (phase === "home") {
    return (
      <Home
        agentCount={agentCount}
        onViewAgents={() => go("dashboard")}
        onCreateAgent={() => go("onboarding")}
      />
    );
  }

  if (phase === "onboarding") {
    return (
      <Onboarding
        onUnauthorized={handleUnauthorized}
        onHome={() => go("home")}
        // Always allow returning to the dashboard — with defer-create a project may
        // already exist mid-wizard (e.g. a CI-setup failure after create), so the user
        // must never be trapped on the wizard. An empty dashboard just shows the
        // "no agents yet" state.
        onCancel={() => go("dashboard")}
        onDone={(projectId) => {
          setActiveProjectId(projectId);
          setAgentCount((n) => n + 1);
          go("dashboard");
        }}
      />
    );
  }

  return (
    <Dashboard
      initialProjectId={activeProjectId}
      onNewProject={() => go("onboarding")}
      onHome={() => go("home")}
      onUnauthorized={handleUnauthorized}
    />
  );
}
