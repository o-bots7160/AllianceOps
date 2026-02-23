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

function loadSetup(): EventSetupState {
  if (typeof window === 'undefined') {
    return { year: CURRENT_YEAR, eventKey: '', teamNumber: 7160 };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return { year: CURRENT_YEAR, eventKey: '', teamNumber: 7160 };
}

const EventSetupContext = createContext<EventSetupContextValue | null>(null);

export function EventSetupProvider({ children }: { children: ReactNode }) {
  const [setup, setSetup] = useState<EventSetupState>(loadSetup);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
  }, [setup]);

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
