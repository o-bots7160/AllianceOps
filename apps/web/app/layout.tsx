import type { Metadata } from 'next';
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
          <footer className="border-t border-gray-200 dark:border-gray-800 mt-12 py-6 text-center text-xs text-gray-500 dark:text-gray-500">
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
          </footer>
        </Providers>
      </body>
    </html>
  );
}
