import { useCallback, useEffect, useState } from "react";
import { Activity, Coins, GitBranch, ShieldCheck } from "lucide-react";
import type { SavingsRange, SavingsResponse } from "../types/savings";
import type { Project } from "../types/project";
import { getSavings } from "../api/savings";
import { listProjects } from "../api/projects";
import { ApiError } from "../api/client";
import {
  formatPct,
  formatPctFromRate,
  formatUSD,
  toNumber,
} from "../lib/format";
import { KpiCard } from "../components/KpiCard";
import { StatusBadge } from "../components/StatusBadge";
import { SavingsAreaChart } from "../components/SavingsAreaChart";
import { CostPerRunBar } from "../components/CostPerRunBar";
import { QualityTrend } from "../components/QualityTrend";
import { RunsTable } from "../components/RunsTable";
import { ProjectSwitcher } from "../components/ProjectSwitcher";
import { ChatPanel } from "../components/ChatPanel";

const RANGES: SavingsRange[] = ["all", "30d", "7d"];

// Initial project from ?project= (a deep-link); once projects load, the switcher owns
// selection. Falls back to the first project if the param is absent/invalid.
function initialProjectParam(): number | null {
  const q = new URLSearchParams(window.location.search).get("project");
  const n = q ? Number(q) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function Dashboard({ onUnauthorized }: { onUnauthorized?: () => void }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);

  const [range, setRange] = useState<SavingsRange>("all");
  const [data, setData] = useState<SavingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleUnauthorized = useCallback(() => onUnauthorized?.(), [onUnauthorized]);

  // Load the user's projects, then pick the active one (deep-link param if valid,
  // else the first project).
  useEffect(() => {
    let live = true;
    listProjects()
      .then((list) => {
        if (!live) return;
        setProjects(list);
        const wanted = initialProjectParam();
        const deepLinked =
          wanted != null ? list.find((p) => p.id === wanted)?.id : undefined;
        setProjectId(deepLinked ?? list[0]?.id ?? null);
      })
      .catch((e: unknown) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 401) handleUnauthorized();
        else if (e instanceof ApiError) setProjectsError(e.message);
        else setProjectsError("Could not reach the backend.");
      });
    return () => {
      live = false;
    };
  }, [handleUnauthorized]);

  // Clear the previous project's numbers the instant the selection changes, so they
  // never linger under the newly-selected project while its data loads. (Range
  // changes deliberately keep the current data visible during the refetch.)
  useEffect(() => {
    setData(null);
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
  }, [projectId, range, handleUnauthorized]);

  const k = data?.kpis;
  const noProjects = projects !== null && projects.length === 0;

  return (
    <div className="min-h-full">
      <Header
        projects={projects ?? []}
        projectId={projectId}
        onProject={setProjectId}
        range={range}
        onRange={setRange}
        status={k?.qualityStatus}
      />

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        {projectsError && (
          <div className="card border-risk/40 text-sm text-risk">{projectsError}</div>
        )}
        {noProjects && (
          <div className="card text-sm text-muted">
            No projects yet. Create one from a recommendation to start tracking savings.
          </div>
        )}

        {projectId != null && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            {/* left: savings dashboard */}
            <div className="flex flex-col gap-5">
              {error && (
                <div className="card border-risk/40 text-sm text-risk">{error}</div>
              )}
              {loading && !data && (
                <p className="text-sm text-muted">Loading savings…</p>
              )}

              {data && k && (
                <>
                  {/* KPI row */}
                  <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                      label={toNumber(k.cumulativeSaved) < 0 ? "Net overspend" : "Cumulative saved"}
                      countTo={toNumber(k.cumulativeSaved)}
                      format={formatUSD}
                      accent={toNumber(k.cumulativeSaved) < 0 ? "text-risk" : "text-banked"}
                      icon={<Coins size={16} />}
                      sub={
                        <>
                          {k.savedPct != null ? `${formatPct(k.savedPct)} vs baseline` : "—"}{" "}
                          · {k.bankedRuns} banked
                          {k.qualityRiskRuns > 0 && (
                            <span className="mt-0.5 block text-unrated">
                              {formatUSD(k.qualityRisk)} excluded as quality risk
                            </span>
                          )}
                        </>
                      }
                    />
                    <KpiCard
                      label="Spend this period"
                      countTo={toNumber(k.spendThisPeriod)}
                      format={formatUSD}
                      icon={<Activity size={16} />}
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
                      icon={<ShieldCheck size={16} />}
                      sub={<>acceptance · threshold {formatPctFromRate(k.threshold)}</>}
                    />
                    <KpiCard
                      label="CI runs"
                      countTo={k.runsCount}
                      format={(n) => String(Math.round(n))}
                      icon={<GitBranch size={16} />}
                      sub={`${k.bankedRuns} banked · ${k.qualityRiskRuns} risk · ${k.unratedRuns} unrated`}
                    />
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

                  <RunsTable projectId={projectId} runs={data.runs} />
                </>
              )}
            </div>

            {/* right: grounded chat panel (stacks under the dashboard below xl) */}
            <div className="h-[560px] xl:sticky xl:top-[4.75rem] xl:h-[calc(100vh-6rem)]">
              <ChatPanel projectId={projectId} onUnauthorized={handleUnauthorized} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Header({
  projects,
  projectId,
  onProject,
  range,
  onRange,
  status,
}: {
  projects: Project[];
  projectId: number | null;
  onProject: (id: number) => void;
  range: SavingsRange;
  onRange: (r: SavingsRange) => void;
  status?: SavingsResponse["kpis"]["qualityStatus"];
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/20 text-accent">
            <Coins size={16} />
          </span>
          <span className="font-semibold tracking-tight">ModelMatch</span>
          {projectId != null && projects.length > 0 && (
            <ProjectSwitcher
              projects={projects}
              value={projectId}
              onChange={onProject}
            />
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {status && <StatusBadge status={status} />}
          <div className="flex items-center rounded-md border border-border bg-panel p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => onRange(r)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  range === r
                    ? "bg-panel-2 text-gray-100"
                    : "text-muted hover:text-gray-200"
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
