// Chart colours in one place. Recharts needs literal hex (it can't read Tailwind
// classes), so the canonical values live here and the Tailwind theme mirrors them.
// Grafana-classic series palette: blue (the recommended model), green (savings /
// banked), orange (unrated / threshold), red (quality risk / overspend). The four stay
// distinguishable on the dark canvas (bars + quality trend), incl. for deuteranopia
// (blue vs orange carry the contrast; green/red never sit alone).
export const chartColors = {
  actual: "#5794f2", // blue — the recommended model's actual cost (= the app accent)
  savings: "#73bf69", // green — savings band (top edge = baseline)
  risk: "#f2495c", // red — quality risk / overspend
  unrated: "#ff9830", // orange — unrated / threshold line
  banked: "#73bf69",
  baselineLine: "#9fa7b3", // neutral gray — the baseline reference line (+ its tooltip dot)
  grid: "#2c3235",
  axisLabel: "#9fa7b3",
} as const;
