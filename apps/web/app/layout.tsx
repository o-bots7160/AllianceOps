import type { Metadata } from 'next';
import Link from 'next/link';
import { Providers } from '../components/providers';
import { SimulationBar } from '../components/simulation-bar';
import { AppHeader } from '../components/app-header';
import './globals.css';

export const metadata: Metadata = {
  title: 'AllianceOps',
  description: 'FRC match strategy dashboard — powered by TBA and Statbotics',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased">
        <Providers>
          <AppHeader />
          <SimulationBar />
          <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
          <footer className="border-t border-gray-200 dark:border-gray-800 mt-12 py-6 text-center text-xs text-gray-500 dark:text-gray-500 space-y-2">
            <div>
              Built by{' '}
              <a
                href="https://ludingtonrobotics.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-700 dark:hover:text-gray-300"
              >
                Team 7160 – Ludington O-Bots
              </a>
              . Powered by{' '}
              <a
                href="https://www.thebluealliance.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-700 dark:hover:text-gray-300"
              >
                The Blue Alliance
              </a>
              {' '}and{' '}
              <a
                href="https://www.statbotics.io"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-700 dark:hover:text-gray-300"
              >
                Statbotics
              </a>
              .
            </div>
            <div className="flex items-center justify-center gap-2">
              <span>{process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}</span>
              <span>·</span>
              <Link
                href="/privacy"
                className="underline hover:text-gray-700 dark:hover:text-gray-300"
              >
                Privacy
              </Link>
              <span>·</span>
              <a
                href="https://github.com/o-bots7160/AllianceOps/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="w-3.5 h-3.5"
                  aria-hidden="true"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                </svg>
                Feedback &amp; Issues
              </a>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
