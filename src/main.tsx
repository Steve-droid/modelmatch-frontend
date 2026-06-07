import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import { Dashboard } from "./pages/Dashboard";

// S14: the savings dashboard is the first real screen. Routing + login land in S15;
// for now the app boots straight into the dashboard (project from ?project=).
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>,
);
