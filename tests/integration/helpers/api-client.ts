/**
 * Typed fetch wrapper for the Function App under test.
 * Reads API_BASE_URL from env and provides convenient methods for all HTTP verbs.
 */

import { type AuthPersona, authAs, anonymous } from './auth';

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
  headers: Headers;
}

function getBaseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error('API_BASE_URL environment variable is not set');
  }
  return url.replace(/\/$/, '');
}

async function request<T = unknown>(
  method: string,
  path: string,
  options?: {
    persona?: AuthPersona;
    body?: unknown;
    headers?: Record<string, string>;
  },
): Promise<ApiResponse<T>> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  // Inject auth headers if a persona is provided
  if (options?.persona) {
    const authHeaders = authAs(options.persona);
    Object.assign(headers, authHeaders);
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (options?.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);

  let body: T;
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    try {
      body = (await response.json()) as T;
    } catch {
      body = null as T;
    }
  } else {
    body = (await response.text()) as T;
  }

  return {
    status: response.status,
    body,
    headers: response.headers,
  };
}

/** GET request */
export function get<T = unknown>(
  path: string,
  persona?: AuthPersona,
  headers?: Record<string, string>,
): Promise<ApiResponse<T>> {
  return request<T>('GET', path, { persona, headers });
}

/** POST request */
export function post<T = unknown>(
  path: string,
  body?: unknown,
  persona?: AuthPersona,
  headers?: Record<string, string>,
): Promise<ApiResponse<T>> {
  return request<T>('POST', path, { persona, body, headers });
}

/** PUT request */
export function put<T = unknown>(
  path: string,
  body?: unknown,
  persona?: AuthPersona,
  headers?: Record<string, string>,
): Promise<ApiResponse<T>> {
  return request<T>('PUT', path, { persona, body, headers });
}

/** DELETE request */
export function del<T = unknown>(
  path: string,
  persona?: AuthPersona,
  headers?: Record<string, string>,
): Promise<ApiResponse<T>> {
  return request<T>('DELETE', path, { persona, headers });
}

/** POST with raw headers (no persona) — useful for malformed auth tests */
export function rawPost<T = unknown>(
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<ApiResponse<T>> {
  return request<T>('POST', path, { body, headers });
}

/** GET with raw headers (no persona) — useful for anonymous/malformed auth tests */
export function rawGet<T = unknown>(
  path: string,
  headers?: Record<string, string>,
): Promise<ApiResponse<T>> {
  return request<T>('GET', path, { headers });
}

export { anonymous };
