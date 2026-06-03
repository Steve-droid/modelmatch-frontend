import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Stub entrypoint — minimal runnable scaffold so the first feature story has
// something to extend. The real app (routing, pages, Tailwind, Recharts,
// env-driven config, dark-mode dashboard, chat panel) lands with S1 onward.

function App() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>ModelMatch</h1>
      <p>Frontend scaffold (v0.0.1). Real UI lands with story S1 onward.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
