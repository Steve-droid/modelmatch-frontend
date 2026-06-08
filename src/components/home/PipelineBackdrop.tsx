// A stylised CI/CD pipeline used as a blurred, dimmed backdrop behind the "View my
// CI-Agents" section — a CI-Agent = a project running the containerised CI code-review
// agent at the "Review" stage (highlighted). Hand-rolled (no stock art); stages →
// connectors in the cyan "signal" (model·CI) accent. The connector dashes flow and the
// CI-Agent stage softly pulses (CSS keyframes in index.css — no JS/bundle cost).
// Decorative → aria-hidden.
const STAGES = ["Checkout", "Build", "Test", "Review", "Gate", "Publish", "Deploy"] as const;
const AGENT_STAGE = "Review";

export function PipelineBackdrop({ className = "" }: { className?: string }) {
  const gap = 1000 / STAGES.length;
  // Narrow boxes leave long gaps between stages, so the flowing connector dashes are
  // easy to read. `meet` keeps the whole pipeline in view (not cropped) — see all stages.
  const boxW = 78;
  const boxH = 50;
  const y = 125;
  const midY = y + boxH / 2;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1000 300"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      {STAGES.map((stage, i) => {
        const cx = gap * i + gap / 2;
        const x = cx - boxW / 2;
        const isAgent = stage === AGENT_STAGE;
        const stroke = isAgent ? "#5b93a8" : "#262a31";
        const fill = isAgent ? "rgba(91,147,168,0.12)" : "#141619";
        const textFill = isAgent ? "#5b93a8" : "#5b626d";
        return (
          <g key={stage}>
            {/* animated connector arrow into this stage */}
            {i > 0 && (
              <line
                x1={gap * (i - 1) + gap / 2 + boxW / 2 + 6}
                y1={midY}
                x2={x - 14}
                y2={midY}
                stroke="#5b93a8"
                strokeWidth={2.5}
                strokeDasharray="6 6"
                markerEnd="url(#pb-arrow)"
                style={{ animation: `pipelineFlow 1s linear infinite`, animationDelay: `${i * 0.1}s` }}
              />
            )}
            <rect x={x} y={y} width={boxW} height={boxH} rx={8} fill={fill} stroke={stroke} strokeWidth={1.5} />
            <text
              x={cx}
              y={midY + 5}
              textAnchor="middle"
              fontSize={14}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fill={textFill}
            >
              {stage}
            </text>
            {isAgent && (
              <circle cx={cx} cy={y - 14} r={4} fill="#5b93a8" style={{ animation: "pipelinePulse 2s ease-in-out infinite" }} />
            )}
          </g>
        );
      })}
      <defs>
        <marker id="pb-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#5b93a8" />
        </marker>
      </defs>
    </svg>
  );
}
