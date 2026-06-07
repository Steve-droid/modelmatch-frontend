import type { ReactNode } from "react";

// Shared chart chrome so the three charts look consistent (one card each — no nesting).

export function ChartCard({
  title,
  hint,
  legend,
  children,
}: {
  title: string;
  hint?: string;
  legend?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        {hint && <span className="text-xs text-faint">{hint}</span>}
      </div>
      {legend && <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">{legend}</div>}
      {!legend && <div className="mb-3" />}
      {children}
    </div>
  );
}

// A coloured-dot + label, for the always-visible chart legend.
export function LegendSwatch({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
      {children}
    </span>
  );
}

// The dark surface custom tooltips render into.
export function TooltipBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-panel px-3 py-2 text-xs shadow-lg">
      {children}
    </div>
  );
}

// Fixed margins — a real left margin so Y-axis tick labels never clip.
export const chartMargin = { top: 8, right: 12, left: 8, bottom: 0 } as const;

// Recharts axis styling (faint, no heavy lines) — spread onto <XAxis>/<YAxis>.
export const axisProps = {
  stroke: "#5b626d",
  tick: { fill: "#8b929e", fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: "#262a31" },
} as const;
