import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import type { QualityStatus } from "../types/savings";

// Maps a run's quality_ok (true/false/null) to the shared status semantics
// (green=banked / red=risk / amber=unrated). Single source of truth for colour.
export function qualityOf(qualityOk: boolean | null): {
  label: string;
  status: QualityStatus;
  className: string;
  dot: string;
} {
  if (qualityOk === true)
    return { label: "Saved", status: "banking", className: "text-banked", dot: "bg-banked" };
  if (qualityOk === false)
    return { label: "Quality risk", status: "quality_risk", className: "text-risk", dot: "bg-risk" };
  return { label: "Unrated", status: "unrated", className: "text-unrated", dot: "bg-unrated" };
}

const STATUS_META: Record<
  QualityStatus,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  banking: {
    label: "Saving vs baseline",
    className: "text-banked border-banked/40 bg-banked/10",
    Icon: CheckCircle2,
  },
  quality_risk: {
    label: "Quality risk",
    className: "text-risk border-risk/40 bg-risk/10",
    Icon: AlertTriangle,
  },
  unrated: {
    label: "Unrated",
    className: "text-unrated border-unrated/40 bg-unrated/10",
    Icon: CircleDashed,
  },
};

export function StatusBadge({ status }: { status: QualityStatus }) {
  const { label, className, Icon } = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon size={13} />
      {label}
    </span>
  );
}

// A small inline pill for per-run quality in the table.
export function QualityPill({ qualityOk }: { qualityOk: boolean | null }) {
  const { label, className, dot } = qualityOf(qualityOk);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
