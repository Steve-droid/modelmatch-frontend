import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SavingsSeriesPoint } from "../types/savings";
import { chartColors } from "../lib/colors";
import {
  formatDateTime,
  formatUSD,
  formatUSDAxis,
  toNumber,
} from "../lib/format";
import {
  ChartCard,
  LegendSwatch,
  TooltipBox,
  axisProps,
  chartMargin,
} from "./chart-bits";

// One charted point. `floor`/`gain`/`loss` stack to honestly show BOTH directions:
// - savings ≥ 0: floor = actual (blue), gain = the green gap up to baseline = savings.
// - overspend (actual > baseline): floor = baseline (blue), loss = the RED gap up to
//   actual. We never clamp away an overspend — it surfaces in red (architecture §8).
// `baseline` is also drawn as its own neutral line, so every tooltip colour maps to a
// visible element (fixes the "gray with no gray in the chart" ambiguity).
export interface AreaPoint {
  label: string;
  fullDate: string;
  build: string | null;
  actual: number;
  baseline: number;
  savings: number; // signed
  floor: number;
  gain: number;
  loss: number;
}

export function buildAreaData(series: SavingsSeriesPoint[]): AreaPoint[] {
  return series.map((p, i) => {
    const actual = toNumber(p.actual);
    const baseline = toNumber(p.baseline);
    const savings = toNumber(p.savings); // baseline − actual, signed
    return {
      // X axis = Jenkins build (each point is one CI run); same label as CostPerRunBar.
      label: p.jenkinsBuildId ? `#${p.jenkinsBuildId}` : `run ${i + 1}`,
      fullDate: formatDateTime(p.date),
      build: p.jenkinsBuildId,
      actual,
      baseline,
      savings,
      floor: Math.min(actual, baseline),
      gain: Math.max(savings, 0),
      loss: Math.max(actual - baseline, 0),
    };
  });
}

export function SavingsAreaChart({
  series,
  selectedModel,
  baselineModel,
}: {
  series: SavingsSeriesPoint[];
  selectedModel: string | null;
  baselineModel: string | null;
}) {
  const data = buildAreaData(series);
  const hasOverspend = data.some((d) => d.loss > 0);

  return (
    <ChartCard
      title="Actual vs baseline cost"
      hint="each point = one CI run"
      legend={
        <>
          <LegendSwatch color={chartColors.actual}>
            Recommended · {selectedModel ?? "selected model"}
          </LegendSwatch>
          <LegendSwatch color={chartColors.savings}>Savings</LegendSwatch>
          {hasOverspend && <LegendSwatch color={chartColors.risk}>Overspend</LegendSwatch>}
          <LegendSwatch color={chartColors.baselineLine}>
            Baseline · {baselineModel ?? "baseline"}
          </LegendSwatch>
        </>
      }
    >
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={60} tickFormatter={formatUSDAxis} />
          <Tooltip
            content={<AreaTooltip selectedModel={selectedModel} baselineModel={baselineModel} />}
          />
          {/* flat low-alpha fills (Grafana-style) — no gradients */}
          <Area type="monotone" dataKey="floor" stackId="cost" stroke={chartColors.actual} fill={chartColors.actual} fillOpacity={0.12} strokeWidth={1.5} />
          <Area type="monotone" dataKey="gain" stackId="cost" stroke={chartColors.savings} fill={chartColors.savings} fillOpacity={0.15} strokeWidth={1.5} />
          {/* the overspend band only when there is one — a zero-height area would still draw
              its red stroke along the top of the savings band */}
          {hasOverspend && (
            <Area type="monotone" dataKey="loss" stackId="cost" stroke={chartColors.risk} fill={chartColors.risk} fillOpacity={0.15} strokeWidth={1.5} />
          )}
          <Line type="monotone" dataKey="baseline" stroke={chartColors.baselineLine} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Custom tooltip — names each line (the ambiguity fix) and shows savings signed, so
// overspend reads red, not green.
function AreaTooltip({
  active,
  payload,
  selectedModel,
  baselineModel,
}: {
  active?: boolean;
  payload?: Array<{ payload: AreaPoint }>;
  selectedModel: string | null;
  baselineModel: string | null;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const saved = d.savings >= 0;
  return (
    <TooltipBox>
      <div className="mb-1 text-faint">
        {d.fullDate}
        {d.build ? ` · build ${d.build}` : ""}
      </div>
      <Row color={chartColors.actual} label={`Recommended · ${selectedModel ?? "selected"}`} value={formatUSD(d.actual)} />
      <Row
        color={saved ? chartColors.savings : chartColors.risk}
        label={saved ? "Saved" : "Overspend"}
        value={formatUSD(d.savings)}
        valueClass={saved ? "text-banked" : "text-risk"}
      />
      <Row color={chartColors.baselineLine} label={`Baseline · ${baselineModel ?? "baseline"}`} value={formatUSD(d.baseline)} />
    </TooltipBox>
  );
}

function Row({
  color,
  label,
  value,
  valueClass = "text-fg",
}: {
  color: string;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-muted">
        <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
        {label}
      </span>
      <span className={`num ${valueClass}`}>{value}</span>
    </div>
  );
}
