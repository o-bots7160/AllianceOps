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

/**
 * In-flight request deduplication.
 * When multiple components request the same path simultaneously,
 * only one fetch fires and the result is shared.
 */
const inflight = new Map<string, Promise<ApiResponse<unknown>>>();

function fetchShared<T>(path: string): Promise<ApiResponse<T>> {
  const url = `${getApiBase()}/${path}`;

  const existing = inflight.get(path);
  if (existing) return existing as Promise<ApiResponse<T>>;

  const promise = fetch(url, { redirect: 'manual' }).then(async (response) => {
    if (response.type === 'opaqueredirect' || response.status === 302) {
      throw new Error('Authentication required');
    }
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json() as Promise<ApiResponse<T>>;
  });

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
    fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData]);

  return { data, loading, error, meta, refetch: fetchData };
}
