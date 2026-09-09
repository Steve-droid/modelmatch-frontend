import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleSignIn } from "../GoogleSignIn";
import { Login } from "../../pages/Login";
import { Register } from "../../pages/Register";
import { ApiError, getToken } from "../../api/client";
import { googleChallenge, googleConfig, googleLogin, loadGoogleIdentity, type GoogleIdentity } from "../../api/google";

vi.mock("../../api/google", () => ({
  googleConfig: vi.fn(), googleChallenge: vi.fn(), googleLogin: vi.fn(), loadGoogleIdentity: vi.fn(),
}));
let callback: (response: { credential: string }) => void;
const identity: GoogleIdentity = {
  initialize: vi.fn((options) => { callback = options.callback; }),
  renderButton: vi.fn((host) => {
    const button = document.createElement("button");
    button.textContent = "Continue with Google";
    button.onclick = () => callback({ credential: "google-signed-credential" });
    host.appendChild(button);
  }),
};
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(googleConfig).mockResolvedValue({ enabled: true });
  vi.mocked(googleChallenge).mockResolvedValue({ clientId: "client", nonce: "nonce", challenge: "challenge" });
  vi.mocked(loadGoogleIdentity).mockResolvedValue(identity);
  vi.mocked(googleLogin).mockResolvedValue({ accessToken: "app-token", tokenType: "bearer" });
});

describe("Google sign-in", () => {
  it.each(["login", "registration"])("signs in from the %s screen with a normal app session", async (page) => {
    const onAuthed = vi.fn();
    render(page === "login" ? <Login onAuthed={onAuthed} onRegister={vi.fn()} /> :
      <Register onAuthed={onAuthed} onSignIn={vi.fn()} />);
    fireEvent.click(await screen.findByText("Continue with Google"));
    await waitFor(() => expect(onAuthed).toHaveBeenCalledOnce());
    expect(googleLogin).toHaveBeenCalledWith("google-signed-credential", "challenge");
    expect(identity.initialize).toHaveBeenCalledWith(expect.objectContaining({ nonce: "nonce", auto_select: false }));
    expect(getToken()).toBe("app-token");
  });
  it("does not load Google when disabled", async () => {
    vi.mocked(googleConfig).mockResolvedValue({ enabled: false });
    render(<GoogleSignIn onAuthed={vi.fn()} />);
    await waitFor(() => expect(googleConfig).toHaveBeenCalled());
    expect(loadGoogleIdentity).not.toHaveBeenCalled();
    expect(googleChallenge).not.toHaveBeenCalled();
    expect(screen.queryByText("Continue with Google")).not.toBeInTheDocument();
  });
  it("shows a recoverable SDK failure while password login stays usable", async () => {
    vi.mocked(loadGoogleIdentity).mockRejectedValueOnce(new Error("blocked"));
    render(<Login onAuthed={vi.fn()} onRegister={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("You can still use email and password");
    expect(screen.getByLabelText("Email")).toBeEnabled();
    fireEvent.click(screen.getByText("Retry Google sign-in"));
    expect(await screen.findByText("Continue with Google")).toBeVisible();
  });
  it("does not authenticate on an email collision and obtains a new challenge on retry", async () => {
    vi.mocked(googleLogin).mockRejectedValueOnce(new ApiError(409, "Sign in with your existing method."));
    const onAuthed = vi.fn();
    render(<GoogleSignIn onAuthed={onAuthed} />);
    fireEvent.click(await screen.findByText("Continue with Google"));
    expect(await screen.findByRole("alert")).toHaveTextContent("existing method");
    expect(getToken()).toBeNull();
    expect(onAuthed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Retry Google sign-in"));
    await waitFor(() => expect(googleChallenge).toHaveBeenCalledTimes(2));
  });
  it("ignores repeated callbacks and a completion after unmount", async () => {
    let resolve!: (value: { accessToken: string; tokenType: string }) => void;
    vi.mocked(googleLogin).mockReturnValue(new Promise((done) => { resolve = done; }));
    const onAuthed = vi.fn();
    const { unmount } = render(<GoogleSignIn onAuthed={onAuthed} />);
    fireEvent.click(await screen.findByText("Continue with Google"));
    act(() => callback({ credential: "duplicate" }));
    expect(googleLogin).toHaveBeenCalledOnce();
    unmount();
    await act(async () => resolve({ accessToken: "late-token", tokenType: "bearer" }));
    expect(getToken()).toBeNull();
    expect(onAuthed).not.toHaveBeenCalled();
  });
});
