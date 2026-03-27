'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { usePersistentState } from '../hooks/use-persistent-state';

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
const DEFAULT_STATE: EventSetupState = { year: CURRENT_YEAR, eventKey: '', teamNumber: 0 };

const EventSetupContext = createContext<EventSetupContextValue | null>(null);

export function EventSetupProvider({ children }: { children: ReactNode }) {
  const [setup, setSetup] = usePersistentState<EventSetupState>(STORAGE_KEY, DEFAULT_STATE);

  const value: EventSetupContextValue = {
    ...setup,
    setYear: (year: number) => setSetup((s) => ({ ...s, year, eventKey: '' })),
    setEventKey: (eventKey: string) => setSetup((s) => ({ ...s, eventKey })),
    setTeamNumber: (teamNumber: number) =>
      setSetup((s) => ({ ...s, teamNumber, eventKey: s.teamNumber !== teamNumber ? '' : s.eventKey })),
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
