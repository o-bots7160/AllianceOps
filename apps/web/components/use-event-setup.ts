'use client';

import { useState, useEffect } from 'react';

interface EventSetupState {
  year: number;
  eventKey: string;
  teamNumber: number;
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

export function useEventSetup() {
  const [setup, setSetup] = useState<EventSetupState>(loadSetup);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
  }, [setup]);

  return {
    ...setup,
    setYear: (year: number) => setSetup((s) => ({ ...s, year, eventKey: '' })),
    setEventKey: (eventKey: string) => setSetup((s) => ({ ...s, eventKey })),
    setTeamNumber: (teamNumber: number) => setSetup((s) => ({ ...s, teamNumber })),
  };
}
