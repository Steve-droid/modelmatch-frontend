import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import { App } from "./App";

// S15: an auth gate now fronts the app — Login → savings dashboard + grounded chat,
// with a project switcher. The token lives in localStorage (mm_token).
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
