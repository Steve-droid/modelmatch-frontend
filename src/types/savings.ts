// Types mirroring the backend's SavingsResponse DTO (app/schemas/savings.py).
// The wire is camelCase (CamelModel). IMPORTANT: money is a Decimal server-side and
// serializes as a JSON *string* (e.g. "0.005800") to preserve precision — so it is
// `Money = string` here, parsed to a number only where a chart/format needs it.

export type Money = string;

export type QualityStatus = "banking" | "quality_risk" | "unrated";
export type SavingsRange = "all" | "7d" | "30d" | "90d";

export interface SavingsKpis {
  cumulativeSaved: Money; // banked headline ($)
  savedPct: number | null; // cumulative / banked baseline * 100
  baselineTotal: Money;
  spendThisPeriod: Money;
  qualityRisk: Money; // surfaced, excluded from the headline
  projectedMonthlySpend: Money | null;
  projectedMonthlySavings: Money | null;
  acceptanceRate: number | null; // overall accepted / rated (0..1)
  qualityStatus: QualityStatus;
  threshold: number; // QUALITY_THRESHOLD — the trend reference line
  runsCount: number;
  bankedRuns: number;
  qualityRiskRuns: number;
  unratedRuns: number;
}

export interface SavingsSeriesPoint {
  date: string; // ISO timestamp
  jenkinsBuildId: string | null;
  actual: Money | null;
  baseline: Money | null;
  savings: Money | null;
  qualityOk: boolean | null;
  acceptanceRate: number | null;
}

export interface SavingsRunRow {
  id: number;
  jenkinsBuildId: string | null;
  createdAt: string;
  model: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  cacheReadTokens: number | null; // Separate, unpriced usage; null means not reported.
  actualCost: Money | null;
  baselineCost: Money | null;
  savings: Money | null;
  qualityOk: boolean | null;
  acceptanceRate: number | null;
  gate: string | null;
  findingsCount: number;
  // E20: distinct CWE ids on this run's findings ("CWE-89"), in finding order. Empty
  // on review runs — the column only appears when a run carries one.
  cwes: string[];
}

export interface SavingsResponse {
  range: SavingsRange;
  selectedModel: string | null; // recommended pick powering "actual"
  baselineModel: string | null; // expensive default "baseline" is costed against
  taskType: string | null; // E20: the project's task ("ci_review" | "security_analysis")
  kpis: SavingsKpis;
  series: SavingsSeriesPoint[];
  runs: SavingsRunRow[];
}

// A human's verdict on a CI finding — the quality signal (S13).
export type Verdict = "accept" | "reject";

// Findings drill-in (GET /projects/{id}/runs/{run_id}/findings).
export interface FindingRow {
  id: number;
  severity: string | null;
  category: string | null;
  file: string | null;
  line: number | null;
  message: string | null;
  cwe: string | null; // security task: "CWE-89: SQL Injection"; null on review findings
  verdict: Verdict | null; // the caller's accept/reject, or null (unrated)
}

export interface RunFindingsResponse {
  runId: number;
  findings: FindingRow[];
}

// POST /findings/{id}/feedback response (mirrors FeedbackOut, camelCase out). Carries
// the run's recomputed gate so the dashboard knows the verdict re-banked the savings.
export interface FeedbackResponse {
  findingId: number;
  ciRunId: number;
  verdict: Verdict;
  acceptanceRate: number | null; // run's accepted/rated after this verdict
  qualityOk: boolean | null; // run's gate: null=un-gated, else rate ≥ threshold
}
