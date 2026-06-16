// Auth API calls. login() exchanges credentials for a JWT, which the caller persists
// via setToken (the rest of the app reads it from localStorage on every request).

import { apiPost } from "./client";
import type { RegisterResponse, TokenResponse } from "../types/auth";

export function login(email: string, password: string): Promise<TokenResponse> {
  return apiPost<TokenResponse>("/auth/login", { email, password });
}

// Create an account. Returns the new user (id + email) — NOT a token, so the caller
// logs in afterwards to get a JWT. 409 = email already registered; 422 = validation.
export function register(email: string, password: string): Promise<RegisterResponse> {
  return apiPost<RegisterResponse>("/auth/register", { email, password });
}
