// Typed fetch wrapper. Base URL comes from runtime config (never hardcoded); the JWT
// is read from localStorage and sent as `Authorization: Bearer`. Until the Login page
// lands (S15), the token is set out-of-band (a dev bootstrap / future login flow).

import { config } from "../config";

const TOKEN_KEY = "mm_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Raised for any non-2xx response, carrying the HTTP status so callers can branch. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Generic GET: `<T>` is the expected response shape — the caller names it
// (e.g. apiGet<SavingsResponse>(...)) and gets a typed result back.
export async function apiGet<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* non-JSON error body — keep the status text */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}
