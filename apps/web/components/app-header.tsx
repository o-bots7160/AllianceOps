'use client';

import { useAuth } from './use-auth';
import { GlobalControls } from './global-controls';
import { NavLinks } from './nav-links';
import { IS_DEV, IS_SWA_AUTH } from '../lib/api-base';

export function AppHeader() {
  const { user, loading } = useAuth();

  const showControls = IS_DEV && !IS_SWA_AUTH ? true : !loading && user;
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
      </div>
    </header>
  );
}
