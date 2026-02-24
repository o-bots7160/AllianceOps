'use client';

import { useAuth } from './use-auth';
import { GlobalControls } from './global-controls';
import { NavLinks } from './nav-links';

export function AppHeader() {
  const { user, loading } = useAuth();

  const showControls = !loading && user;
  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400 shrink-0">
          AllianceOps
        </h1>
        {showControls && (
          <>
            <GlobalControls />
            <NavLinks />
          </>
        )}
        {!loading && (
          user ? (
            <a
              href="/.auth/logout?post_logout_redirect_uri=/"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 shrink-0"
            >
              Sign out
            </a>
          ) : (
            <a
              href="/"
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 shrink-0"
            >
              Sign in
            </a>
          )
        )}
      </div>
    </header>
  );
}
