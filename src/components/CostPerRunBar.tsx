import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SavingsSeriesPoint } from "../types/savings";
import { chartColors } from "../lib/colors";
import { formatDateTime, formatUSD, formatUSDAxis, toNumber } from "../lib/format";
import { qualityOf } from "./StatusBadge";
import { ChartCard, TooltipBox, axisProps, chartMargin } from "./chart-bits";

// Cost per run, each bar coloured by quality_ok — the VISUAL "quality-risk excluded":
// green = banked, red = quality risk (excluded from the headline), orange = unrated.
const COLOR = (q: boolean | null) =>
  q === true ? chartColors.banked : q === false ? chartColors.risk : chartColors.unrated;

export function CostPerRunBar({ series }: { series: SavingsSeriesPoint[] }) {
  const data = series.map((p, i) => ({
    label: p.jenkinsBuildId ? `#${p.jenkinsBuildId}` : `run ${i + 1}`,
    fullDate: formatDateTime(p.date),
    build: p.jenkinsBuildId,
    actual: toNumber(p.actual),
    qualityOk: p.qualityOk,
  }));

  return (
    <ChartCard title="Cost per run" hint="by build · coloured by quality gate">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={60} tickFormatter={formatUSDAxis} />
          <Tooltip cursor={{ fill: "#ffffff08" }} content={<BarTooltip />} />
          <Bar dataKey="actual" radius={[2, 2, 0, 0]} fillOpacity={0.85}>
            {data.map((d, i) => (
              <Cell key={i} fill={COLOR(d.qualityOk)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { fullDate: string; build: string | null; actual: number; qualityOk: boolean | null } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const q = qualityOf(d.qualityOk);
  return (
    <TooltipBox>
      <div className="mb-1 text-faint">
        {d.fullDate}
        {d.build ? ` · build ${d.build}` : ""}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted">Actual cost</span>
        <span className="num text-fg">{formatUSD(d.actual)}</span>
      </div>
      <div className={`mt-0.5 ${q.className}`}>{q.label}</div>
    </TooltipBox>
  );
}
