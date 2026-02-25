'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from './use-auth';
import { SimulationProvider } from './simulation-context';
import { EventSetupProvider } from './use-event-setup';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <EventSetupProvider>
        <SimulationProvider>{children}</SimulationProvider>
      </EventSetupProvider>
    </AuthProvider>
  );
}
