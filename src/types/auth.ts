// Mirrors the backend's TokenOut DTO (app/schemas/auth.py; camelCase out).

export interface TokenResponse {
  accessToken: string;
  tokenType: string; // "bearer"
}
