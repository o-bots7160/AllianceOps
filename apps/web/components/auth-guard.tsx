'use client';

import { useAuth } from './use-auth';
import { IS_DEV, IS_SWA_AUTH } from '../lib/api-base';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Bypass auth in dev mode unless running through SWA CLI proxy
  if (IS_DEV && !IS_SWA_AUTH) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/.auth/login/google';
    }
    return null;
  }

  return <>{children}</>;
}
