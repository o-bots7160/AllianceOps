'use client';

import type { ReactNode } from 'react';
import { SimulationProvider } from './simulation-context';
import { EventSetupProvider } from './use-event-setup';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <EventSetupProvider>
      <SimulationProvider>{children}</SimulationProvider>
    </EventSetupProvider>
  );
}
