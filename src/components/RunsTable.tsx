import { useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { FindingRow, SavingsRunRow } from "../types/savings";
import { getRunFindings } from "../api/savings";
import { formatDateTime, formatTokens, formatUSD, toNumber } from "../lib/format";
import { QualityPill } from "./StatusBadge";

// Runs table (build · date · model · tokens · actual · baseline · savings · quality ·
// #findings). Click a row to drill into that run's findings (Fork 4 endpoint).
export function RunsTable({
  projectId,
  runs,
}: {
  projectId: number;
  runs: SavingsRunRow[];
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [loading, setLoading] = useState(false);
  // Guards against a stale response winning when rows are toggled quickly: only the
  // most recent request's result is applied (compare against the latest run id).
  const latestReq = useRef<number | null>(null);

  async function toggle(runId: number) {
    if (openId === runId) {
      setOpenId(null);
      latestReq.current = null;
      return;
    }
    setOpenId(runId);
    setFindings([]);
    setLoading(true);
    latestReq.current = runId;
    try {
      const res = await getRunFindings(projectId, runId);
      if (latestReq.current !== runId) return; // a newer row was opened — drop this
      setFindings(res.findings);
    } catch {
      if (latestReq.current === runId) setFindings([]);
    } finally {
      if (latestReq.current === runId) setLoading(false);
    }
  }

  // newest first in the table (series stays chronological for the charts).
  const rows = [...runs].reverse();

  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-200">CI runs</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-faint">
              <th className="px-4 py-2 font-medium">Build</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Model</th>
              <th className="px-4 py-2 text-right font-medium">Tokens</th>
              <th className="px-4 py-2 text-right font-medium">Actual</th>
              <th className="px-4 py-2 text-right font-medium">Baseline</th>
              <th className="px-4 py-2 text-right font-medium">Savings</th>
              <th className="px-4 py-2 font-medium">Quality</th>
              <th className="px-4 py-2 text-right font-medium">Findings</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <FragmentRow
                key={r.id}
                run={r}
                open={openId === r.id}
                loading={loading && openId === r.id}
                findings={openId === r.id ? findings : []}
                onToggle={() => toggle(r.id)}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted">
                  No CI runs yet — the dashboard fills in as the agent posts runs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentRow({
  run,
  open,
  loading,
  findings,
  onToggle,
}: {
  run: SavingsRunRow;
  open: boolean;
  loading: boolean;
  findings: FindingRow[];
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-t border-border/60 hover:bg-white/[0.02]"
      >
        <td className="px-4 py-2.5">
          <span className="flex items-center gap-1.5 num text-gray-200">
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {run.jenkinsBuildId ?? "—"}
          </span>
        </td>
        <td className="px-4 py-2.5 text-muted">{formatDateTime(run.createdAt)}</td>
        <td className="px-4 py-2.5 num text-signal">{run.model ?? "—"}</td>
        <td className="px-4 py-2.5 num text-right text-muted">
          {formatTokens((run.tokensIn ?? 0) + (run.tokensOut ?? 0))}
        </td>
        <td className="px-4 py-2.5 num text-right text-gray-200">
          {formatUSD(run.actualCost)}
        </td>
        <td className="px-4 py-2.5 num text-right text-muted">
          {formatUSD(run.baselineCost)}
        </td>
        <td
          className={`px-4 py-2.5 num text-right font-medium ${
            run.savings != null && toNumber(run.savings) < 0
              ? "text-risk"
              : "text-banked"
          }`}
        >
          {formatUSD(run.savings)}
        </td>
        <td className="px-4 py-2.5">
          <QualityPill qualityOk={run.qualityOk} />
        </td>
        <td className="px-4 py-2.5 num text-right text-muted">
          {run.findingsCount}
        </td>
      </tr>
      {open && (
        <tr className="bg-canvas/60">
          <td colSpan={9} className="px-4 py-3">
            {loading ? (
              <p className="text-xs text-muted">Loading findings…</p>
            ) : findings.length === 0 ? (
              <p className="text-xs text-muted">No findings on this run.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {findings.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-start gap-2 text-xs text-gray-300"
                  >
                    <span className="num shrink-0 text-faint">
                      {f.category ?? "—"}/{f.severity ?? "—"}
                    </span>
                    <span className="num shrink-0 text-signal">
                      {f.file ?? "—"}
                      {f.line != null ? `:${f.line}` : ""}
                    </span>
                    <span className="text-gray-300">{f.message}</span>
                    {f.verdict && (
                      <span
                        className={
                          f.verdict === "accept"
                            ? "ml-auto shrink-0 text-banked"
                            : "ml-auto shrink-0 text-risk"
                        }
                      >
                        {f.verdict}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
