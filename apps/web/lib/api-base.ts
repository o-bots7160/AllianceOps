const ENV_API_URL = process.env.NEXT_PUBLIC_API_URL;

export function getApiBase(): string {
  if (ENV_API_URL) return ENV_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api';
  }
  return 'http://localhost:7071/api';
}
