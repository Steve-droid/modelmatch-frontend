// Mirrors the backend's TokenOut DTO (app/schemas/auth.py; camelCase out).

export interface TokenResponse {
  accessToken: string;
  tokenType: string; // "bearer"
}

// Mirrors the backend's UserOut DTO returned by POST /auth/register (201; camelCase out).
// Note: register does NOT return a token — the caller logs in afterwards to get one.
export interface RegisterResponse {
  id: number;
  email: string;
  chatEnabled: boolean;
}
