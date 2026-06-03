import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { config } from "./config";

// Stub entrypoint — minimal runnable scaffold so the first feature story has
// something to extend. The real app (routing, pages, Tailwind, Recharts,
// dark-mode dashboard, chat panel) lands with S14/S15. This S1 shell proves
// env-driven config and FE↔BE reachability.

type Health = "checking" | "ok" | "unreachable";

function App() {
  const [health, setHealth] = useState<Health>("checking");

  useEffect(() => {
    fetch(`${config.apiBaseUrl}/healthz`)
      .then((r) => setHealth(r.ok ? "ok" : "unreachable"))
      .catch(() => setHealth("unreachable"));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>ModelMatch</h1>
      <p>Frontend scaffold (v0.0.1). Real UI lands with story S14/S15.</p>
      <p>
        API base URL: <code>{config.apiBaseUrl}</code>
      </p>
      <p>
        Backend health: <strong>{health}</strong>
      </p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
