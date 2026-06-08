import { Fragment } from "react";
import { ChevronDown, ChevronRight, GitBranch, Sparkles, TrendingUp } from "lucide-react";
import { HOW_IT_WORKS_STEPS } from "../../lib/valueProp";

// The hero's "how it works" beats as a stepped flow: three connected nodes that reveal
// one after another when the hero scrolls in, so the eye is led Recommend → Run → Save.
// Colour-coded to the app's semantics (indigo action · cyan CI · green saved) so it reads
// differently from the plain text above it. No animation library — staggered CSS
// transitions keyed off `active`.
const NODES = [
  { icon: Sparkles, tone: "accent" },
  { icon: GitBranch, tone: "signal" },
  { icon: TrendingUp, tone: "banked" },
] as const;

const TONE: Record<string, { chip: string; ring: string }> = {
  accent: { chip: "bg-accent/15 text-accent", ring: "border-accent/30" },
  signal: { chip: "bg-signal/15 text-signal", ring: "border-signal/30" },
  banked: { chip: "bg-banked/15 text-banked", ring: "border-banked/30" },
};

// Each element reveals in sequence; the connector between nodes lands just after the
// node it follows.
function delay(i: number): React.CSSProperties {
  return { transitionDelay: `${150 + i * 180}ms` };
}

export function HowItWorksFlow({ active }: { active: boolean }) {
  const reveal = (extra: string) =>
    `transition-all duration-500 ease-out ${
      active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
    } ${extra}`;

  return (
    <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
      {NODES.map(({ icon: Icon, tone }, i) => {
        const t = TONE[tone];
        return (
          <Fragment key={i}>
            <div
              style={delay(i)}
              className={reveal(
                `flex items-center gap-2.5 rounded-lg border ${t.ring} bg-panel px-4 py-3 lg:px-5 lg:py-3.5`,
              )}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${t.chip} lg:h-8 lg:w-8`}>
                <Icon size={16} />
              </span>
              <span className="whitespace-nowrap text-sm font-medium text-gray-200 lg:text-base">
                {HOW_IT_WORKS_STEPS[i]}
              </span>
            </div>

            {i < NODES.length - 1 && (
              <span style={delay(i + 0.5)} className={reveal("flex items-center justify-center text-faint")}>
                <ChevronRight size={18} className="hidden sm:block" />
                <ChevronDown size={16} className="sm:hidden" />
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
