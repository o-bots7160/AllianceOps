'use client';

import type { ReactNode } from 'react';
import { SimulationProvider } from './simulation-context';

export function Providers({ children }: { children: ReactNode }) {
  return <SimulationProvider>{children}</SimulationProvider>;
}
