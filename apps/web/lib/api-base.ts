const ENV_API_URL = process.env.NEXT_PUBLIC_API_URL;

export function getApiBase(): string {
  if (ENV_API_URL) return ENV_API_URL;
  if (process.env.NODE_ENV === 'development') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${host}:7071/api`;
  }
  return '/api';
}

export const IS_DEV = process.env.NODE_ENV === 'development';
export const IS_SWA_AUTH = process.env.NEXT_PUBLIC_AUTH_MODE === 'swa';
