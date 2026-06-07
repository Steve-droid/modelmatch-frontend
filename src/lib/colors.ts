// Chart colours in one place. Recharts needs literal hex (it can't read Tailwind
// classes), so the canonical values live here and the Tailwind theme mirrors them.
// "actual" is a MUTED cyan — toned down from the original vivid #22d3ee so the
// dashboard reads calm/operational rather than neon.
export const chartColors = {
  actual: "#5b93a8", // muted steel-cyan — recommended model's actual cost
  savings: "#22c55e", // green — savings band (top edge = baseline)
  risk: "#ef4444", // red — quality risk
  unrated: "#f59e0b", // amber — unrated / threshold line
  banked: "#22c55e",
  baselineLine: "#9aa3b2", // neutral gray — the baseline reference line (+ its tooltip dot)
  grid: "#262a31",
  axisLabel: "#8b929e",
} as const;
