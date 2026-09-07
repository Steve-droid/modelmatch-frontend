import { ArrowRight, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import { useInView } from "../../lib/useInView";
import { ModelNamesBackdrop } from "./ModelNamesBackdrop";

// Section 3 — "Create a new agent" → the onboarding/create-project flow. Three quick
// "what you'll do" beats so the CTA isn't bare, kept on-brand and compact.
const STEPS = [
  { icon: Sparkles, label: "Get matched", text: "Ranked on CodeReviewBench, the public benchmark for CI code-review models. No LLM in the ranking." },
  { icon: Gauge, label: "Run in CI", text: "Drop the stage into your Jenkins; it reviews every pull request." },
  { icon: ShieldCheck, label: "Monitor your savings", text: "Save vs a premium baseline, counted only when quality holds." },
] as const;

export function CreateAgentSection({ id, onCreateAgent }: { id: string; onCreateAgent: () => void }) {
  const [ref, inView] = useInView<HTMLElement>();

  return (
    <section
      id={id}
      ref={ref}
      className="relative flex min-h-full snap-start flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      <ModelNamesBackdrop />

      <div
        className={`relative z-10 flex w-full max-w-3xl flex-col items-center transition-all duration-700 ease-out lg:max-w-5xl xl:max-w-6xl ${
          inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent lg:mb-7 lg:px-3.5 lg:py-1.5 lg:text-sm">
          <Sparkles size={13} />
          Get set up
        </span>
        <h2 className="text-balance text-2xl font-semibold tracking-tight text-gray-50 sm:text-3xl lg:text-4xl xl:text-5xl">
          Create a new CI-Agent
        </h2>
        <p className="mt-4 max-w-xl text-balance text-base leading-relaxed text-muted lg:mt-5 lg:max-w-2xl lg:text-lg">
          Answer a few questions about your CI and ModelMatch sets up a code-review agent in
          three steps.
        </p>

        <div className="mt-9 grid w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:mt-12 lg:gap-5">
          {STEPS.map(({ icon: Icon, label, text }) => (
            <div key={label} className="card flex flex-col items-start gap-2 text-left lg:gap-3 lg:p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-panel-2 text-signal lg:h-10 lg:w-10">
                <Icon size={16} />
              </span>
              <div className="text-sm font-semibold text-gray-100 lg:text-base">{label}</div>
              <div className="text-xs leading-relaxed text-muted lg:text-sm">{text}</div>
            </div>
          ))}
        </div>

        <button
          onClick={onCreateAgent}
          className="mt-9 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 lg:mt-12 lg:px-5 lg:py-3 lg:text-base"
        >
          <Sparkles size={16} />
          Create a new CI-Agent
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
