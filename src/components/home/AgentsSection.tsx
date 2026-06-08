import { ArrowRight, LayoutDashboard, Plus } from "lucide-react";
import { useInView } from "../../lib/useInView";
import { PipelineBackdrop } from "./PipelineBackdrop";
import { SectionBackdrop } from "./SectionBackdrop";

// Section 2 — "View my agents" → the savings dashboard. An "agent" is a project running
// the containerised CI code-review agent. A blurred, dimmed CI-pipeline diagram sits
// behind the copy (cyan signal accent). New users (0 agents) get a nudge to create their
// first one instead of being dropped into an empty dashboard.
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
      className="relative flex min-h-full snap-start items-center justify-center overflow-hidden px-6"
    >
      {/* Pipeline runs wider + crisper + a touch brighter than the other backdrops so
          the flowing connector animation is easy to read. */}
      <SectionBackdrop maxW="max-w-[1700px]" blurClass="blur-[1px]" opacityClass="opacity-[0.31]">
        <PipelineBackdrop className="h-full w-full" />
      </SectionBackdrop>

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
    </section>
  );
}
