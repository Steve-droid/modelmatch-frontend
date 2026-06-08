// Auth API calls. login() exchanges credentials for a JWT, which the caller persists
// via setToken (the rest of the app reads it from localStorage on every request).

import { apiPost } from "./client";
import type { TokenResponse } from "../types/auth";

export function login(email: string, password: string): Promise<TokenResponse> {
  return apiPost<TokenResponse>("/auth/login", { email, password });
}
