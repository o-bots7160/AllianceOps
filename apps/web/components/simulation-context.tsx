'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

interface SimulationState {
  /** Whether simulation mode is explicitly enabled */
  enabled: boolean;
  /** Match cursor position (1-indexed) */
  cursor: number;
  /** Event key being simulated */
  eventKey: string | null;
}

interface SimulationContextValue extends SimulationState {
  /** The cursor value pages should use for filtering (null when disabled) */
  activeCursor: number | null;
  setCursor: (cursor: number) => void;
  startSimulation: (eventKey: string, cursor?: number) => void;
  stopSimulation: () => void;
  isSimulating: boolean;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

const STORAGE_KEY = 'allianceops-simulation';

const DEFAULT_STATE: SimulationState = { enabled: false, cursor: 1, eventKey: null };

function loadSimulation(): SimulationState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch {
    // ignore
  }
  return DEFAULT_STATE;
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SimulationState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState({ ...DEFAULT_STATE, ...parsed });
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Sync URL params after hydration (URL takes priority)
  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);
    const urlCursor = params.get('cursor');
    const urlEvent = params.get('simEvent');
    if (urlCursor) {
      setState({
        enabled: true,
        cursor: parseInt(urlCursor, 10) || 1,
        eventKey: urlEvent || null,
      });
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (state.enabled) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state]);

  const setCursor = useCallback((cursor: number) => {
    setState((s) => ({ ...s, cursor }));
  }, []);

  const startSimulation = useCallback((eventKey: string, cursor = 1) => {
    setState({ enabled: true, eventKey, cursor });
  }, []);

  const stopSimulation = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  const isSimulating = state.enabled;

  return (
    <SimulationContext.Provider
      value={{
        ...state,
        activeCursor: isSimulating ? state.cursor : null,
        setCursor,
        startSimulation,
        stopSimulation,
        isSimulating,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error('useSimulation must be used within SimulationProvider');
  }
  return ctx;
}
