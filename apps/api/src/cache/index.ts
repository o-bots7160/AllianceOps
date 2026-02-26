import { trackCacheMetric } from '../lib/telemetry.js';

export type TTLClass = 'STATIC' | 'SEMI_STATIC' | 'LIVE';

const TTL_MS: Record<TTLClass, number> = {
  STATIC: 60 * 60 * 1000, // 1 hour
  SEMI_STATIC: 5 * 60 * 1000, // 5 minutes
  LIVE: 60 * 1000, // 60 seconds
};

/** Maximum number of entries before LRU eviction kicks in. */
const MAX_CACHE_SIZE = 500;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlClass: TTLClass;
  lastAccessed: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** In-flight request deduplication: coalesces concurrent fetchers for the same key. */
const inflight = new Map<string, Promise<unknown>>();

export interface CacheMeta {
  lastRefresh: string;
  stale: boolean;
  ttlClass: TTLClass;
}

export interface CachedResponse<T> {
  data: T;
  meta: CacheMeta;
}

/** Evict the least-recently-accessed entries when the cache exceeds MAX_CACHE_SIZE. */
function evictIfNeeded(): void {
  if (store.size <= MAX_CACHE_SIZE) return;

  const entries = [...store.entries()].sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
  const toEvict = entries.slice(0, store.size - MAX_CACHE_SIZE);
  for (const [key] of toEvict) {
    store.delete(key);
  }
}

export async function cached<T>(
  key: string,
  ttlClass: TTLClass,
  fetcher: () => Promise<T>,
): Promise<CachedResponse<T>> {
  const existing = store.get(key) as CacheEntry<T> | undefined;
  const now = Date.now();

  if (existing && now - existing.timestamp < TTL_MS[existing.ttlClass]) {
    existing.lastAccessed = now;
    trackCacheMetric(true, key);
    return {
      data: existing.data,
      meta: {
        lastRefresh: new Date(existing.timestamp).toISOString(),
        stale: false,
        ttlClass: existing.ttlClass,
      },
    };
  }

  trackCacheMetric(false, key);

  // Deduplicate concurrent requests for the same key
  const existingFlight = inflight.get(key);
  if (existingFlight) {
    const data = (await existingFlight) as T;
    const entry = store.get(key) as CacheEntry<T>;
    return {
      data,
      meta: {
        lastRefresh: new Date(entry?.timestamp ?? now).toISOString(),
        stale: false,
        ttlClass,
      },
    };
  }

  const fetchPromise = fetcher();
  inflight.set(key, fetchPromise);

  try {
    const data = await fetchPromise;
    store.set(key, { data, timestamp: now, ttlClass, lastAccessed: now });
    evictIfNeeded();
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
  } finally {
    inflight.delete(key);
  }
}

export function clearCache(): void {
  store.clear();
  inflight.clear();
}
