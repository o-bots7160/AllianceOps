'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface EventSetupState {
  year: number;
  eventKey: string;
  teamNumber: number;
}

interface EventSetupContextValue extends EventSetupState {
  setYear: (year: number) => void;
  setEventKey: (eventKey: string) => void;
  setTeamNumber: (teamNumber: number) => void;
}

const STORAGE_KEY = 'allianceops-setup';
const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_STATE: EventSetupState = { year: CURRENT_YEAR, eventKey: '', teamNumber: 7160 };

const EventSetupContext = createContext<EventSetupContextValue | null>(null);

export function EventSetupProvider({ children }: { children: ReactNode }) {
  const [setup, setSetup] = useState<EventSetupState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSetup(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage on changes (only after hydration)
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
    }
  }, [setup, hydrated]);

  const value: EventSetupContextValue = {
    ...setup,
    setYear: (year: number) => setSetup((s) => ({ ...s, year, eventKey: '' })),
    setEventKey: (eventKey: string) => setSetup((s) => ({ ...s, eventKey })),
    setTeamNumber: (teamNumber: number) => setSetup((s) => ({ ...s, teamNumber })),
  };

  return <EventSetupContext.Provider value={value}>{children}</EventSetupContext.Provider>;
}

export function useEventSetup() {
  const ctx = useContext(EventSetupContext);
  if (!ctx) {
    throw new Error('useEventSetup must be used within an EventSetupProvider');
  }
  return ctx;
}
