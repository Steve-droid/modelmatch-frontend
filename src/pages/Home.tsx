import { useEffect, useRef, useState } from "react";
import { WelcomeSection } from "../components/home/WelcomeSection";
import { AgentsSection } from "../components/home/AgentsSection";
import { CreateAgentSection } from "../components/home/CreateAgentSection";
import markUrl from "../assets/brand/modelmatch-mark.svg";

// The post-login hub (App phase "home"): a single scroll-snap page with three
// full-height sections — Welcome (value prop) → View my agents → Create a new agent.
// The default landing after sign-in; the dashboard/onboarding headers' logo returns
// here. Frontend-only; carries the project list down purely to drive the empty-state
// nudge (0 agents → "create your first").
const SECTIONS = [
  { id: "home-welcome", label: "Welcome" },
  { id: "home-agents", label: "CI-Agents" },
  { id: "home-create", label: "Create" },
] as const;

export function Home({
  agentCount,
  onViewAgents,
  onCreateAgent,
}: {
  agentCount: number;
  onViewAgents: () => void;
  onCreateAgent: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
  const hasAgents = agentCount > 0;

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  // Track which section is centred so the dot-nav highlights it. Observes against the
  // scroll container (not the viewport) since the page scrolls inside it.
  useEffect(() => {
    const root = scrollRef.current;
    if (root == null || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveId(e.target.id);
      },
      { root, threshold: 0.6 },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, []);

  return (
    <div className="relative h-full">
      {/* fixed brand mark (top-left) — clicking it scrolls back to the top section */}
      <button
        onClick={() => scrollTo(SECTIONS[0].id)}
        className="fixed left-5 top-5 z-20 flex items-center gap-2.5 rounded-md px-1 py-1 text-left transition-opacity hover:opacity-80"
        aria-label="Back to top"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-panel">
          <img src={markUrl} alt="ModelMatch" className="h-4 w-4" />
        </span>
        <span className="font-semibold tracking-tight">ModelMatch</span>
      </button>

      {/* right-side section dots */}
      <nav
        aria-label="Sections"
        className="fixed right-5 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 sm:flex"
      >
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            aria-label={s.label}
            aria-current={activeId === s.id}
            className={`h-2.5 w-2.5 rounded-full border transition-colors ${
              activeId === s.id
                ? "border-signal bg-signal"
                : "border-border bg-transparent hover:border-muted"
            }`}
          />
        ))}
      </nav>

      <div
        ref={scrollRef}
        className="h-full snap-y snap-mandatory overflow-y-auto scroll-smooth"
      >
        <WelcomeSection id={SECTIONS[0].id} onScrollNext={() => scrollTo(SECTIONS[1].id)} />
        <AgentsSection
          id={SECTIONS[1].id}
          hasAgents={hasAgents}
          agentCount={agentCount}
          onViewAgents={onViewAgents}
          onCreateAgent={onCreateAgent}
        />
        <CreateAgentSection id={SECTIONS[2].id} onCreateAgent={onCreateAgent} />
      </div>
    </div>
  );
}
