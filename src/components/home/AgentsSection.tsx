import { ArrowRight, LayoutDashboard, Plus } from "lucide-react";
import { useInView } from "../../lib/useInView";
import { PipelineBackdrop } from "./PipelineBackdrop";

// Section 2 — "View my agents" → the savings dashboard. An "agent" is a project running
// the containerised CI code-review agent. The animated CI-pipeline motif sits as a
// visible band BELOW the CTA (not hidden behind the centred copy), edge-faded into the
// canvas with a soft cyan glow behind the highlighted Review stage. New users (0 agents)
// get a nudge to create their first one instead of being dropped into an empty dashboard.
export function AgentsSection({
  id,
  hasAgents,
  agentCount,
  onViewAgents,
  onCreateAgent,
}: {
  id: string;
  hasAgents: boolean;
  agentCount: number;
  onViewAgents: () => void;
  onCreateAgent: () => void;
}) {
  const [ref, inView] = useInView<HTMLElement>();

  return (
    <section
      id={id}
      ref={ref}
      className="relative flex min-h-full snap-start flex-col items-center justify-center overflow-hidden px-6 pb-48 lg:pb-60"
    >
      <div
        className={`relative z-10 max-w-xl text-center transition-all duration-700 ease-out lg:max-w-2xl ${
          inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-signal/30 bg-signal/10 px-3 py-1 text-xs font-medium text-signal lg:mb-7 lg:px-3.5 lg:py-1.5 lg:text-sm">
          <LayoutDashboard size={13} />
          Your CI-Agents
        </span>

        {hasAgents ? (
          <>
            <h2 className="text-balance text-2xl font-semibold tracking-tight text-gray-50 sm:text-3xl lg:text-4xl xl:text-5xl">
              View my CI-Agents
            </h2>
            <p className="mt-4 text-balance text-base leading-relaxed text-muted lg:mt-5 lg:text-lg">
              Open the savings dashboard to see each CI-Agent's spend against its premium
              baseline, the quality gate, and how much you've saved.
            </p>
            <button
              onClick={onViewAgents}
              className="mt-7 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 lg:mt-9 lg:px-5 lg:py-3 lg:text-base"
            >
              <LayoutDashboard size={16} />
              View my CI-Agents
              <span className="num rounded bg-white/15 px-1.5 py-0.5 text-xs">{agentCount}</span>
            </button>
          </>
        ) : (
          <>
            <h2 className="text-balance text-2xl font-semibold tracking-tight text-gray-50 sm:text-3xl lg:text-4xl xl:text-5xl">
              No CI-Agents yet
            </h2>
            <p className="mt-4 text-balance text-base leading-relaxed text-muted lg:mt-5 lg:text-lg">
              A CI-Agent is a model reviewing your pull requests in CI. Create your first one
              to start saving against a premium baseline.
            </p>
            <button
              onClick={onCreateAgent}
              className="mt-7 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 lg:mt-9 lg:px-5 lg:py-3 lg:text-base"
            >
              <Plus size={16} />
              Create your first CI-Agent
              <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>

      {/* The animated pipeline as a wide band anchored below the CTA — actually visible,
          unlike the old centred motif that hid behind the copy. A soft cyan glow pools
          behind the highlighted Review stage; the strip dissolves at both edges into the
          canvas. Flow + pulse animations are unchanged. Fades in with the section.
          Decorative → aria-hidden. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-12 z-0 flex items-center justify-center lg:bottom-16"
      >
        <div className="relative mx-auto w-[85%] max-w-[61rem] 2xl:max-w-[68rem]">
          <div className="absolute left-1/2 top-1/2 h-48 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal/[0.13] blur-3xl" />
          <div
            className={`transition-opacity duration-1000 ease-out [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)] ${
              inView ? "opacity-80" : "opacity-0"
            }`}
          >
            <PipelineBackdrop className="h-auto w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
