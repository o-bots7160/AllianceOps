'use client';

import { useCallback } from 'react';
import { usePersistentState } from './use-persistent-state';
import type { RecentSearch } from '../components/team-combobox';

const RECENT_KEY = 'allianceops-recent-teams';
const MAX_RECENT = 5;

/**
 * Manages recent team searches backed by `usePersistentState` (localStorage).
 * Replaces the manual load/add pattern with a reactive, SSR-safe hook.
 */
export function useRecentSearches() {
  const [searches, setSearches] = usePersistentState<RecentSearch[]>(RECENT_KEY, []);

  const addSearch = useCallback(
    (teamNumber: number, name?: string) => {
      setSearches((prev) => {
        const now = new Date().toISOString();
        const existing = prev.find((r) => r.teamNumber === teamNumber);
        let updated: RecentSearch[];
        if (existing) {
          updated = prev.map((r) =>
            r.teamNumber === teamNumber
              ? { ...r, lastSearchedAt: now, ...(name !== undefined ? { name } : {}) }
              : r,
          );
        } else {
          updated = [{ teamNumber, name, lastSearchedAt: now }, ...prev].slice(0, MAX_RECENT);
        }
        return updated.sort((a, b) => b.lastSearchedAt.localeCompare(a.lastSearchedAt));
      });
    },
    [setSearches],
  );

  return { recentSearches: searches, addRecentSearch: addSearch } as const;
}
