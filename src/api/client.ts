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

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
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

// Turn a non-2xx response into an ApiError carrying the backend's `detail` (if any).
// A FastAPI 422 `detail` is an ARRAY of validation errors ({ type, loc, msg }) — join
// their `.msg` fields into one readable string; a plain string `detail` (e.g. a login
// 401) is used as-is.
async function toApiError(res: Response): Promise<ApiError> {
  let detail = res.statusText;
  try {
    const body = await res.json();
    if (Array.isArray(body?.detail)) {
      const msg = body.detail
        .map((d: { msg?: string }) => d?.msg)
        .filter(Boolean)
        .join("; ");
      if (msg) detail = msg;
    } else if (body?.detail) {
      detail = body.detail;
    }
  } catch {
    /* non-JSON error body — keep the status text */
  }
  return new ApiError(res.status, detail);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Generic GET: `<T>` is the expected response shape — the caller names it
// (e.g. apiGet<SavingsResponse>(...)) and gets a typed result back.
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

// Generic POST: JSON body + Bearer auth, same ApiError contract as apiGet.
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiSend<T>("POST", path, body);
}

// Generic PUT (e.g. connect Jenkins): same contract as apiPost.
export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiSend<T>("PUT", path, body);
}

// Generic PATCH (e.g. edit/re-pick a project): same contract as apiPost.
export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiSend<T>("PATCH", path, body);
}

async function apiSend<T>(
  method: "POST" | "PUT" | "PATCH",
  path: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

// DELETE: a 204 No Content carries no JSON body, so this resolves to void.
export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw await toApiError(res);
}
