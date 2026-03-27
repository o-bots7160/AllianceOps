'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(onStoreChange: () => void): () => void {
  return onStoreChange;
}

function getSnapshot(): boolean {
  return true;
}

/** Returns `true` on the client after hydration, `false` during SSR. */
function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function readStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently ignore.
  }
}

/**
 * A generic, SSR-safe hook that persists state to `localStorage`.
 *
 * Returns `[value, setValue, hydrated]` where `hydrated` is `true` once the
 * real value has been read from storage (avoids flash-of-default on the client).
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const isClient = useIsClient();
  const [value, setValueRaw] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once we know we're on the client.
  useEffect(() => {
    if (!isClient) return;
    setValueRaw(readStorage(key, defaultValue));
    setHydrated(true);
    // Only run when the key changes (defaultValue is the fallback, not a dep).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isClient]);

  // Sync across tabs via the storage event.
  useEffect(() => {
    if (!isClient) return;

    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      setValueRaw(e.newValue === null ? defaultValue : readStorage(key, defaultValue));
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isClient]);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValueRaw((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        writeStorage(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, setValue, hydrated];
}
