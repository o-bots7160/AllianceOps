'use client';

import { type ReactNode } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';

export function PageGuard({
  condition,
  message = 'Please select an event to continue.',
  loading,
  children,
}: {
  condition: unknown;
  message?: string;
  loading?: boolean;
  children: ReactNode;
}) {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!condition) {
    return <p className="text-gray-500">{message}</p>;
  }

  return <>{children}</>;
}
