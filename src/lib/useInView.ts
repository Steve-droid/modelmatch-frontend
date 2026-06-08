import { useEffect, useRef, useState } from "react";

// Reveal-on-scroll hook: returns a ref to attach to a section and whether it has
// entered the viewport at least once. Used by the home sections for a subtle fade/rise
// as you scroll through the pitch — no animation library, just IntersectionObserver
// (design rule: motion useful, not heavy). Once seen it stays revealed, so scrolling
// back up doesn't re-hide content.
export function useInView<T extends Element = HTMLElement>(
  options: IntersectionObserverInit = { threshold: 0.25 },
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Environments without IntersectionObserver (e.g. jsdom in tests) just reveal
    // immediately rather than leaving sections invisible.
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect(); // reveal once, then stop observing
          break;
        }
      }
    }, options);
    obs.observe(el);
    return () => obs.disconnect();
    // options is treated as stable (callers pass a literal); re-running on identity
    // changes would needlessly reset the observer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, inView];
}
