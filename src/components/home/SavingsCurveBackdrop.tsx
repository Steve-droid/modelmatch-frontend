// Welcome-section backdrop: a cost-over-time line chart with axes + grid — the flat
// dashed line up top is the expensive premium baseline; the line declining away from it
// is the recommended model's cost, and the widening wedge between them is the saving.
// Faint cyan line-art, matching the other section motifs. Decorative → aria-hidden.

// Plot frame.
const X0 = 80; // y-axis
const X1 = 940;
const Y_TOP = 30;
const Y_AXIS = 250; // x-axis baseline
const BASELINE_Y = 72; // flat premium-baseline reference

// Recommended-model cost, declining left→right (savings grow).
const ACTUAL: [number, number][] = [
  [80, 118],
  [223, 134],
  [366, 150],
  [509, 168],
  [652, 188],
  [795, 206],
  [940, 222],
];
const ACTUAL_POINTS = ACTUAL.map(([x, y]) => `${x},${y}`).join(" ");
// Savings band: along the flat baseline, then back along the actual line.
const BAND =
  `${X0},${BASELINE_Y} ${X1},${BASELINE_Y} ` +
  ACTUAL.slice().reverse().map(([x, y]) => `${x},${y}`).join(" ");

const V_GRID = [223, 366, 509, 652, 795];
const H_GRID = [70, 110, 150, 190, 230];

export function SavingsCurveBackdrop({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid meet" className={className}>
      {/* grid */}
      {V_GRID.map((x) => (
        <line key={`v${x}`} x1={x} y1={Y_TOP} x2={x} y2={Y_AXIS} stroke="#1f2329" strokeWidth="1" />
      ))}
      {H_GRID.map((y) => (
        <line key={`h${y}`} x1={X0} y1={y} x2={X1} y2={y} stroke="#1f2329" strokeWidth="1" />
      ))}

      {/* axes */}
      <line x1={X0} y1={Y_TOP} x2={X0} y2={Y_AXIS} stroke="#363b44" strokeWidth="1.5" />
      <line x1={X0} y1={Y_AXIS} x2={X1} y2={Y_AXIS} stroke="#363b44" strokeWidth="1.5" />
      {/* y-axis ticks */}
      {H_GRID.map((y) => (
        <line key={`t${y}`} x1={X0 - 6} y1={y} x2={X0} y2={y} stroke="#363b44" strokeWidth="1.5" />
      ))}

      {/* savings wedge */}
      <polygon points={BAND} fill="#5b93a8" fillOpacity="0.14" />

      {/* premium baseline (flat, dashed) */}
      <line
        x1={X0}
        y1={BASELINE_Y}
        x2={X1}
        y2={BASELINE_Y}
        stroke="#5b93a8"
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeDasharray="6 6"
      />

      {/* recommended-model cost line + markers */}
      <polyline points={ACTUAL_POINTS} fill="none" stroke="#5b93a8" strokeWidth="2.5" />
      {ACTUAL.map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="4" fill="#5b93a8" />
      ))}
    </svg>
  );
}
