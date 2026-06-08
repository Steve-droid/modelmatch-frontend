import { AlertTriangle, Clock, Sparkles, User } from "lucide-react";
import type { ChatRole, RetrievalTrace } from "../types/chat";
import { RetrievalTraceDetail } from "./RetrievalTraceDetail";

// A message can be a real turn ("answer") or a local-only system line: an amber
// "notice" (e.g. the 429 rate-limit) or a red "error". Notices/errors never come
// from the server — they're how the panel speaks to the user in-thread.
export type BubbleVariant = "answer" | "notice" | "error";

export interface BubbleProps {
  role: ChatRole;
  text: string | null;
  trace?: RetrievalTrace[];
  variant?: BubbleVariant;
}

export function ChatMessageBubble({
  role,
  text,
  trace = [],
  variant = "answer",
}: BubbleProps) {
  const isUser = role === "user";

  // User turns sit right, accented; assistant turns sit left on a panel surface.
  // Notices/errors recolour the assistant surface (amber/red) so they read as
  // status, consistent with the dashboard's accent semantics.
  const surface = isUser
    ? "self-end bg-accent/15 border-accent/30 text-gray-100"
    : variant === "notice"
      ? "self-start bg-unrated/10 border-unrated/30 text-unrated"
      : variant === "error"
        ? "self-start bg-risk/10 border-risk/30 text-risk"
        : "self-start bg-panel-2 border-border text-gray-200";

  const Icon =
    variant === "notice"
      ? Clock
      : variant === "error"
        ? AlertTriangle
        : isUser
          ? User
          : Sparkles;

  return (
    <div
      className={`flex max-w-[88%] flex-col gap-1 rounded-lg border px-3 py-2 text-sm leading-relaxed animate-[fadeIn_120ms_ease-out] ${surface}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide opacity-70">
        <Icon size={11} />
        {isUser ? "You" : variant === "answer" ? "ModelMatch" : "Notice"}
      </div>
      <p className="whitespace-pre-wrap break-words">{text}</p>
      {!isUser && variant === "answer" && <RetrievalTraceDetail trace={trace} />}
    </div>
  );
}
