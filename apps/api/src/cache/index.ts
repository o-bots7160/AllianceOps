export type TTLClass = 'STATIC' | 'SEMI_STATIC' | 'LIVE';

const TTL_MS: Record<TTLClass, number> = {
  STATIC: 60 * 60 * 1000,      // 1 hour
  SEMI_STATIC: 5 * 60 * 1000,  // 5 minutes
  LIVE: 60 * 1000,              // 60 seconds
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlClass: TTLClass;
}

const store = new Map<string, CacheEntry<unknown>>();

export interface CacheMeta {
  lastRefresh: string;
  stale: boolean;
  ttlClass: TTLClass;
}

export interface CachedResponse<T> {
  data: T;
  meta: CacheMeta;
}

export async function cached<T>(
  key: string,
  ttlClass: TTLClass,
  fetcher: () => Promise<T>,
): Promise<CachedResponse<T>> {
  const existing = store.get(key) as CacheEntry<T> | undefined;
  const now = Date.now();

  if (existing && now - existing.timestamp < TTL_MS[existing.ttlClass]) {
    return {
      data: existing.data,
      meta: {
        lastRefresh: new Date(existing.timestamp).toISOString(),
        stale: false,
        ttlClass: existing.ttlClass,
      },
    };
  }

  try {
    const data = await fetcher();
    store.set(key, { data, timestamp: now, ttlClass });
    return {
      data,
      meta: {
        lastRefresh: new Date(now).toISOString(),
        stale: false,
        ttlClass,
      },
    };
  } catch (error) {
    // Degrade gracefully: return stale cache if available
    if (existing) {
      return {
        data: existing.data,
        meta: {
          lastRefresh: new Date(existing.timestamp).toISOString(),
          stale: true,
          ttlClass: existing.ttlClass,
        },
      };
    }
    throw error;
  }
}

export function clearCache(): void {
  store.clear();
}
