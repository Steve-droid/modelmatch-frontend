import { useEffect, useRef, type ReactNode } from "react";

/** Move keyboard focus off the removed page without scrolling the destination. */
export function PageSurface({ name, children }: { name: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return <div ref={ref} tabIndex={-1} role="region" aria-label={name} className="page-surface">{children}</div>;
}
