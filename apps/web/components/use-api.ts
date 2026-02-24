'use client';

import { useState, useEffect, useCallback } from 'react';
import { getApiBase } from '../lib/api-base';

interface ApiResponse<T> {
  data: T;
  meta: {
    lastRefresh: string;
    stale: boolean;
    ttlClass: string;
  };
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ApiResponse<T>['meta'] | null>(null);

  const fetchData = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiBase()}/${path}`, { redirect: 'manual' });
      if (response.type === 'opaqueredirect' || response.status === 302) {
        throw new Error('Authentication required');
      }
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const result: ApiResponse<T> = await response.json();
      setData(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, meta, refetch: fetchData };
}
