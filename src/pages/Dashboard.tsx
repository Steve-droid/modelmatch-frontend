import { useEffect, useState } from "react";
import { Activity, Coins, GitBranch, ShieldCheck } from "lucide-react";
import type { SavingsRange, SavingsResponse } from "../types/savings";
import { getSavings } from "../api/savings";
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

const RANGES: SavingsRange[] = ["all", "30d", "7d"];

// projectId from ?project= (until the project switcher / login flow lands in S15).
function useProjectId(): number {
  const q = new URLSearchParams(window.location.search).get("project");
  const n = q ? Number(q) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function Dashboard() {
  const projectId = useProjectId();
  const [range, setRange] = useState<SavingsRange>("all");
  const [data, setData] = useState<SavingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    getSavings(projectId, range)
      .then((res) => live && setData(res))
      .catch((e: unknown) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 401)
          setError("Not signed in — set a token to view this dashboard.");
        else if (e instanceof ApiError) setError(e.message);
        else setError("Could not reach the backend.");
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [projectId, range]);

  const k = data?.kpis;

  return (
    <div className="min-h-full">
      <Header
        projectId={projectId}
        range={range}
        onRange={setRange}
        status={k?.qualityStatus}
      />

      <main className="mx-auto max-w-7xl px-6 py-6">
        {error && (
          <div className="card border-risk/40 text-sm text-risk">{error}</div>
        )}
        {loading && !data && (
          <p className="text-sm text-muted">Loading savings…</p>
        )}

        {data && k && (
          <div className="flex flex-col gap-5">
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
          </div>
        )}
      </main>
    </div>
  );
}

function Header({
  projectId,
  range,
  onRange,
  status,
}: {
  projectId: number;
  range: SavingsRange;
  onRange: (r: SavingsRange) => void;
  status?: SavingsResponse["kpis"]["qualityStatus"];
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/20 text-accent">
            <Coins size={16} />
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold tracking-tight">ModelMatch</span>
            <span className="num hidden text-xs text-faint sm:inline">
              project #{projectId}
            </span>
          </div>
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
