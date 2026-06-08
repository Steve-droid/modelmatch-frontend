import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SavingsSeriesPoint } from "../types/savings";
import { chartColors } from "../lib/colors";
import { formatDateTime } from "../lib/format";
import { ChartCard, TooltipBox, axisProps, chartMargin } from "./chart-bits";

// Acceptance rate per run (%) vs the quality threshold reference line. Points below
// the dashed line are the runs whose savings don't bank (architecture §8).
export function QualityTrend({
  series,
  threshold,
}: {
  series: SavingsSeriesPoint[];
  threshold: number;
}) {
  const data = series.map((p, i) => ({
    // X axis = Jenkins build (each point is one CI run); same label as CostPerRunBar.
    label: p.jenkinsBuildId ? `#${p.jenkinsBuildId}` : `run ${i + 1}`,
    fullDate: formatDateTime(p.date),
    build: p.jenkinsBuildId,
    rate: p.acceptanceRate === null ? null : Math.round(p.acceptanceRate * 100),
  }));
  const thresholdPct = Math.round(threshold * 100);

  return (
    <ChartCard title="Quality trend" hint={`threshold ${thresholdPct}%`}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={44} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<TrendTooltip thresholdPct={thresholdPct} />} />
          <ReferenceLine
            y={thresholdPct}
            stroke={chartColors.unrated}
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
          <Line
            type="monotone"
            dataKey="rate"
            stroke={chartColors.actual}
            strokeWidth={2}
            dot={{ r: 3, fill: chartColors.actual }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function TrendTooltip({
  active,
  payload,
  thresholdPct,
}: {
  active?: boolean;
  payload?: Array<{ payload: { fullDate: string; build: string | null; rate: number | null } }>;
  thresholdPct: number;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const banks = d.rate !== null && d.rate >= thresholdPct;
  return (
    <TooltipBox>
      <div className="mb-1 text-faint">
        {d.fullDate}
        {d.build ? ` · build ${d.build}` : ""}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-gray-300">Acceptance</span>
        <span className="num text-gray-100">{d.rate === null ? "unrated" : `${d.rate}%`}</span>
      </div>
      {d.rate !== null && (
        <div className={`mt-0.5 ${banks ? "text-banked" : "text-risk"}`}>
          {banks ? "banks savings" : "below threshold"}
        </div>
      )}
    </TooltipBox>
  );
}
