'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './use-auth';
import { GlobalControls } from './global-controls';
import { NavLinks } from './nav-links';

function UserMenu({ displayLabel }: { displayLabel: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const teamActive = pathname.startsWith('/team');

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [close]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1"
      >
        {displayLabel}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1 z-50">
          <Link
            href="/team/"
            onClick={close}
            className={`block px-4 py-2 text-sm ${
              teamActive
                ? 'text-primary-600 dark:text-primary-400 font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Team
          </Link>
          <hr className="my-1 border-gray-200 dark:border-gray-700" />
          <a
            href="/.auth/logout?post_logout_redirect_uri=/"
            onClick={() => {
              close();
              try {
                localStorage.clear();
              } catch (_) {
                // Ignore storage access errors
              }
            }}
            className="block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Log Out
          </a>
        </div>
      )}
    </div>
  );
}

export function AppHeader() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const showControls = !loading && user;
  const userLabel = user?.displayName || user?.email || 'Account';

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Desktop + mobile top bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="text-xl font-bold shrink-0 flex">
          <span className="text-blue-600 dark:text-blue-400">Alliance</span>
          <span className="text-red-600 dark:text-red-400">Ops</span>
        </Link>

        {/* Desktop: centered controls */}
        {showControls && (
          <div className="hidden md:flex items-center justify-center min-w-0 flex-1">
            <GlobalControls />
          </div>
        )}

        {/* Desktop: nav + user menu together; Mobile: hamburger */}
        <div className="flex items-center gap-4 shrink-0">
          {showControls && (
            <div className="hidden md:flex items-center gap-4">
              <NavLinks />
              {user && <UserMenu displayLabel={userLabel} />}
            </div>
          )}

          {/* Mobile hamburger */}
          {showControls && (
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden p-1.5 text-gray-600 dark:text-gray-300 hover:text-primary-600"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {mobileOpen && showControls && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 px-4 py-4 space-y-4">
          <GlobalControls />
          <NavLinks vertical onNavigate={() => setMobileOpen(false)} />
          <hr className="border-gray-200 dark:border-gray-700" />
          <div className="flex flex-col gap-2 text-sm">
            <Link
              href="/team/"
              onClick={() => setMobileOpen(false)}
              className={
                pathname.startsWith('/team')
                  ? 'text-primary-600 dark:text-primary-400 font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-primary-600'
              }
            >
              Team
            </Link>
            <a
              href="/.auth/logout?post_logout_redirect_uri=/"
              onClick={() => {
                setMobileOpen(false);
                try {
                  localStorage.clear();
                } catch (_) {
                  // Ignore storage access errors
                }
              }}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              Log Out
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
