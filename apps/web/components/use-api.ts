'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiBase } from '../lib/api-base';

interface ApiResponse<T> {
  data: T;
  meta: {
    lastRefresh: string;
    stale: boolean;
    ttlClass: string;
  };
}

/** Custom error that carries the HTTP status and optional Retry-After value. */
class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfter: number | null,
  ) {
    super(`API error: ${status}`);
    this.name = 'ApiError';
  }

  get retryable(): boolean {
    return this.status === 503 || this.status === 429;
  }
}

/** Maximum number of automatic retries for retryable errors (503, 429). */
const MAX_RETRIES = 3;
/** Default backoff in ms when no Retry-After header is present. */
const DEFAULT_BACKOFF_MS = 2000;

/**
 * In-flight request deduplication.
 * When multiple components request the same path simultaneously,
 * only one fetch fires and the result is shared.
 */
const inflight = new Map<string, Promise<ApiResponse<unknown>>>();

function fetchOnce<T>(url: string): Promise<ApiResponse<T>> {
  return fetch(url, { redirect: 'manual' }).then(async (response) => {
    if (response.type === 'opaqueredirect' || response.status === 302) {
      throw new Error('Authentication required');
    }
    if (!response.ok) {
      const retryHeader = response.headers.get('Retry-After');
      const retryAfter = retryHeader ? parseInt(retryHeader, 10) * 1000 : null;
      throw new ApiError(response.status, retryAfter);
    }
    return response.json() as Promise<ApiResponse<T>>;
  });
}

async function fetchWithRetry<T>(url: string): Promise<ApiResponse<T>> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchOnce<T>(url);
    } catch (err) {
      lastError = err;
      const isRetryable = err instanceof ApiError && err.retryable;
      if (!isRetryable || attempt === MAX_RETRIES) break;
      const delay = err.retryAfter ?? DEFAULT_BACKOFF_MS * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

function fetchShared<T>(path: string): Promise<ApiResponse<T>> {
  const url = `${getApiBase()}/${path}`;

  const existing = inflight.get(path);
  if (existing) return existing as Promise<ApiResponse<T>>;

  const promise = fetchWithRetry<T>(url);

  // Store the promise and clean up when it settles
  inflight.set(path, promise as Promise<ApiResponse<unknown>>);
  promise.finally(() => inflight.delete(path));

  return promise;
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ApiResponse<T>['meta'] | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!path) return;

    // Abort any previous in-progress fetch for this hook instance
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await fetchShared<T>(path);
      // Don't update state if this hook instance was aborted (unmounted or path changed)
      if (controller.signal.aborted) return;
      setData(result.data);
      setMeta(result.meta);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [path]);

  useEffect(() => {
    // Clear stale data immediately when the API path changes
    setData(null);
    setMeta(null);
    setError(null);
    if (!path) {
      setLoading(false);
      return;
    }
    fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [path, fetchData]);

  return { data, loading, error, meta, refetch: fetchData };
}
