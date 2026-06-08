import { useCallback, useState } from "react";
import { clearToken, getToken } from "./api/client";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";

// Top-level auth gate (no router yet — token presence picks the screen). A 401 from
// any data call bubbles up here via onUnauthorized: clear the token → back to Login.
export function App() {
  const [authed, setAuthed] = useState(() => getToken() !== null);

  const handleUnauthorized = useCallback(() => {
    clearToken();
    setAuthed(false);
  }, []);

  if (!authed) return <Login onAuthed={() => setAuthed(true)} />;
  return <Dashboard onUnauthorized={handleUnauthorized} />;
}
