import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";

type Motion = "rise" | "forward" | "back";
// Local shape also compiles with TS DOM versions predating ViewTransition.
type Transition = { skipTransition: () => void; finished: Promise<void>; ready: Promise<void> };
type TransitionDocument = Document & { startViewTransition?: (update: () => void) => Transition };

export function usePageTransition() {
  const active = useRef<Transition | null>(null);
  const revision = useRef(0);
  const cancel = useCallback(() => {
    revision.current += 1;
    active.current?.skipTransition();
    active.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);

  const transition = useCallback((update: () => void, motion: Motion = "rise") => {
    cancel();
    const current = revision.current;
    const doc = document as TransitionDocument;
    if (!doc.startViewTransition || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      update();
      return;
    }
    document.documentElement.dataset.navigation = motion;
    const next = doc.startViewTransition(() => {
      // A skipped snapshot's callback can still fire. Invalidate it on a newer
      // navigation or auth expiry so it cannot resurrect an obsolete page.
      if (revision.current === current) flushSync(update);
    });
    active.current = next;
    void next.ready.catch(() => { /* Snapshot skipped; the DOM update still runs. */ });
    void next.finished.catch(() => {}).finally(() => {
      if (active.current === next) active.current = null;
    });
  }, [cancel]);

  return { transition, cancel };
}
