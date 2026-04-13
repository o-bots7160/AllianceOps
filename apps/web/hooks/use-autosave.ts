'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePersistentState } from './use-persistent-state';

interface UseAutosaveOptions {
  /** The save function to call */
  saveFn: () => Promise<void>;
  /** Whether there are unsaved changes */
  dirty: boolean;
  /** Whether saving is currently in progress */
  saving: boolean;
  /** Whether the user can edit (authenticated + team member) */
  canEdit: boolean;
  /** Debounce delay in milliseconds (default: 2000) */
  debounceMs?: number;
  /** localStorage key for persisting the autosave preference */
  storageKey: string;
}

interface UseAutosaveReturn {
  /** Whether autosave is currently enabled */
  autosaveEnabled: boolean;
  /** Toggle autosave on/off */
  toggleAutosave: () => void;
}

/**
 * Generic debounced autosave hook.
 *
 * When enabled, automatically calls `saveFn` after `debounceMs` of inactivity
 * (i.e., when `dirty` becomes true and stays true without further changes).
 * The preference is persisted in localStorage per page.
 */
export function useAutosave({
  saveFn,
  dirty,
  saving,
  canEdit,
  debounceMs = 2000,
  storageKey,
}: UseAutosaveOptions): UseAutosaveReturn {
  const [autosaveEnabled, setAutosaveEnabled] = usePersistentState(`autosave:${storageKey}`, true);

  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  const toggleAutosave = useCallback(() => {
    setAutosaveEnabled((prev: boolean) => !prev);
  }, [setAutosaveEnabled]);

  // Debounced autosave effect
  useEffect(() => {
    if (!autosaveEnabled || !dirty || saving || !canEdit) return;

    const timer = setTimeout(() => {
      saveFnRef.current();
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [autosaveEnabled, dirty, saving, canEdit, debounceMs]);

  return { autosaveEnabled, toggleAutosave };
}
