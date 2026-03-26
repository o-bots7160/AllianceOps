'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  type ReactNode,
} from 'react';
import { usePersistentState } from '../hooks/use-persistent-state';

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

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, setState, hydrated] = usePersistentState<SimulationState>(
    STORAGE_KEY,
    DEFAULT_STATE,
  );

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
  }, [hydrated, setState]);

  const setCursor = useCallback(
    (cursor: number) => {
      setState((s) => ({ ...s, cursor }));
    },
    [setState],
  );

  const startSimulation = useCallback(
    (eventKey: string, cursor = 1) => {
      setState({ enabled: true, eventKey, cursor });
    },
    [setState],
  );

  const stopSimulation = useCallback(() => {
    setState(DEFAULT_STATE);
  }, [setState]);

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
