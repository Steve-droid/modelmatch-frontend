import { ChevronDown, GitPullRequest } from "lucide-react";
import { useInView } from "../../lib/useInView";
import { VALUE_PROP } from "../../lib/valueProp";
import { HowItWorksFlow } from "./HowItWorksFlow";
import { SectionBackdrop } from "./SectionBackdrop";
import { SavingsCurveBackdrop } from "./SavingsCurveBackdrop";
import markUrl from "../../assets/brand/modelmatch-mark.svg";

// Section 1 — the hero. The value prop is the first thing you read. A subtle fade/rise
// on scroll-in (useInView); a chevron cues the two sections below.
export function WelcomeSection({ id, onScrollNext }: { id: string; onScrollNext: () => void }) {
  const [ref, inView] = useInView<HTMLElement>();

  return (
    <section
      id={id}
      ref={ref}
      className="relative flex min-h-full snap-start flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      <SectionBackdrop>
        <SavingsCurveBackdrop className="h-full w-full" />
      </SectionBackdrop>

      <div
        className={`relative z-10 flex max-w-3xl flex-col items-center transition-all duration-700 ease-out lg:max-w-5xl ${
          inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-panel lg:mb-8 lg:h-16 lg:w-16">
          <img src={markUrl} alt="ModelMatch" className="h-6 w-6 lg:h-8 lg:w-8" />
        </span>

        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-signal/30 bg-signal/10 px-3 py-1 text-xs font-medium text-signal lg:mb-7 lg:px-3.5 lg:py-1.5 lg:text-sm">
          <GitPullRequest size={13} />
          AI code review for your CI
        </span>

        <h1 className="text-balance text-3xl font-semibold tracking-tight text-gray-50 sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
          {VALUE_PROP.headline}
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-base leading-relaxed text-muted sm:text-lg lg:mt-7 lg:max-w-3xl lg:text-xl">
          {VALUE_PROP.sub}
        </p>
        <div className="mt-10 lg:mt-14">
          <HowItWorksFlow active={inView} />
        </div>
      </div>

      <button
        onClick={onScrollNext}
        aria-label="Scroll to get started"
        className={`relative z-10 mt-14 flex flex-col items-center gap-1 text-faint transition-all duration-700 ease-out hover:text-muted lg:mt-20 ${
          inView ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="text-xs font-medium">Get started</span>
        <ChevronDown size={18} className="animate-bounce" />
      </button>
    </section>
  );
}
