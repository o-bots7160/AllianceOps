const ENV_API_URL = process.env.NEXT_PUBLIC_API_URL;

export function getApiBase(): string {
  if (ENV_API_URL) return ENV_API_URL;
  // Always use a relative path so requests go through the current origin.
  // In production this is the SWA proxy; in dev this is SWA CLI (port 4280)
  // which injects x-ms-client-principal headers. Never call the Function App
  // directly — that bypasses auth. See ADR 017.
  return '/api';
}
