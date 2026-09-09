// In dev, src/config.ts reads VITE_API_BASE_URL (or its localhost default).
// Production replaces this file from API_BASE_URL in the container entrypoint.
window.__APP_CONFIG__ = {};
