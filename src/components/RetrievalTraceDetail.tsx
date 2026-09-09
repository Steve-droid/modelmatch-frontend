import { useId, useState } from "react";
import { ChevronRight, Database, Coins, FileText } from "lucide-react";
import type { RetrievalTrace } from "../types/chat";

// How each grounding `kind` renders: a label + a small dot/icon. Blue (the accent) =
// model·catalog data, green = banked-spend snapshot. Unknown kinds degrade to a
// neutral faint dot.
const KIND_META: Record<string, { label: string; dot: string; Icon: typeof Coins }> =
  {
    savings: { label: "Spend snapshot", dot: "bg-banked", Icon: Coins },
    benchmark_result: { label: "Catalog row", dot: "bg-accent", Icon: Database },
  };

function metaFor(kind: string) {
  return KIND_META[kind] ?? { label: kind, dot: "bg-faint", Icon: FileText };
}

// The source count stays visible; lengthy evidence opens only on an explicit click.
export function RetrievalTraceDetail({ trace }: { trace: RetrievalTrace[] }) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  if (trace.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border/60 pt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={detailId}
        className="flex items-center gap-1.5 rounded text-xs font-medium text-signal transition-colors hover:text-muted"
      >
        <ChevronRight
          size={12}
          className={`transition-transform ${open ? "rotate-90" : ""}`}
        />
        Grounded on {trace.length} source{trace.length === 1 ? "" : "s"}
      </button>

      {open && (
        <ul id={detailId} className="mt-3 flex flex-col gap-3 leading-relaxed">
          {trace.map((t, i) => {
            const { label, dot, Icon } = metaFor(t.kind);
            return (
              <li key={`${t.ref}-${i}`} className="flex items-start gap-2 text-xs">
                <span
                  className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
                  aria-hidden
                />
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 text-muted">
                    <Icon size={11} className="text-faint" />
                    {label}
                  </span>
                  {t.snippet && (
                    <span className="mt-1 block break-words text-muted">{t.snippet}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
