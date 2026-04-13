'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from './use-auth';
import { LOGIN_PROVIDERS } from './login-providers';

export function UnauthBanner() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Only show on non-home pages when not logged in
  if (loading || user || pathname === '/') return null;

  return (
    <div
      role="status"
      className="border-b border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span>You are not logged in. Log in to save data and access team features.</span>
        <span className="flex items-center gap-2">
          {LOGIN_PROVIDERS.map((provider) => (
            <a
              key={provider.id}
              href={provider.href}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-400 dark:border-amber-600 bg-white dark:bg-amber-900/50 px-2.5 py-1 text-xs font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-800/50 transition-colors"
              aria-label={`Log in with ${provider.label}`}
            >
              {provider.icon}
              {provider.label}
            </a>
          ))}
        </span>
      </div>
    </div>
  );
}
