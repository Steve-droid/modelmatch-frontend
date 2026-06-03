// Runtime config. In production nginx serves a /config.js (templated from env at
// container start) that sets window.__APP_CONFIG__; in dev we fall back to Vite's
// import.meta.env. Nothing about the API URL is baked into the build.

export interface AppConfig {
  apiBaseUrl: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

export const config: AppConfig = {
  apiBaseUrl:
    window.__APP_CONFIG__?.apiBaseUrl ??
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    "http://localhost:8000",
};
