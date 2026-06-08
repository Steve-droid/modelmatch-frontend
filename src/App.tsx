import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError, clearToken, getToken } from "./api/client";
import { listProjects } from "./api/projects";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Onboarding } from "./pages/Onboarding";

type Phase = "loading" | "onboarding" | "dashboard";

// Top-level auth + navigation gate (no router yet). Token presence picks Login vs the
// app; once signed in, the user's project count picks the landing view — no projects →
// onboarding, otherwise the dashboard. A 401 anywhere clears the token → Login.
export function App() {
  const [authed, setAuthed] = useState(() => getToken() !== null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  const handleUnauthorized = useCallback(() => {
    clearToken();
    setAuthed(false);
  }, []);

  // On sign-in, probe projects to choose the landing view.
  useEffect(() => {
    if (!authed) return;
    let live = true;
    setPhase("loading");
    listProjects()
      .then((list) => {
        if (!live) return;
        setPhase(list.length > 0 ? "dashboard" : "onboarding");
      })
      .catch((e: unknown) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 401) handleUnauthorized();
        else setPhase("dashboard"); // let the dashboard surface the backend error
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

  if (phase === "onboarding") {
    return (
      <Onboarding
        onUnauthorized={handleUnauthorized}
        // Always allow returning to the dashboard — with defer-create a project may
        // already exist mid-wizard (e.g. a CI-setup failure after create), so the user
        // must never be trapped on the wizard. An empty dashboard just shows the
        // "no projects yet" state.
        onCancel={() => setPhase("dashboard")}
        onDone={(projectId) => {
          setActiveProjectId(projectId);
          setPhase("dashboard");
        }}
      />
    );
  }

  return (
    <Dashboard
      initialProjectId={activeProjectId}
      onNewProject={() => setPhase("onboarding")}
      onUnauthorized={handleUnauthorized}
    />
  );
}
