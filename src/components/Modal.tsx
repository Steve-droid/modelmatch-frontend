import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Minimal dark-theme modal: a dimmed backdrop + a centered panel. Closes on Escape or
// backdrop click. Used by the per-project actions (edit Jenkins / re-pick / delete).
//
// Rendered through a portal to <body>: the dashboard header (where the actions menu
// lives) used to use `backdrop-blur`, and a `backdrop-filter` ancestor becomes the containing
// block for `position: fixed` descendants AND its own stacking context. Without the
// portal the "fixed inset-0" overlay was clamped to the thin header box and painted
// under the dashboard cards. Portaling to <body> escapes both, so the overlay truly
// covers the viewport above everything.
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="mt-8 w-full max-w-2xl rounded-2xl border border-border bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-muted transition-colors hover:text-fg"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
