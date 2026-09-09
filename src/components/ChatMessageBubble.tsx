import { AlertTriangle, Clock } from "lucide-react";
import type { ChatRole, RetrievalTrace } from "../types/chat";
import { RetrievalTraceDetail } from "./RetrievalTraceDetail";

// A message can be a real turn ("answer") or a local-only system line: an amber
// "notice" (e.g. the 429 rate-limit) or a red "error". Notices/errors recolour the
// assistant surface so they read as status, consistent with the dashboard's semantics.
export type BubbleVariant = "answer" | "notice" | "error";

export interface BubbleProps {
  role: ChatRole;
  text: string | null;
  trace?: RetrievalTrace[];
  variant?: BubbleVariant;
}

// P38 F4 — the panel reads as a tool, not a chat widget: a user turn is a plain
// left-aligned query line (mono "›" prefix, no bubble, no accent surface); an
// assistant turn is a flat panel with its grounding under it.
export function ChatMessageBubble({
  role,
  text,
  trace = [],
  variant = "answer",
}: BubbleProps) {
  if (role === "user") {
    return (
      <p className="flex gap-2 text-sm leading-relaxed text-fg">
        <span className="num shrink-0 text-accent" aria-hidden>
          ›
        </span>
        <span className="whitespace-pre-wrap break-words">{text}</span>
      </p>
    );
  }

  const surface =
    variant === "notice"
      ? "border-unrated/40 bg-unrated/10 text-unrated"
      : variant === "error"
        ? "border-risk/40 bg-risk/10 text-risk"
        : "border-border/60 bg-canvas/20 text-gray-300";

  return (
    <div className={`rounded-xl border px-4 py-4 text-sm leading-7 ${surface}`}>
      {variant !== "answer" && (
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide">
          {variant === "notice" ? <Clock size={11} /> : <AlertTriangle size={11} />}
          Notice
        </div>
      )}
      <p className="whitespace-pre-wrap break-words">{text}</p>
      {variant === "answer" && (
        <RetrievalTraceDetail trace={trace} />
      )}
    </div>
  );
}
