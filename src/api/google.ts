import { apiGet, apiPost } from "./client";
import type { TokenResponse } from "../types/auth";

export interface GoogleChallenge {
  clientId: string;
  nonce: string;
  challenge: string;
}
export const googleConfig = () => apiGet<{ enabled: boolean }>("/auth/google/config");
export const googleChallenge = () => apiPost<GoogleChallenge>("/auth/google/challenge", {});
export const googleLogin = (credential: string, challenge: string) =>
  apiPost<TokenResponse>("/auth/google", { credential, challenge });

export interface GoogleIdentity {
  initialize: (options: {
    client_id: string;
    nonce: string;
    auto_select: boolean;
    callback: (response: { credential: string }) => void;
  }) => void;
  renderButton: (element: HTMLElement, options: {
    type: "standard"; theme: "outline"; size: "large"; text: "continue_with";
  }) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}

let loading: Promise<GoogleIdentity> | undefined;
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;
  loading = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      loading = undefined;
      reject(new Error("Google sign-in could not load."));
    };
    const timer = window.setTimeout(fail, 15000);
    script.onerror = fail;
    script.onload = () => {
      clearTimeout(timer);
      if (window.google?.accounts.id) resolve(window.google.accounts.id);
      else fail();
    };
    document.head.appendChild(script);
  });
  return loading;
}
