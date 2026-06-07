// Display formatters. Money arrives as a Decimal string; parse with Number() only
// for display/charts (precision already fixed server-side at 6 dp).

import type { Money } from "../types/savings";

/** A money string/number → "$1.23" (≥ $1) or "$0.0058" (sub-dollar, finer precision).
 *  Negatives (overspend) read "-$0.0058" — sign before the $, never "$-…". */
export function formatUSD(value: Money | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const dp = abs >= 1 ? 2 : 4;
  const sign = n < 0 ? "-" : "";
  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })}`;
}

/** Compact money for chart axis ticks: trims trailing zeros ($0.06, $0.045, $0.005). */
export function formatUSDAxis(n: number): string {
  if (Number.isNaN(n)) return "";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1) return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 1 })}`;
  return `${sign}$${parseFloat(abs.toFixed(3))}`;
}

/** Parse a money string to a number for charting (null/invalid → 0). */
export function toNumber(value: Money | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/** A 0..1 rate → "92%". null → "—". */
export function formatPctFromRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return "—";
  return `${Math.round(rate * 100)}%`;
}

/** An already-percentage number → "20.0%". null → "—". */
export function formatPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "—";
  return `${pct.toFixed(1)}%`;
}

export function formatTokens(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US");
}

/** ISO timestamp → "Jun 3, 14:05". */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ISO timestamp → "Jun 3" (chart axis ticks). */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
