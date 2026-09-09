import { BRAND_NAME } from "../lib/brand";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, House, Plus } from "lucide-react";
import type { SavingsRange, SavingsResponse } from "../types/savings";
import type { Project } from "../types/project";
import { getSavings } from "../api/savings";
import { listProjects } from "../api/projects";
import { ApiError } from "../api/client";
import { getMe } from "../api/auth";
import { ProjectActions } from "../components/ProjectActions";
import {
  formatPct,
  formatPctFromRate,
  formatUSD,
  toNumber,
} from "../lib/format";
import { KpiCard, SavingsHero } from "../components/KpiCard";
import { taskLabelOf } from "../lib/task";
import { SavingsAreaChart } from "../components/SavingsAreaChart";
import { CostPerRunBar } from "../components/CostPerRunBar";
import { QualityTrend } from "../components/QualityTrend";
import { RunsTable } from "../components/RunsTable";
import { ProjectSwitcher } from "../components/ProjectSwitcher";
import { ChatPanel } from "../components/ChatPanel";
import markUrl from "../assets/brand/modelmatch-mark.svg";

const RANGES: SavingsRange[] = ["all", "30d", "7d"];

// Initial project from ?project= (a deep-link); once projects load, the switcher owns
// selection. Falls back to the first project if the param is absent/invalid.
function initialProjectParam(): number | null {
  const q = new URLSearchParams(window.location.search).get("project");
  const n = q ? Number(q) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function Dashboard({
  initialProjectId,
  onNewProject,
  onHome,
  onUnauthorized,
}: {
  initialProjectId?: number | null;
  onNewProject?: () => void;
  onHome?: () => void;
  onUnauthorized?: () => void;
}) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);

  const [range, setRange] = useState<SavingsRange>("all");
  const [data, setData] = useState<SavingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Bumped after an edit/re-pick to force a savings refetch (the selected model/
  // baseline may have changed).
  const [refreshNonce, setRefreshNonce] = useState(0);

  const handleUnauthorized = useCallback(() => onUnauthorized?.(), [onUnauthorized]);
  const [chatEnabled, setChatEnabled] = useState(false);
  const handleChatForbidden = useCallback(() => setChatEnabled(false), []);

  useEffect(() => {
    let active = true;
    let generation = 0;
    const refreshCapabilities = async () => {
      const request = ++generation;
      try {
        const user = await getMe();
        if (active && request === generation) setChatEnabled(user.chatEnabled === true);
      } catch (e) {
        if (active && request === generation && e instanceof ApiError && e.status === 401) handleUnauthorized();
      }
    };
    const onFocus = () => { setChatEnabled(false); void refreshCapabilities(); };
    // Initial state is denied; focus refreshes also hide chat until confirmed.
    void refreshCapabilities();
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.removeEventListener("focus", onFocus); };
  }, [handleUnauthorized]);

  // Load the user's projects + (re)select the active one. Keeps the current selection
  // if it still exists (after an edit); otherwise prefers a just-created project, then a
  // ?project= deep-link, then the first project (and null when none remain — e.g. after
  // deleting the last one). Reused for refresh-after-change, not just first load.
  const loadProjects = useCallback(async () => {
    try {
      const list = await listProjects();
      setProjects(list);
      setProjectsError(null);
      setProjectId((current) => {
        if (current != null && list.some((p) => p.id === current)) return current;
        const preferred =
          initialProjectId != null
            ? list.find((p) => p.id === initialProjectId)?.id
            : undefined;
        const wanted = initialProjectParam();
        const deepLinked =
          wanted != null ? list.find((p) => p.id === wanted)?.id : undefined;
        return preferred ?? deepLinked ?? list[0]?.id ?? null;
      });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 401) handleUnauthorized();
      else if (e instanceof ApiError) setProjectsError(e.message);
      else setProjectsError("Could not reach the backend.");
    }
  }, [handleUnauthorized, initialProjectId]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // Clear the previous project's numbers the instant the selection changes, so they
  // never linger under the newly-selected project while its data loads. (Range
  // changes deliberately keep the current data visible during the refetch.)
  useEffect(() => {
    setData(null);
  }, [projectId]);

  // Reflect the active project in the URL (?project=) so a reload restores it via
  // initialProjectParam(). replaceState reuses the existing history.state so App's
  // `mmPhase` (the dashboard phase) survives the reload too — the two cooperate.
  useEffect(() => {
    if (projectId == null) return;
    const url = new URL(window.location.href);
    url.searchParams.set("project", String(projectId));
    window.history.replaceState(window.history.state, "", url);
  }, [projectId]);

  // Load savings for the active project + range.
  useEffect(() => {
    if (projectId == null) return;
    let live = true;
    setLoading(true);
    setError(null);
    getSavings(projectId, range)
      .then((res) => live && setData(res))
      .catch((e: unknown) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 401) handleUnauthorized();
        else if (e instanceof ApiError) setError(e.message);
        else setError("Could not reach the backend.");
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [projectId, range, refreshNonce, handleUnauthorized]);

  const k = data?.kpis;
  const noProjects = projects !== null && projects.length === 0;
  const activeProject = projects?.find((p) => p.id === projectId) ?? null;
  // E20: when the pick IS the baseline there is nothing to save against — the savings
  // hero and the actual-vs-baseline chart would show a $0 gap between a model and
  // itself. Show the raw stats instead (Steve, 2026-09-08).
  const pickIsBaseline =
    data != null &&
    data.selectedModel != null &&
    data.baselineModel != null &&
    data.selectedModel === data.baselineModel;
  const taskLabel = taskLabelOf(data?.taskType ?? activeProject?.taskType);

  // After an edit/re-pick: reload the project list (names/setup status) and refetch
  // savings (model/baseline may have changed).
  const handleChanged = useCallback(() => {
    void loadProjects();
    setRefreshNonce((n) => n + 1);
  }, [loadProjects]);

  // After a delete: drop the selection so loadProjects re-picks a remaining project (or
  // null → empty state), and reload.
  const handleDeleted = useCallback(() => {
    setProjectId(null);
    void loadProjects();
  }, [loadProjects]);

  // After rating a finding: refetch savings only (a verdict may have flipped the run's
  // quality_ok, re-banking or excluding its savings). No project-list reload needed.
  const handleRated = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  return (
    <div className="workspace-page min-h-full">
      <Header
        projects={projects ?? []}
        projectId={projectId}
        activeProject={activeProject}
        onProject={setProjectId}
        onNewProject={onNewProject}
        onHome={onHome}
        onChanged={handleChanged}
        onDeleted={handleDeleted}
        onUnauthorized={handleUnauthorized}
        range={range}
        onRange={setRange}
      />

      <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6">
        {projectsError && (
          <div className="card border-risk/40 text-sm text-risk">{projectsError}</div>
        )}
        {noProjects && (
          <div className="card text-sm text-muted">
            No CI-Agents yet. Create one from a recommendation to start tracking savings.
          </div>
        )}

        {projectId != null && (
          <div className={`grid grid-cols-1 gap-5 ${chatEnabled ? "xl:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
            {/* left: savings dashboard */}
            <div className="flex flex-col gap-5">
              {error && (
                <div className="card border-risk/40 text-sm text-risk">{error}</div>
              )}
              {loading && !data && (
                <p className="text-sm text-muted">Loading savings…</p>
              )}

              {data && k && pickIsBaseline && (
                <>
                  {/* the pick is the baseline: raw stats only, no "saved" figure */}
                  <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                      label="Running the baseline"
                      value={data.selectedModel ?? "—"}
                      sub="nothing to compare against — no savings to bank"
                    />
                    <KpiCard
                      label="Spend this period"
                      value={formatUSD(k.spendThisPeriod)}
                      sub={
                        k.projectedMonthlySpend != null
                          ? `~${formatUSD(k.projectedMonthlySpend)}/mo projected`
                          : "projection needs more history"
                      }
                    />
                    <KpiCard
                      label="Quality"
                      value={formatPctFromRate(k.acceptanceRate)}
                      accent={
                        k.qualityStatus === "banking"
                          ? "text-banked"
                          : k.qualityStatus === "quality_risk"
                            ? "text-risk"
                            : "text-unrated"
                      }
                      sub={`acceptance · threshold ${formatPctFromRate(k.threshold)}`}
                    />
                    <KpiCard label="CI runs" value={String(k.runsCount)} sub={taskLabel} />
                  </section>

                  <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <CostPerRunBar series={data.series} />
                    <QualityTrend series={data.series} threshold={k.threshold} />
                  </section>

                  <RunsTable
                    projectId={projectId}
                    runs={data.runs}
                    onRated={handleRated}
                  />
                </>
              )}

              {data && k && !pickIsBaseline && (
                <>
                  {/* KPI: the savings hero + a compact stat strip (F2) */}
                  <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(26rem,1fr)_minmax(0,1.6fr)]">
                    <SavingsHero
                      label={
                        toNumber(k.cumulativeSaved) < 0
                          ? "Net overspend"
                          : "Cumulative saved"
                      }
                      value={formatUSD(k.cumulativeSaved)}
                      accent={
                        toNumber(k.cumulativeSaved) < 0 ? "text-risk" : "text-banked"
                      }
                      vsBaseline={
                        <>
                          {k.savedPct != null ? `${formatPct(k.savedPct)} vs baseline` : "—"}
                          {data.baselineModel && (
                            <span className="text-muted">
                              {" · "}
                              {data.baselineModel} costed, not run
                            </span>
                          )}
                        </>
                      }
                      split={
                        <>
                          {k.bankedRuns} banked
                          {k.qualityRiskRuns > 0 && (
                            <>
                              {" · "}
                              <span className="text-risk">
                                {k.qualityRiskRuns} quality-risk (
                                {formatUSD(k.qualityRisk)} excluded)
                              </span>
                            </>
                          )}
                          {k.unratedRuns > 0 && (
                            <>
                              {" · "}
                              <span className="text-unrated">{k.unratedRuns} unrated</span>
                            </>
                          )}
                        </>
                      }
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <KpiCard
                        label="Spend this period"
                        value={formatUSD(k.spendThisPeriod)}
                        sub={
                          k.projectedMonthlySpend != null
                            ? `~${formatUSD(k.projectedMonthlySpend)}/mo projected`
                            : "projection needs more history"
                        }
                      />
                      <KpiCard
                        label="Quality"
                        value={formatPctFromRate(k.acceptanceRate)}
                        accent={
                          k.qualityStatus === "banking"
                            ? "text-banked"
                            : k.qualityStatus === "quality_risk"
                              ? "text-risk"
                              : "text-unrated"
                        }
                        sub={`acceptance · threshold ${formatPctFromRate(k.threshold)}`}
                      />
                      <KpiCard
                        label="CI runs"
                        value={String(k.runsCount)}
                        sub={`${taskLabel} · ${data.selectedModel ?? "—"}`}
                      />
                    </div>
                  </section>

                  {/* main chart */}
                  <SavingsAreaChart
                    series={data.series}
                    selectedModel={data.selectedModel}
                    baselineModel={data.baselineModel}
                  />

                  {/* secondary charts */}
                  <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <CostPerRunBar series={data.series} />
                    <QualityTrend series={data.series} threshold={k.threshold} />
                  </section>

                  <RunsTable
                    projectId={projectId}
                    runs={data.runs}
                    onRated={handleRated}
                  />
                </>
              )}
            </div>

            {/* right: grounded chat panel (stacks under the dashboard below xl) */}
            {chatEnabled && <div className="h-[560px] xl:sticky xl:top-[4.75rem] xl:h-[calc(100vh-6rem)]">
              <ChatPanel projectId={projectId} onUnauthorized={handleUnauthorized} onForbidden={handleChatForbidden} />
            </div>}
          </div>
        )}
      </main>
    </div>
  );
}

function Header({
  projects,
  projectId,
  activeProject,
  onProject,
  onNewProject,
  onHome,
  onChanged,
  onDeleted,
  onUnauthorized,
  range,
  onRange,
}: {
  projects: Project[];
  projectId: number | null;
  activeProject: Project | null;
  onProject: (id: number) => void;
  onNewProject?: () => void;
  onHome?: () => void;
  onChanged: () => void;
  onDeleted: (deletedId: number) => void;
  onUnauthorized?: () => void;
  range: SavingsRange;
  onRange: (r: SavingsRange) => void;
}) {
  return (
    <header className="workspace-header sticky top-0 z-10 border-b border-border">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button
            onClick={onHome}
            disabled={!onHome}
            aria-label="Home"
            className="flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80 disabled:cursor-default disabled:hover:opacity-100"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-panel">
              <img src={markUrl} alt={BRAND_NAME} className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-tight">{BRAND_NAME}</span>
          </button>
          {projectId != null && projects.length > 0 && (
            <ProjectSwitcher
              projects={projects}
              value={projectId}
              onChange={onProject}
            />
          )}
          {activeProject && !activeProject.setupComplete && (
            <span
              className="inline-flex items-center gap-1 rounded border border-unrated/40 bg-unrated/10 px-2 py-1 text-xs font-medium text-unrated"
              title="No CI ingest token yet. Finish setup via Edit Jenkins, then add the CI stage."
            >
              <AlertTriangle size={12} />
              Setup incomplete
            </span>
          )}
          {activeProject && (
            <ProjectActions
              project={activeProject}
              onChanged={onChanged}
              onDeleted={onDeleted}
              onUnauthorized={onUnauthorized}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {onHome && (
            <button type="button" onClick={onHome} className="compact-action">
              <House size={13} />
              Back to home
            </button>
          )}
          {onNewProject && (
            <button
              onClick={onNewProject}
              className="compact-action"
            >
              <Plus size={13} />
              Set up a CI agent
            </button>
          )}
          <div className="flex items-center rounded-xl border border-border bg-panel p-1" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => onRange(r)}
                aria-pressed={range === r}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  range === r
                    ? "bg-panel-2 text-fg"
                    : "text-muted hover:text-fg"
                }`}
              >
                {r === "all" ? "All" : r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
