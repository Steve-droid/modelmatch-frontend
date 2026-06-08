import { useState } from "react";
import { ChevronRight, Database, Coins, FileText } from "lucide-react";
import type { RetrievalTrace } from "../types/chat";

// How each grounding `kind` renders: a label + a small accent dot/icon. Accent
// semantics from the design language — cyan/signal = model·catalog data, green =
// banked-spend snapshot. Unknown kinds degrade to a neutral faint dot.
const KIND_META: Record<string, { label: string; dot: string; Icon: typeof Coins }> =
  {
    savings: { label: "Spend snapshot", dot: "bg-banked", Icon: Coins },
    benchmark_result: { label: "Catalog row", dot: "bg-signal", Icon: Database },
  };

function metaFor(kind: string) {
  return KIND_META[kind] ?? { label: kind, dot: "bg-faint", Icon: FileText };
}

// A quiet, collapsible "Grounded on N source(s)" disclosure under an assistant
// answer. Shows only the human-readable kind/ref/snippet — never raw SQL or debug.
export function RetrievalTraceDetail({ trace }: { trace: RetrievalTrace[] }) {
  const [open, setOpen] = useState(false);
  if (trace.length === 0) return null;

  return (
    <div className="mt-2 border-t border-border/60 pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1 text-xs font-medium text-faint transition-colors hover:text-muted"
      >
        <ChevronRight
          size={12}
          className={`transition-transform ${open ? "rotate-90" : ""}`}
        />
        Grounded on {trace.length} source{trace.length === 1 ? "" : "s"}
      </button>

      {open && (
        <ul className="mt-1.5 flex flex-col gap-1.5">
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
                    <span className="block text-faint">{t.snippet}</span>
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
