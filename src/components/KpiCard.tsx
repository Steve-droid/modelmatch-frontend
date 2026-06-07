import type { ReactNode } from "react";
import { useCountUp } from "../lib/useCountUp";

// A single KPI card (no nested cards). Either pass a ready `value` string, or pass
// `countTo` + `format` to animate a number up on mount (subtle count-up motion).
interface KpiCardProps {
  label: string;
  value?: string;
  countTo?: number;
  format?: (n: number) => string;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: string; // tailwind text-* colour for the headline figure
}

export function KpiCard({
  label,
  value,
  countTo,
  format,
  sub,
  icon,
  accent = "text-gray-100",
}: KpiCardProps) {
  const animated = useCountUp(countTo ?? 0);
  const display =
    countTo !== undefined && format ? format(animated) : (value ?? "—");

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </span>
        {icon && <span className="text-faint">{icon}</span>}
      </div>
      <div className={`num text-2xl font-semibold leading-none ${accent}`}>
        {display}
      </div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
